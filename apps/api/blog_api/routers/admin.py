from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from sqlmodel import Session, desc, select

from ..auth import COOKIE_NAME, SESSION_MAX_AGE, create_session_token, require_admin
from ..config import Settings
from ..database import get_session
from ..markdown_utils import render_markdown
from ..models import Article, Category, SidebarBlock, Tag
from ..schemas import (
    AdminTagResponse,
    ArticleDetail,
    ArticleListResponse,
    ArticleWrite,
    CategoryResponse,
    CategoryWrite,
    LoginRequest,
    MediaListResponse,
    PreviewRequest,
    PreviewResponse,
    SessionResponse,
    SidebarBlockResponse,
    SidebarBlockWrite,
    SiteSettingsResponse,
    SiteSettingsWrite,
    TagWrite,
    UploadResponse,
)
from ..services import (
    article_matches_search,
    build_category_tree,
    category_has_children,
    delete_media_item,
    ensure_unique_article_slug,
    ensure_tags,
    flatten_category_tree,
    get_category_descendant_ids,
    get_category_by_slug,
    get_site_settings,
    list_media_items,
    replace_article_tag_slug,
    serialize_admin_tag,
    serialize_article,
    serialize_article_detail,
    serialize_category,
    serialize_sidebar_block,
    store_upload,
    tag_article_count,
    update_site_settings,
    validate_article_input,
    validate_category_parent,
    validate_tag_payload,
    write_markdown_file,
)
from ..utils import slugify


router = APIRouter(prefix="/api/admin", tags=["admin"])


def get_settings(request: Request) -> Settings:
    return request.app.state.settings


@router.post("/auth/login", response_model=SessionResponse)
def login(payload: LoginRequest, response: Response, settings: Settings = Depends(get_settings)):
    if (
        payload.username != settings.admin_username
        or payload.password != settings.admin_password
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")
    response.set_cookie(
        COOKIE_NAME,
        create_session_token(payload.username, settings),
        httponly=True,
        samesite="lax",
        max_age=SESSION_MAX_AGE,
    )
    return SessionResponse(authenticated=True, username=payload.username)


@router.post("/auth/logout", response_model=SessionResponse)
def logout(response: Response, _: str = Depends(require_admin)):
    response.delete_cookie(COOKIE_NAME)
    return SessionResponse(authenticated=False, username=None)


@router.get("/auth/session", response_model=SessionResponse)
def get_session_state(_: str = Depends(require_admin), settings: Settings = Depends(get_settings)):
    return SessionResponse(authenticated=True, username=settings.admin_username)


@router.get("/meta")
def get_meta(session: Session = Depends(get_session)):
    categories = session.exec(select(Category).order_by(Category.sort_order)).all()
    category_tree = build_category_tree(categories, enabled_only=True)
    flat_categories = flatten_category_tree(category_tree)
    return {
        "categories": [
            {
                "id": category.id,
                "name": category.name,
                "slug": category.slug,
                "parentId": category.parent_id,
                "depth": category.depth,
            }
            for category in flat_categories
        ],
        "articleStatuses": ["draft", "published", "archived"],
        "sidebarRegions": ["left", "right", "bottom"],
        "sidebarTypes": ["markdown", "notice", "html", "link-group", "ad"],
    }


@router.get("/site-settings", response_model=SiteSettingsResponse)
def get_admin_site_settings(
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
):
    return get_site_settings(session)


@router.put("/site-settings", response_model=SiteSettingsResponse)
def update_admin_site_settings(
    payload: SiteSettingsWrite,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
):
    return update_site_settings(session, payload)


@router.get("/tags", response_model=list[AdminTagResponse])
def list_admin_tags(
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
):
    tags = session.exec(select(Tag).order_by(Tag.name, Tag.id)).all()
    return [serialize_admin_tag(session, tag) for tag in tags]


@router.post("/tags", response_model=AdminTagResponse, status_code=status.HTTP_201_CREATED)
def create_tag(
    payload: TagWrite,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
):
    name, slug = validate_tag_payload(session, payload)
    tag = Tag(name=name, slug=slug)
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return serialize_admin_tag(session, tag)


@router.put("/tags/{tag_id}", response_model=AdminTagResponse)
def update_tag(
    tag_id: int,
    payload: TagWrite,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="标签不存在")
    old_slug = tag.slug
    name, slug = validate_tag_payload(session, payload, current_tag_id=tag.id)
    tag.name = name
    tag.slug = slug
    session.add(tag)
    replace_article_tag_slug(session, old_slug, slug)
    session.commit()
    session.refresh(tag)
    return serialize_admin_tag(session, tag)


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: int,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
):
    tag = session.get(Tag, tag_id)
    if not tag:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="标签不存在")
    if tag_article_count(session, tag.slug) > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="标签正在被文章使用")
    session.delete(tag)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/categories", response_model=list[CategoryResponse])
def list_admin_categories(
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
):
    categories = session.exec(select(Category).order_by(Category.sort_order, Category.id)).all()
    return build_category_tree(categories)


@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryWrite,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
):
    name = payload.name.strip()
    slug = slugify(payload.slug or payload.name)
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="分类名称不能为空")
    existing = session.exec(select(Category).where(Category.slug == slug)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="分类链接已存在")
    parent_id = validate_category_parent(session, payload.parent_id)
    category = Category(
        name=name,
        slug=slug,
        parent_id=parent_id,
        sort_order=payload.sort_order,
        enabled=payload.enabled,
    )
    session.add(category)
    session.commit()
    session.refresh(category)
    return serialize_category(category)


@router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    payload: CategoryWrite,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
):
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="分类不存在")
    name = payload.name.strip()
    slug = slugify(payload.slug or payload.name)
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="分类名称不能为空")
    existing = session.exec(select(Category).where(Category.slug == slug)).first()
    if existing and existing.id != category.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="分类链接已存在")
    parent_id = validate_category_parent(session, payload.parent_id, current_category_id=category.id)
    category.name = name
    category.slug = slug
    category.parent_id = parent_id
    category.sort_order = payload.sort_order
    category.enabled = payload.enabled
    session.add(category)
    session.commit()
    session.refresh(category)
    return serialize_category(category)


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
):
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="分类不存在")
    if category_has_children(session, category_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="分类下有子分类，无法删除")
    used = session.exec(select(Article).where(Article.category_id == category_id)).first()
    if used:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="分类正在被文章使用")
    session.delete(category)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/articles", response_model=ArticleListResponse)
def list_admin_articles(
    search: str | None = None,
    category: str | None = None,
    status_value: str | None = Query(default=None, alias="statusValue"),
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
):
    query = select(Article).order_by(desc(Article.updated_at))
    articles = session.exec(query).all()
    category_ids = None
    if category:
        selected_category = get_category_by_slug(session, category)
        category_ids = get_category_descendant_ids(session, selected_category.id or 0)
    items = []
    for article in articles:
        serialized = serialize_article(session, settings, article)
        if not article_matches_search(session, settings, article, search):
            continue
        if category_ids is not None and article.category_id not in category_ids:
            continue
        if status_value and serialized.status != status_value:
            continue
        items.append(serialized)
    return ArticleListResponse(items=items)


@router.get("/articles/{article_id}", response_model=ArticleDetail)
def get_admin_article(
    article_id: int,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
):
    article = session.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")
    return serialize_article_detail(session, settings, article)


@router.post("/articles", response_model=ArticleDetail, status_code=status.HTTP_201_CREATED)
def create_article(
    payload: ArticleWrite,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
):
    validate_article_input(payload.title, payload.slug)
    category = get_category_by_slug(session, payload.category_slug)
    normalized_tags = ensure_tags(session, payload.tag_slugs)
    normalized_slug = slugify(payload.slug)
    ensure_unique_article_slug(session, normalized_slug)
    markdown_path = write_markdown_file(settings, normalized_slug, payload.markdown)
    article = Article(
        title=payload.title,
        slug=normalized_slug,
        summary=payload.summary,
        cover_image=payload.cover_image,
        category_id=category.id or 0,
        tag_slugs=",".join(normalized_tags),
        markdown_path=markdown_path,
        status=payload.status,
    )
    if payload.status == "published":
        article.published_at = article.updated_at
    session.add(article)
    session.commit()
    session.refresh(article)
    return serialize_article_detail(session, settings, article)


@router.put("/articles/{article_id}", response_model=ArticleDetail)
def update_article(
    article_id: int,
    payload: ArticleWrite,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
):
    validate_article_input(payload.title, payload.slug)
    article = session.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")
    category = get_category_by_slug(session, payload.category_slug)
    normalized_tags = ensure_tags(session, payload.tag_slugs)
    new_slug = slugify(payload.slug)
    ensure_unique_article_slug(session, new_slug, current_article_id=article.id)
    article.title = payload.title
    article.slug = new_slug
    article.summary = payload.summary
    article.cover_image = payload.cover_image
    article.category_id = category.id or 0
    article.tag_slugs = ",".join(normalized_tags)
    article.status = payload.status
    article.updated_at = datetime.now(timezone.utc)
    article.markdown_path = write_markdown_file(
        settings,
        new_slug,
        payload.markdown,
        previous_path=article.markdown_path,
    )
    if payload.status == "published" and not article.published_at:
        article.published_at = article.updated_at
    session.add(article)
    session.commit()
    session.refresh(article)
    return serialize_article_detail(session, settings, article)


@router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(
    article_id: int,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
):
    article = session.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")
    markdown_path = settings.content_dir / article.markdown_path
    session.delete(article)
    session.commit()
    try:
        resolved = markdown_path.resolve()
        if resolved.parent == settings.content_dir.resolve() and resolved.exists():
            resolved.unlink()
    except OSError:
        pass
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/articles/{article_id}/publish", response_model=ArticleDetail)
def publish_article(
    article_id: int,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
):
    article = session.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")
    article.status = "published"
    article.updated_at = datetime.now(timezone.utc)
    article.published_at = article.published_at or article.updated_at
    session.add(article)
    session.commit()
    session.refresh(article)
    return serialize_article_detail(session, settings, article)


@router.post("/articles/{article_id}/unpublish", response_model=ArticleDetail)
def unpublish_article(
    article_id: int,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
):
    article = session.get(Article, article_id)
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文章不存在")
    article.status = "draft"
    session.add(article)
    session.commit()
    session.refresh(article)
    return serialize_article_detail(session, settings, article)


@router.post("/articles/preview", response_model=PreviewResponse)
def preview_article(payload: PreviewRequest, _: str = Depends(require_admin)):
    return PreviewResponse(html=render_markdown(payload.markdown))


@router.get("/sidebar-blocks", response_model=list[SidebarBlockResponse])
def list_sidebar_blocks(
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
):
    blocks = session.exec(
        select(SidebarBlock).order_by(SidebarBlock.region, SidebarBlock.sort_order, SidebarBlock.id)
    ).all()
    return [serialize_sidebar_block(block) for block in blocks]


@router.post("/sidebar-blocks", response_model=SidebarBlockResponse, status_code=status.HTTP_201_CREATED)
def create_sidebar_block(
    payload: SidebarBlockWrite,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
):
    block = SidebarBlock(
        region=payload.region,
        type=payload.type,
        title=payload.title,
        content=payload.content,
        enabled=payload.enabled,
        sort_order=payload.sort_order,
    )
    session.add(block)
    session.commit()
    session.refresh(block)
    return serialize_sidebar_block(block)


@router.put("/sidebar-blocks/{block_id}", response_model=SidebarBlockResponse)
def update_sidebar_block(
    block_id: int,
    payload: SidebarBlockWrite,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
):
    block = session.get(SidebarBlock, block_id)
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="边栏内容块不存在")
    block.region = payload.region
    block.type = payload.type
    block.title = payload.title
    block.content = payload.content
    block.enabled = payload.enabled
    block.sort_order = payload.sort_order
    session.add(block)
    session.commit()
    session.refresh(block)
    return serialize_sidebar_block(block)


@router.delete("/sidebar-blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sidebar_block(
    block_id: int,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
):
    block = session.get(SidebarBlock, block_id)
    if not block:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="边栏内容块不存在")
    session.delete(block)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/media", response_model=MediaListResponse)
def list_media(
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
):
    return MediaListResponse(items=list_media_items(session, settings))


@router.delete("/media/{file_name}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(
    file_name: str,
    _: str = Depends(require_admin),
    session: Session = Depends(get_session),
    settings: Settings = Depends(get_settings),
):
    delete_media_item(session, settings, file_name)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/media/upload", response_model=UploadResponse)
async def upload_media(
    file: UploadFile = File(...),
    _: str = Depends(require_admin),
    settings: Settings = Depends(get_settings),
):
    file_name, url, markdown = await store_upload(settings, file)
    return UploadResponse(file_name=file_name, url=url, markdown=markdown)
