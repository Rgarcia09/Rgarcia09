"""AVA's answering pipeline.

Retrieval happens before generation. Questions about structured office data (projects,
deadlines, consultants) are answered deterministically from the registry, so they work —
and are exact — even when the AI engine is offline. The language model is used only to
phrase answers over retrieved data, and its output is always returned with sources.

Modules that are not implemented yet (email, calendar, invoices, reports, RFIs, ...) are
reported as unavailable. AVA never fabricates their contents.
"""

from __future__ import annotations

import logging
import re
import unicodedata
import uuid
from dataclasses import dataclass, field
from datetime import date, timedelta

from sqlalchemy.orm import Session

from ava.ai import actions
from ava.ai.prompting import ContextBlock, build_messages, system_prompt
from ava.ai.providers.base import AIProvider, AIProviderError, ChatMessage
from ava.models import Project
from ava.services import integrations
from ava.services import projects as project_service
from ava.services.search import global_search

log = logging.getLogger("ava.orchestrator")


@dataclass(frozen=True)
class Source:
    kind: str
    label: str
    url: str | None = None

    def as_dict(self) -> dict[str, str | None]:
        return {"kind": self.kind, "label": self.label, "url": self.url}


@dataclass
class Answer:
    content: str
    intent: str
    produced_by: str = "structured"
    sources: list[Source] = field(default_factory=list)
    project_id: uuid.UUID | None = None
    tools_used: list[str] = field(default_factory=list)


# --- Text helpers -------------------------------------------------------------


def _fold(text: str) -> str:
    """Lower-case and strip accents so Spanish and English keywords match reliably."""
    nfkd = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def fmt_date(d: date) -> str:
    return f"{d:%b} {d.day}, {d.year}"


def relative(d: date, today: date) -> str:
    delta = (d - today).days
    if delta == 0:
        return "today"
    if delta == 1:
        return "tomorrow"
    if delta == -1:
        return "1 day overdue"
    if delta < 0:
        return f"{-delta} days overdue"
    return f"in {delta} days"


def project_title(p: Project) -> str:
    return f"Project {p.project_number} — {p.name}"


def project_source(p: Project) -> Source:
    return Source("project_registry", f"Project Registry — {p.project_number}", f"/projects/{p.id}")


def _label(value: str | None) -> str:
    return value.replace("_", " ").capitalize() if value else "Not recorded"


DISCIPLINE_WORDS = {
    "structural": ("structural", "estructural"),
    "civil": ("civil",),
    "mechanical": ("mechanical", "mecanico", "hvac"),
    "electrical": ("electrical", "electrico", "electricista"),
    "plumbing": ("plumbing", "plomeria"),
    "landscape": ("landscape", "paisajista", "paisajismo"),
    "geotechnical": ("geotechnical", "geotecnico", "geotech", "soils"),
    "surveying": ("surveyor", "survey", "agrimensor", "agrimensura"),
    "contractor": ("contractor", "contratista"),
    "owner_representative": ("owner rep", "owner's rep", "owner representative"),
    "permitting": ("permit", "permiso"),
}

# (intent, pattern) — first match wins; order matters.
INTENTS: list[tuple[str, re.Pattern[str]]] = [
    ("email_draft", re.compile(r"\b(e-?mail|correo|follow[- ]?up|carta|letter)\b")),
    ("invoices", re.compile(r"\b(invoices?|factura|facturas|billing|cobros?|outstanding|paid)\b")),
    ("reports", re.compile(r"\b(reports?|informes?|reporte)\b")),
    ("rfis", re.compile(r"\brfis?\b")),
    ("submittals", re.compile(r"\bsubmittals?\b")),
    ("meetings", re.compile(r"\b(minutes|minuta|meeting decisions?|decide|decided)\b")),
    ("waiting", re.compile(r"\b(waiting|pending|pendiente|esperando|outstanding items)\b")),
    (
        "consultants",
        re.compile(
            r"\b(consultants?|consultores?|engineers?|ingenieros?|surveyor|contractor|contratista|"
            r"architects?|landscape|structural|estructural|electrical|mechanical|civil)\b"
        ),
    ),
    ("week", re.compile(r"\b(this week|weekly|esta semana|semanal|week)\b")),
    (
        "today",
        re.compile(
            r"\b(today|hoy|briefing|require[s]? attention|what do i (have|need)|"
            r"que tengo|what'?s happening|happening today)\b"
        ),
    ),
    ("deadlines", re.compile(r"\b(deadlines?|due|vence|vencen|fecha limite|entregas?)\b")),
    (
        "list_projects",
        re.compile(
            r"\b(list|all|active|show)\b.*\bprojects\b|\bproyectos activos\b|\bprojects list\b"
        ),
    ),
    ("project_lookup", re.compile(r"\b(find|show|open|lookup|buscar?|busca)\b.*\bproje|proyecto")),
]

REQUIRES_PROJECT = {"waiting", "consultants", "project_lookup"}


def classify(message: str) -> str:
    folded = _fold(message)
    for intent, pattern in INTENTS:
        if pattern.search(folded):
            return intent
    if project_service.extract_number_tokens(message) and len(message.split()) <= 4:
        return "project_lookup"
    return "general"


# --- Orchestrator -------------------------------------------------------------


class Orchestrator:
    def __init__(
        self,
        db: Session,
        provider: AIProvider,
        *,
        ava_name: str,
        office_name: str,
        today: date,
        max_context_chars: int = 12000,
    ) -> None:
        self.db = db
        self.provider = provider
        self.ava_name = ava_name
        self.office_name = office_name
        self.today = today
        self.max_context_chars = max_context_chars

    # Public entry point
    def answer(
        self,
        message: str,
        *,
        project_id: uuid.UUID | None = None,
        history: list[ChatMessage] | None = None,
    ) -> Answer:
        intent = classify(message)
        project, note = self._resolve_project(message, project_id)
        if isinstance(project, list):  # ambiguous
            return self._ambiguous(project, intent)

        handler = getattr(self, f"_intent_{intent}")
        answer: Answer = handler(message, project, history or [])
        answer.intent = intent
        if project is not None and answer.project_id is None:
            answer.project_id = project.id
        if note:
            answer.content = f"{note}\n\n{answer.content}"
        return answer

    # Project resolution
    def _resolve_project(
        self, message: str, project_id: uuid.UUID | None
    ) -> tuple[Project | list[project_service.ProjectMatch] | None, str | None]:
        actions.authorize("project.lookup")
        # A project number typed in the message wins over the page context.
        for token in project_service.extract_number_tokens(message):
            found = project_service.get_by_number(self.db, token)
            if found is not None:
                if project_id and found.id != project_id:
                    return found, f"Using {project_title(found)} as named in your question."
                return found, None
        if project_id is not None:
            return project_service.get_project(self.db, project_id), None
        matches = project_service.resolve_reference(self.db, message)
        if not matches:
            return None, None
        if len(matches) > 1 and matches[0].score - matches[1].score < 0.1:
            return matches, None
        return matches[0].project, f"Interpreted as {project_title(matches[0].project)}."

    def _ambiguous(self, matches: list[project_service.ProjectMatch], intent: str) -> Answer:
        lines = ["More than one project matches. Please specify the project number:", ""]
        lines += [f"• {project_title(m.project)}" for m in matches]
        return Answer(
            "\n".join(lines), intent, sources=[project_source(m.project) for m in matches]
        )

    def _needs_project(self, what: str) -> Answer:
        return Answer(
            f"Which project? Please include the project number for {what} "
            "(for example, “25006”), or ask from the project page.",
            "clarify",
        )

    # Shared fragments
    def _project_card(self, p: Project) -> list[str]:
        lines = [project_title(p).upper(), ""]
        lines.append(f"Client: {p.client.name if p.client else 'Not recorded'}")
        if p.location:
            lines.append(f"Location: {p.location}")
        lines.append(f"Status: {_label(p.status)}")
        lines.append(f"Phase: {_label(p.phase)}")
        if p.project_manager:
            lines.append(f"Project manager: {p.project_manager.full_name}")
        if p.deadline:
            lines.append(
                f"Next deadline: {fmt_date(p.deadline)} ({relative(p.deadline, self.today)})"
            )
        else:
            lines.append("Next deadline: Not recorded")
        if p.contract_number:
            lines.append(f"Contract: {p.contract_number}")
        if p.construction_start or p.construction_end:
            start = fmt_date(p.construction_start) if p.construction_start else "—"
            end = fmt_date(p.construction_end) if p.construction_end else "—"
            lines.append(f"Construction: {start} to {end}")
        if p.consultants:
            lines += ["", "Consultants:"]
            lines += [self._consultant_line(c) for c in p.consultants]
        if p.dropbox_path:
            lines += ["", f"Dropbox folder: {p.dropbox_path}"]
        return lines

    @staticmethod
    def _consultant_line(c) -> str:
        contact = ""
        if c.contact:
            contact = f" — {c.contact.full_name}"
            if c.contact.email:
                contact += f" <{c.contact.email}>"
        return f"• {_label(c.discipline)}: {c.consultant.company_name}{contact}"

    def _gap(self, *kinds: str) -> list[str]:
        st = integrations.statuses(self.db)
        return [st[k].message for k in kinds if st[k].status != "connected"]

    def _deadline_lines(self, days: int) -> tuple[list[str], list[Source]]:
        actions.authorize("project.deadlines")
        items = project_service.upcoming_deadlines(self.db, today=self.today, days=days)
        lines: list[str] = []
        for p in items:
            assert p.deadline is not None
            lines.append(
                f"• {fmt_date(p.deadline)} ({relative(p.deadline, self.today)}) — "
                f"{project_title(p)}"
            )
        return lines, [project_source(p) for p in items]

    # Intent handlers ---------------------------------------------------------
    def _intent_project_lookup(self, message: str, project: Project | None, _h: list) -> Answer:
        if project is None:
            actions.authorize("search.global")
            hits = [h for h in global_search(self.db, message) if h.kind == "project"][:5]
            if not hits:
                return Answer("No matching project was found in the Project Registry.", "")
            lines = ["No exact project match. Closest records:", ""]
            lines += [f"• {h.title}" for h in hits]
            return Answer(
                "\n".join(lines),
                "",
                sources=[
                    Source("project_registry", f"Project Registry — {h.title}", h.url) for h in hits
                ],
            )
        return Answer("\n".join(self._project_card(project)), "", sources=[project_source(project)])

    def _intent_list_projects(self, _m: str, _p: Project | None, _h: list) -> Answer:
        actions.authorize("project.list")
        rows, total = project_service.list_projects(self.db, status="active", limit=50)
        if not rows:
            return Answer("There are no active projects in the Project Registry.", "")
        lines = [f"{total} active project{'s' if total != 1 else ''}:", ""]
        for p in rows:
            extra = f" · {_label(p.phase)}" if p.phase else ""
            lines.append(f"• {p.project_number} — {p.name}{extra}")
        return Answer(
            "\n".join(lines),
            "",
            sources=[Source("project_registry", "Project Registry — active projects", "/projects")],
        )

    def _intent_today(self, _m: str, project: Project | None, _h: list) -> Answer:
        overdue_and_soon, sources = self._deadline_lines(14)
        lines = [f"TODAY — {self.today:%A}, {fmt_date(self.today)}", ""]
        lines.append("Deadlines (Project Registry, next 14 days):")
        lines += overdue_and_soon or ["• None recorded."]
        calendar_gap = self._gap("google_calendar")
        lines += ["", "Meetings:"]
        lines += [f"• {g} Meetings cannot be listed." for g in calendar_gap] or [
            "• Calendar events are not yet included in briefings."
        ]
        lines += ["", "Not yet verified:"]
        lines += [f"• {g}" for g in self._gap("gmail", "dropbox")]
        lines.append("• Invoices, RFIs, submittals and action items are not yet tracked in AVA.")
        count = len(overdue_and_soon)
        head = (
            f"{count} registry deadline{'s' if count != 1 else ''} require attention."
            if count
            else "No registry deadlines in the next 14 days."
        )
        return Answer(head + "\n\n" + "\n".join(lines), "", sources=sources)

    def _intent_week(self, _m: str, _p: Project | None, _h: list) -> Answer:
        days = 6 - self.today.weekday() or 7  # through Sunday
        items, sources = self._deadline_lines(days)
        lines = [f"THIS WEEK — through {fmt_date(self.today + timedelta(days=days))}", ""]
        lines.append("Deadlines (Project Registry):")
        lines += items or ["• None recorded."]
        gaps = self._gap("google_calendar", "gmail", "dropbox")
        if gaps:
            lines += ["", "Not yet verified:"] + [f"• {g}" for g in gaps]
        return Answer("\n".join(lines), "", sources=sources)

    def _intent_deadlines(self, message: str, project: Project | None, _h: list) -> Answer:
        m = re.search(r"(\d{1,3})\s*(days|dias)", _fold(message))
        days = min(int(m.group(1)), 365) if m else 14
        if project is not None:
            if not project.deadline:
                return Answer(
                    f"No deadline is recorded for {project_title(project)}.",
                    "",
                    sources=[project_source(project)],
                )
            return Answer(
                f"{project_title(project)}\n\nDeadline: {fmt_date(project.deadline)} "
                f"({relative(project.deadline, self.today)})",
                "",
                sources=[project_source(project)],
            )
        items, sources = self._deadline_lines(days)
        head = f"Deadlines within the next {days} days (Project Registry):"
        body = "\n".join(items) if items else "• None recorded."
        gaps = self._gap("google_calendar")
        tail = (
            ("\n\nNote: " + " ".join(gaps) + " Calendar deadlines are not included.")
            if gaps
            else ""
        )
        return Answer(f"{head}\n\n{body}{tail}", "", sources=sources)

    def _intent_consultants(self, message: str, project: Project | None, _h: list) -> Answer:
        if project is None:
            return self._needs_project("consultant questions")
        actions.authorize("project.consultants")
        folded = _fold(message)
        wanted = {d for d, words in DISCIPLINE_WORDS.items() if any(w in folded for w in words)}
        rows = [c for c in project.consultants if not wanted or c.discipline in wanted]
        lines = [project_title(project).upper(), ""]
        if not rows:
            which = ", ".join(sorted(_label(w) for w in wanted)) if wanted else "No"
            lines.append(f"{which} consultant is recorded for this project.")
        else:
            lines.append("Consultants:")
            lines += [self._consultant_line(c) for c in rows]
        if re.search(r"\b(waiting|pending|esperando|pendiente|need)\b", folded):
            lines += ["", "Pending items from consultants cannot be verified yet:"]
            lines += [f"• {g}" for g in self._gap("gmail", "dropbox")]
            lines.append("• Action items and RFIs are not yet tracked in AVA.")
        return Answer("\n".join(lines), "", sources=[project_source(project)])

    def _intent_waiting(self, message: str, project: Project | None, h: list) -> Answer:
        if project is None:
            return self._needs_project("pending items")
        lines = [project_title(project).upper(), ""]
        lines.append(f"Status: {_label(project.status)} · Phase: {_label(project.phase)}")
        if project.deadline:
            lines.append(
                f"Next deadline: {fmt_date(project.deadline)} "
                f"({relative(project.deadline, self.today)})"
            )
        if project.consultants:
            lines += ["", "Consultants on record:"]
            lines += [self._consultant_line(c) for c in project.consultants]
        lines += ["", "Checked: Project Registry.", "Could not verify:"]
        lines += [f"• {g}" for g in self._gap("gmail", "google_calendar", "dropbox")]
        lines.append("• Action items, RFIs and submittals are not yet tracked in AVA.")
        lines += ["", "No pending items can be confirmed from the data currently available."]
        return Answer("\n".join(lines), "", sources=[project_source(project)])

    def _unavailable(self, module: str, phase: int, project: Project | None) -> Answer:
        lines = [
            f"The {module} module is not available yet (planned for Phase {phase}). "
            f"{self.ava_name} will not guess {module} information."
        ]
        sources: list[Source] = []
        if project is not None:
            lines += ["", *self._project_card(project)]
            sources.append(project_source(project))
        return Answer("\n".join(lines), "", sources=sources)

    def _intent_invoices(self, _m: str, p: Project | None, _h: list) -> Answer:
        return self._unavailable("invoice", 4, p)

    def _intent_reports(self, _m: str, p: Project | None, _h: list) -> Answer:
        return self._unavailable("report", 5, p)

    def _intent_rfis(self, _m: str, p: Project | None, _h: list) -> Answer:
        return self._unavailable("RFI", 6, p)

    def _intent_submittals(self, _m: str, p: Project | None, _h: list) -> Answer:
        return self._unavailable("submittal", 6, p)

    def _intent_meetings(self, _m: str, p: Project | None, _h: list) -> Answer:
        return self._unavailable("meeting minutes", 6, p)

    def _intent_email_draft(self, message: str, project: Project | None, history: list) -> Answer:
        if project is None:
            return self._needs_project("the email draft")
        actions.authorize("draft.text")
        folded = _fold(message)
        wanted = {d for d, words in DISCIPLINE_WORDS.items() if any(w in folded for w in words)}
        recipients = [c for c in project.consultants if c.discipline in wanted] if wanted else []
        if wanted and not recipients:
            return Answer(
                f"No {', '.join(sorted(_label(w) for w in wanted))} consultant is recorded for "
                f"{project_title(project)}. Add one in the project record first.",
                "",
                sources=[project_source(project)],
            )
        context = [
            ContextBlock(
                f"Project Registry — {project.project_number}",
                "\n".join(self._project_card(project)),
            )
        ]
        sources = [project_source(project)]
        instruction = (
            f"{message}\n\nWrite only the email: a 'Subject:' line, then the body. Formal and "
            "brief. Address it to the recipient named in the office data if one applies. Use "
            "placeholders in [brackets] for any fact not present in the office data. Sign as "
            "the office staff member, not as the assistant."
        )
        answer = self._generate(instruction, context, history, sources, intent="email_draft")
        if answer.produced_by == "unavailable":
            return answer
        to = ""
        if recipients and recipients[0].contact and recipients[0].contact.email:
            to = f"To: {recipients[0].contact.full_name} <{recipients[0].contact.email}>\n"
        gap = " ".join(self._gap("gmail"))
        answer.content = (
            f"DRAFT — {project_title(project)}\n{to}\n{answer.content}\n\n"
            f"This draft has not been sent or saved to email. {gap} Review before use."
        ).strip()
        return answer

    def _intent_general(self, message: str, project: Project | None, history: list) -> Answer:
        context: list[ContextBlock] = []
        sources: list[Source] = []
        if project is not None:
            context.append(
                ContextBlock(
                    f"Project Registry — {project.project_number}",
                    "\n".join(self._project_card(project)),
                )
            )
            sources.append(project_source(project))
        else:
            actions.authorize("search.global")
            for hit in global_search(self.db, message, limit=5):
                context.append(
                    ContextBlock(f"{hit.kind} — {hit.title}", f"{hit.title}\n{hit.subtitle or ''}")
                )
                sources.append(Source(hit.kind, hit.title, hit.url))
        return self._generate(message, context, history, sources, intent="general")

    # LLM generation ------------------------------------------------------------
    def _generate(
        self,
        question: str,
        context: list[ContextBlock],
        history: list,
        sources: list[Source],
        *,
        intent: str,
    ) -> Answer:
        messages = build_messages(
            system=system_prompt(self.ava_name, self.office_name, fmt_date(self.today)),
            context=context,
            history=history,
            question=question,
            max_context_chars=self.max_context_chars,
        )
        try:
            text = self.provider.chat(messages)
        except AIProviderError as exc:
            log.warning("AI provider unavailable: %s", exc)
            return Answer(
                "The local AI engine is not available, so this question cannot be answered "
                "in free form right now. Questions about projects, deadlines and consultants "
                "still work.",
                intent,
                produced_by="unavailable",
                sources=sources,
            )
        return Answer(
            text, intent, produced_by=f"{self.provider.name}:{self.provider.model}", sources=sources
        )
