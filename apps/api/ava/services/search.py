"""Global search across structured records.

Uses exact / ILIKE matching (reliable for identifiers such as "25006" or "RFI 46") combined
with trigram similarity for approximate names. Phase 2 adds documents via hybrid
(full-text + vector) retrieval.
"""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ava.models import Client, ClientContact, Consultant, ConsultantContact, Project


@dataclass(frozen=True)
class SearchHit:
    kind: str  # project | client | consultant | client_contact | consultant_contact
    id: str
    title: str
    subtitle: str | None
    url: str
    score: float


def _similar(column, needle):
    return func.word_similarity(
        func.unaccent(func.lower(needle)), func.unaccent(func.lower(column))
    )


def global_search(db: Session, q: str, limit: int = 30) -> list[SearchHit]:
    q = q.strip()
    if not q:
        return []
    like = f"%{q}%"
    hits: list[SearchHit] = []

    proj_score = func.greatest(
        _similar(Project.name, q),
        _similar(func.coalesce(Project.short_name, ""), q),
        _similar(func.coalesce(Project.location, ""), q),
    )
    for p, score in db.execute(
        select(Project, proj_score)
        .where(
            or_(
                Project.project_number.ilike(like),
                Project.name.ilike(like),
                Project.short_name.ilike(like),
                Project.location.ilike(like),
                Project.contract_number.ilike(like),
                proj_score > 0.4,
            )
        )
        .order_by(proj_score.desc())
        .limit(limit)
    ).unique():
        exact = p.project_number.lower() == q.lower()
        hits.append(
            SearchHit(
                "project",
                str(p.id),
                f"{p.project_number} — {p.name}",
                ", ".join(x for x in (p.client.name if p.client else None, p.location) if x)
                or None,
                f"/projects/{p.id}",
                2.0 if exact else max(float(score), 0.6 if q.lower() in p.name.lower() else 0.5),
            )
        )

    client_score = _similar(Client.name, q)
    for c, score in db.execute(
        select(Client, client_score)
        .where(or_(Client.name.ilike(like), Client.billing_name.ilike(like), client_score > 0.4))
        .limit(limit)
    ):
        hits.append(
            SearchHit("client", str(c.id), c.name, "Client", f"/clients/{c.id}", float(score))
        )

    cons_score = _similar(Consultant.company_name, q)
    for c, score in db.execute(
        select(Consultant, cons_score)
        .where(or_(Consultant.company_name.ilike(like), cons_score > 0.4))
        .limit(limit)
    ):
        hits.append(
            SearchHit(
                "consultant",
                str(c.id),
                c.company_name,
                f"Consultant · {c.discipline.replace('_', ' ')}",
                f"/consultants/{c.id}",
                float(score),
            )
        )

    cc_score = _similar(ClientContact.full_name, q)
    for cc, client, score in db.execute(
        select(ClientContact, Client, cc_score)
        .join(Client, ClientContact.client_id == Client.id)
        .where(
            or_(
                ClientContact.full_name.ilike(like), ClientContact.email.ilike(like), cc_score > 0.4
            )
        )
        .limit(limit)
    ):
        hits.append(
            SearchHit(
                "client_contact",
                str(cc.id),
                cc.full_name,
                f"Contact · {client.name}",
                f"/clients/{client.id}",
                float(score),
            )
        )

    kc_score = _similar(ConsultantContact.full_name, q)
    for kc, firm, score in db.execute(
        select(ConsultantContact, Consultant, kc_score)
        .join(Consultant, ConsultantContact.consultant_id == Consultant.id)
        .where(
            or_(
                ConsultantContact.full_name.ilike(like),
                ConsultantContact.email.ilike(like),
                kc_score > 0.4,
            )
        )
        .limit(limit)
    ):
        hits.append(
            SearchHit(
                "consultant_contact",
                str(kc.id),
                kc.full_name,
                f"Contact · {firm.company_name}",
                f"/consultants/{firm.id}",
                float(score),
            )
        )

    hits.sort(key=lambda h: h.score, reverse=True)
    return hits[:limit]
