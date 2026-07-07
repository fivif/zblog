from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from .config import Settings
from .database import build_engine, init_database
from .routers.admin import router as admin_router
from .routers.public import router as public_router
from .seed import seed_categories, seed_site_settings
from .utils import ensure_directory


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    engine = build_engine(settings)
    ensure_directory(settings.content_dir)
    ensure_directory(settings.media_dir)
    init_database(engine)
    with Session(engine) as session:
        seed_categories(session)
        seed_site_settings(session)

    app = FastAPI(title="Personal Blog API", version="0.1.0")
    app.state.settings = settings
    app.state.engine = engine

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(public_router)
    app.include_router(admin_router)
    app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.exception_handler(404)
    async def not_found_handler(_, __):
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    return app


app = create_app()

