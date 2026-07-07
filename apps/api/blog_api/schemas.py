from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(item.title() for item in parts[1:])


class APIModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class LoginRequest(APIModel):
    username: str
    password: str


class SessionResponse(APIModel):
    authenticated: bool
    username: str | None = None


class PreviewRequest(APIModel):
    markdown: str


class PreviewResponse(APIModel):
    html: str


class CategoryResponse(APIModel):
    id: int
    name: str
    slug: str
    parent_id: int | None = None
    sort_order: int
    enabled: bool
    depth: int = 0
    children: list["CategoryResponse"] = Field(default_factory=list)


class CategoryWrite(APIModel):
    name: str
    slug: str = ""
    parent_id: int | None = None
    sort_order: int = 0
    enabled: bool = True


class SiteSettingsResponse(APIModel):
    site_title: str
    site_subtitle: str


class SiteSettingsWrite(APIModel):
    site_title: str
    site_subtitle: str = ""


class TagResponse(APIModel):
    slug: str
    name: str


class TagWrite(APIModel):
    name: str
    slug: str = ""


class AdminTagResponse(TagResponse):
    id: int
    article_count: int = 0


class ArticleWrite(APIModel):
    title: str
    slug: str
    summary: str = ""
    cover_image: str = ""
    category_slug: str
    tag_slugs: list[str] = []
    status: Literal["draft", "published", "archived"] = "draft"
    markdown: str


class ArticleListItem(APIModel):
    id: int
    title: str
    slug: str
    summary: str
    cover_image: str
    status: str
    category: CategoryResponse
    tags: list[TagResponse]
    published_at: datetime | None = None
    updated_at: datetime
    view_count: int = 0
    like_count: int = 0


class ArticleDetail(ArticleListItem):
    markdown: str
    html: str


class ArticleListResponse(APIModel):
    items: list[ArticleListItem]


class SidebarBlockWrite(APIModel):
    region: Literal["left", "right", "bottom"]
    type: Literal["markdown", "notice", "html", "link-group", "ad"] = "markdown"
    title: str
    content: str
    enabled: bool = True
    sort_order: int = 0


class SidebarBlockResponse(SidebarBlockWrite):
    id: int


class SidebarRegionsResponse(APIModel):
    left: list[SidebarBlockResponse]
    right: list[SidebarBlockResponse]
    bottom: list[SidebarBlockResponse]


class UploadResponse(APIModel):
    file_name: str
    url: str
    markdown: str



class MediaItemResponse(APIModel):
    file_name: str
    url: str
    type: Literal["image", "video"]
    size: int
    modified_at: datetime
    markdown: str
    used: bool = False


class MediaListResponse(APIModel):
    items: list[MediaItemResponse]
