"""AVA API application factory."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, Response
from starlette.middleware.trustedhost import TrustedHostMiddleware

from ava.api.routes import admin, agenda, auth, ava_chat, directory, health, projects, search, users
from ava.config import get_settings
from ava.core.errors import install_error_handlers

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
    "Cache-Control": "no-store",
}


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(level=settings.log_level)
    app = FastAPI(
        title=f"{settings.ava_name} API",
        version="0.1.0",
        description="Internal AI operating system for the architecture office.",
        # API docs stay available on the internal network; disable in settings if desired.
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )
    install_error_handlers(app)

    allowed_hosts = [h.strip() for h in settings.allowed_hosts.split(",") if h.strip()]
    if allowed_hosts:
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=allowed_hosts)

    @app.middleware("http")
    async def _security_headers(request: Request, call_next):
        response: Response = await call_next(request)
        for key, value in SECURITY_HEADERS.items():
            response.headers.setdefault(key, value)
        return response

    for router in (
        health.router,
        auth.router,
        users.router,
        projects.router,
        directory.clients,
        directory.consultants,
        search.router,
        agenda.router,
        ava_chat.router,
        admin.router,
        admin.meta,
    ):
        app.include_router(router)
    return app


app = create_app()
