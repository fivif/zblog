from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlmodel import Session, desc, select

from ..config import Settings
from ..database import get_session
from ..models import Article, Category, SidebarBlock, Tag
from ..schemas import ArticleListResponse, CategoryResponse, SidebarRegionsResponse, SiteSettingsResponse, TagResponse
from ..services import (
    article_matches_search,
    build_category_tree,
    get_category_by_slug,
    get_category_descendant_ids,
    get_site_settings,
    serialize_article,
    serialize_article_detail,
    serialize_sidebar_block,
)


router = APIRouter(prefix="/api/public", tags=["public"])


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


@router.get("/site-settings", response_model=SiteSettingsResponse)
def get_public_site_settings(session: Session = Depends(get_session)):
    return get_site_settings(session)


@router.get("/categories", response_model=list[CategoryResponse])
def list_categories(session: Session = Depends(get_session)):
    categories = session.exec(select(Category).order_by(Category.sort_order)).all()
    return build_category_tree(categories, enabled_only=True)


@router.get("/tags", response_model=list[TagResponse])
def list_tags(session: Session = Depends(get_session)):
    tags = session.exec(select(Tag).order_by(Tag.name)).all()
    return [TagResponse(slug=tag.slug, name=tag.name) for tag in tags]


@router.get("/articles", response_model=ArticleListResponse)
def list_articles(
    request: Request,
    category: str | None = Query(default=None),
    tag: str | None = Query(default=None),
    search: str | None = Query(default=None),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
):
    query = select(Article).where(Article.status == "published").order_by(
        desc(Article.published_at),
        desc(Article.updated_at),
    )
    articles = session.exec(query).all()
    category_ids = None
    if category:
        selected_category = get_category_by_slug(session, category)
        category_ids = get_category_descendant_ids(session, selected_category.id or 0, enabled_only=True)
    filtered = []
    for article in articles:
        if category_ids is not None and article.category_id not in category_ids:
            continue
        if tag and tag not in article.tag_slugs.split(","):
            continue
        if not article_matches_search(session, settings, article, search):
            continue
        filtered.append(serialize_article(session, settings, article))
    return ArticleListResponse(items=filtered)


@router.get("/articles/{slug}", response_model=None)
def get_article(
    slug: str,
    request: Request,
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
):
    article = session.exec(
        select(Article).where(Article.slug == slug, Article.status == "published")
    ).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到")
    return serialize_article_detail(session, settings, article)


@router.post("/articles/{slug}/view")
def increment_view(
    slug: str,
    session: Session = Depends(get_session),
):
    article = session.exec(
        select(Article).where(Article.slug == slug, Article.status == "published")
    ).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到")
    article.view_count = (article.view_count or 0) + 1
    session.add(article)
    session.commit()
    return {"viewCount": article.view_count}


@router.post("/articles/{slug}/like")
def toggle_like(
    slug: str,
    session: Session = Depends(get_session),
):
    article = session.exec(
        select(Article).where(Article.slug == slug, Article.status == "published")
    ).first()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="未找到")
    article.like_count = max(0, (article.like_count or 0) + 1)
    session.add(article)
    session.commit()
    return {"likeCount": article.like_count}


@router.get("/sidebar-blocks", response_model=SidebarRegionsResponse)
def get_sidebar_blocks(session: Session = Depends(get_session)):
    blocks = session.exec(
        select(SidebarBlock)
        .where(SidebarBlock.enabled == True)  # noqa: E712
        .order_by(SidebarBlock.region, SidebarBlock.sort_order, SidebarBlock.id)
    ).all()
    grouped = {"left": [], "right": [], "bottom": []}
    for block in blocks:
        grouped[block.region].append(serialize_sidebar_block(block, sanitize_content=True))
    return SidebarRegionsResponse(**grouped)
