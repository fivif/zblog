from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[3]


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        os.environ.setdefault(key, value)


def _resolve_path(value: str, fallback: Path) -> Path:
    if not value:
        return fallback
    path = Path(value)
    if not path.is_absolute():
        path = (ROOT_DIR / path).resolve()
    return path


@dataclass(slots=True)
class Settings:
    admin_username: str
    admin_password: str
    secret_key: str
    db_url: str
    content_dir: Path
    media_dir: Path

    @classmethod
    def from_env(cls) -> "Settings":
        load_env_file(ROOT_DIR / ".env")
        db_url = os.getenv("BLOG_DB_URL", "sqlite:///./apps/api/blog.db")
        if db_url.startswith("sqlite:///./"):
            relative = db_url.removeprefix("sqlite:///./")
            db_url = f"sqlite:///{(ROOT_DIR / relative).resolve().as_posix()}"

        return cls(
            admin_username=os.getenv("BLOG_ADMIN_USERNAME", "admin"),
            admin_password=os.getenv("BLOG_ADMIN_PASSWORD", "change-me"),
            secret_key=os.getenv("BLOG_SECRET_KEY", "replace-this-secret"),
            db_url=db_url,
            content_dir=_resolve_path(
                os.getenv("BLOG_CONTENT_DIR", "./content/articles"),
                ROOT_DIR / "content" / "articles",
            ),
            media_dir=_resolve_path(
                os.getenv("BLOG_MEDIA_DIR", "./content/media"),
                ROOT_DIR / "content" / "media",
            ),
        )
