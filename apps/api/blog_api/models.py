from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Category(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    slug: str = Field(index=True, unique=True)
    parent_id: Optional[int] = Field(default=None, foreign_key="category.id", index=True)
    sort_order: int = 0
    enabled: bool = True


class Tag(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    slug: str = Field(index=True, unique=True)


class Article(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    slug: str = Field(index=True, unique=True)
    summary: str = ""
    cover_image: str = ""
    category_id: int = Field(foreign_key="category.id")
    tag_slugs: str = ""
    markdown_path: str
    status: str = Field(index=True, default="draft")
    published_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=utcnow)
    view_count: int = 0
    like_count: int = 0


class SidebarBlock(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    region: str = Field(index=True)
    type: str = "markdown"
    title: str = ""
    content: str = ""
    enabled: bool = True
    sort_order: int = 0



class SiteSetting(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: str = ""
