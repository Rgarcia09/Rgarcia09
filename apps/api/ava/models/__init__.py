"""ORM models. Importing this package registers every table on `Base.metadata`."""

from ava.models.audit import AuditLog
from ava.models.conversation import AIConversation, AIMessage
from ava.models.directory import Client, ClientContact, Consultant, ConsultantContact
from ava.models.project import Project, ProjectConsultant, ProjectStaff
from ava.models.system import AppSetting, Integration, SyncJob
from ava.models.user import User, UserSession

__all__ = [
    "AIConversation",
    "AIMessage",
    "AppSetting",
    "AuditLog",
    "Client",
    "ClientContact",
    "Consultant",
    "ConsultantContact",
    "Integration",
    "Project",
    "ProjectConsultant",
    "ProjectStaff",
    "SyncJob",
    "User",
    "UserSession",
]
