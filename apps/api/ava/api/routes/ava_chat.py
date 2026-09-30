from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select

from ava.ai.orchestrator import Orchestrator
from ava.ai.prompting import contains_injection
from ava.ai.providers.base import AIProvider, ChatMessage
from ava.api.ai_dep import ai_provider
from ava.api.deps import DB, Auth
from ava.config import get_settings
from ava.core.errors import NotFound
from ava.db.base import utcnow
from ava.models import AIConversation, AIMessage
from ava.schemas.ava import ChatRequest, ChatResponse, ConversationDetail, ConversationOut
from ava.services import app_settings, audit
from ava.services import projects as project_service
from ava.services.clock import office_today

router = APIRouter(prefix="/api/ava", tags=["ava"])

Provider = Annotated[AIProvider, Depends(ai_provider)]


def _own_conversation(db: DB, auth: Auth, conversation_id: uuid.UUID) -> AIConversation:
    conv = db.get(AIConversation, conversation_id)
    if conv is None or conv.user_id != auth.user.id:
        raise NotFound("Conversation not found.")
    return conv


@router.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest, auth: Auth, db: DB, provider: Provider) -> ChatResponse:
    if body.project_id is not None:
        project_service.get_project(db, body.project_id)  # 404 if unknown

    if body.conversation_id:
        conv = _own_conversation(db, auth, body.conversation_id)
    else:
        conv = AIConversation(
            user_id=auth.user.id, project_id=body.project_id, title=body.message.strip()[:120]
        )
        db.add(conv)
        db.flush()
    history = [
        ChatMessage(m.role, m.content)  # type: ignore[arg-type]
        for m in db.scalars(
            select(AIMessage)
            .where(AIMessage.conversation_id == conv.id)
            .order_by(AIMessage.created_at.desc())
            .limit(6)
        )
    ][::-1]

    prefs = app_settings.load(db)
    orchestrator = Orchestrator(
        db,
        provider,
        ava_name=prefs.ava_name,
        office_name=prefs.office_name,
        today=office_today(),
        max_context_chars=get_settings().ai_max_context_chars,
    )
    answer = orchestrator.answer(body.message, project_id=body.project_id, history=history)

    db.add(AIMessage(conversation_id=conv.id, role="user", content=body.message))
    db.flush()
    reply = AIMessage(
        conversation_id=conv.id,
        role="assistant",
        content=answer.content,
        sources=[s.as_dict() for s in answer.sources],
        produced_by=answer.produced_by,
    )
    db.add(reply)
    if conv.project_id is None and answer.project_id is not None:
        conv.project_id = answer.project_id
    conv.updated_at = utcnow()
    # Audit the request, not its content: only intent and outcome are logged.
    audit.record(
        db,
        action="ava.chat",
        action_type="CREATE_DRAFT" if answer.intent == "email_draft" else "READ",
        user=auth.user,
        resource_type="conversation",
        resource_id=conv.id,
        project_id=answer.project_id,
        ip_address=auth.ip_address,
        detail={
            "intent": answer.intent,
            "produced_by": answer.produced_by,
            "suspicious_input": contains_injection(body.message),
        },
    )
    db.commit()
    db.refresh(reply)
    return ChatResponse(
        conversation_id=conv.id, intent=answer.intent, project_id=answer.project_id, message=reply
    )


@router.get("/conversations", response_model=list[ConversationOut])
def conversations(auth: Auth, db: DB, project_id: uuid.UUID | None = None) -> list:
    stmt = select(AIConversation).where(AIConversation.user_id == auth.user.id)
    if project_id:
        stmt = stmt.where(AIConversation.project_id == project_id)
    return list(db.scalars(stmt.order_by(AIConversation.updated_at.desc()).limit(50)))


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
def conversation(conversation_id: uuid.UUID, auth: Auth, db: DB) -> AIConversation:
    return _own_conversation(db, auth, conversation_id)
