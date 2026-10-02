"""Action safety model.

Every operation AVA can perform is classified. The classification — not text produced by
the model or found in a document — decides whether confirmation is needed.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class ActionType(StrEnum):
    READ = "READ"
    CREATE_DRAFT = "CREATE_DRAFT"
    WRITE = "WRITE"
    DESTRUCTIVE = "DESTRUCTIVE"


class Confirmation(StrEnum):
    NONE = "none"  # may run automatically
    PREVIEW = "preview"  # show what will change, user approves
    EXPLICIT = "explicit"  # explicit confirmation of an irreversible action


POLICY: dict[ActionType, Confirmation] = {
    ActionType.READ: Confirmation.NONE,
    ActionType.CREATE_DRAFT: Confirmation.NONE,
    ActionType.WRITE: Confirmation.PREVIEW,
    ActionType.DESTRUCTIVE: Confirmation.EXPLICIT,
}


@dataclass(frozen=True)
class ToolSpec:
    name: str
    action_type: ActionType
    description: str

    @property
    def confirmation(self) -> Confirmation:
        return POLICY[self.action_type]

    @property
    def may_run_automatically(self) -> bool:
        return self.confirmation is Confirmation.NONE


# Registry of tools the assistant orchestrator may invoke. Tools not listed here cannot run.
TOOLS: dict[str, ToolSpec] = {
    t.name: t
    for t in (
        ToolSpec("project.lookup", ActionType.READ, "Resolve a project by number or name."),
        ToolSpec("project.list", ActionType.READ, "List active projects."),
        ToolSpec("project.deadlines", ActionType.READ, "Registry deadlines in a window."),
        ToolSpec("project.consultants", ActionType.READ, "Consultants assigned to a project."),
        ToolSpec("search.global", ActionType.READ, "Search structured records."),
        ToolSpec("draft.text", ActionType.CREATE_DRAFT, "Compose draft text for review."),
    )
}


def authorize(tool_name: str, *, confirmed: bool = False) -> ToolSpec:
    """Return the tool spec if it may run now; raise PermissionError otherwise."""
    spec = TOOLS.get(tool_name)
    if spec is None:
        raise PermissionError(f"Unknown tool '{tool_name}'.")
    if not spec.may_run_automatically and not confirmed:
        raise PermissionError(f"'{tool_name}' is a {spec.action_type} action and needs approval.")
    return spec
