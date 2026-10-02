from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from ava.schemas.common import ORMModel


class SourceOut(BaseModel):
    kind: str
    label: str
    url: str | None = None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    conversation_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None


class MessageOut(ORMModel):
    id: uuid.UUID
    role: str
    content: str
    sources: list[SourceOut]
    produced_by: str | None
    created_at: datetime


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    intent: str
    project_id: uuid.UUID | None
    message: MessageOut


class ConversationOut(ORMModel):
    id: uuid.UUID
    title: str
    project_id: uuid.UUID | None
    updated_at: datetime


class ConversationDetail(ConversationOut):
    messages: list[MessageOut]
