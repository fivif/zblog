from __future__ import annotations

from collections.abc import Generator

from fastapi import Request
from sqlmodel import Session, SQLModel, create_engine

from .config import Settings


def build_engine(settings: Settings):
    connect_args = {"check_same_thread": False} if settings.db_url.startswith("sqlite") else {}
    return create_engine(settings.db_url, connect_args=connect_args)


def init_database(engine) -> None:
    SQLModel.metadata.create_all(engine)
    upgrade_database(engine)


def upgrade_database(engine) -> None:
    if engine.dialect.name != "sqlite":
        return

    with engine.begin() as connection:
        category_columns = {
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(category)").fetchall()
        }
        if "parent_id" not in category_columns:
            connection.exec_driver_sql("ALTER TABLE category ADD COLUMN parent_id INTEGER")
        connection.exec_driver_sql(
            "CREATE INDEX IF NOT EXISTS ix_category_parent_id ON category(parent_id)"
        )

        article_columns = {
            row[1]
            for row in connection.exec_driver_sql("PRAGMA table_info(article)").fetchall()
        }
        if "view_count" not in article_columns:
            connection.exec_driver_sql("ALTER TABLE article ADD COLUMN view_count INTEGER DEFAULT 0")
        if "like_count" not in article_columns:
            connection.exec_driver_sql("ALTER TABLE article ADD COLUMN like_count INTEGER DEFAULT 0")


def get_session(request: Request) -> Generator[Session, None, None]:
    with Session(request.app.state.engine) as session:
        yield session
