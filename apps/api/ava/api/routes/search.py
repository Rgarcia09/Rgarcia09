from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import BaseModel

from ava.api.deps import DB, Auth
from ava.services.search import global_search

router = APIRouter(prefix="/api/search", tags=["search"])


class SearchHitOut(BaseModel):
    kind: str
    id: str
    title: str
    subtitle: str | None
    url: str
    score: float


class SearchResponse(BaseModel):
    query: str
    hits: list[SearchHitOut]
    #: Sources not yet searchable, so the UI can say so instead of implying completeness.
    not_searched: list[str]


@router.get("", response_model=SearchResponse)
def search(
    q: Annotated[str, Query(min_length=1, max_length=200)], _: Auth, db: DB
) -> SearchResponse:
    hits = [SearchHitOut(**h.__dict__) for h in global_search(db, q)]
    return SearchResponse(
        query=q,
        hits=hits,
        not_searched=[
            "Documents (Dropbox)",
            "Email",
            "Calendar",
            "Invoices",
            "RFIs",
            "Submittals",
            "Meetings",
        ],
    )
