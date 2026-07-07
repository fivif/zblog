from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from sqlmodel import Session, select

from .config import Settings
from .markdown_utils import render_markdown, sanitize_html_fragment
from .models import Article, Category, SidebarBlock, SiteSetting, Tag
from .schemas import (
    AdminTagResponse,
    ArticleDetail,
    ArticleListItem,
    CategoryResponse,
    MediaItemResponse,
    SidebarBlockResponse,
    SiteSettingsResponse,
    SiteSettingsWrite,
    TagResponse,
    TagWrite,
)
from .utils import ensure_directory, normalize_multiline_text, slugify


DEFAULT_SITE_TITLE = "个人博客"
DEFAULT_SITE_SUBTITLE = "写作系统"
def get_site_settings(session: Session) -> SiteSettingsResponse:
    rows = session.exec(select(SiteSetting)).all()
    values = {row.key: row.value for row in rows}
    return SiteSettingsResponse(
        site_title=(values.get("site_title") or DEFAULT_SITE_TITLE).strip() or DEFAULT_SITE_TITLE,
        site_subtitle=(values.get("site_subtitle") or DEFAULT_SITE_SUBTITLE).strip(),
    )


def update_site_settings(session: Session, payload: SiteSettingsWrite) -> SiteSettingsResponse:
    site_title = payload.site_title.strip()
    site_subtitle = payload.site_subtitle.strip()
    if not site_title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="站点标题不能为空")
    values = {"site_title": site_title, "site_subtitle": site_subtitle}
    for key, value in values.items():
        item = session.get(SiteSetting, key)
        if item:
            item.value = value
        else:
            item = SiteSetting(key=key, value=value)
        session.add(item)
    session.commit()
    return get_site_settings(session)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def write_markdown_file(settings: Settings, slug: str, markdown: str, previous_path: str | None = None) -> str:
    ensure_directory(settings.content_dir)
    target = settings.content_dir / f"{slug}.md"
    target.write_text(normalize_multiline_text(markdown), encoding="utf-8")
    if previous_path and previous_path != target.name:
        old = settings.content_dir / previous_path
        if old.exists():
            old.unlink()
    return target.name


def read_markdown_file(settings: Settings, markdown_path: str) -> str:
    target = settings.content_dir / markdown_path
    return target.read_text(encoding="utf-8") if target.exists() else ""


def get_category_by_slug(session: Session, slug: str) -> Category:
    category = session.exec(select(Category).where(Category.slug == slug)).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="分类不存在")
    return category


def validate_article_input(title: str, slug: str) -> None:
    if not title.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="标题不能为空")
    if not slug.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="固定链接不能为空")


def ensure_unique_article_slug(session: Session, slug: str, current_article_id: int | None = None) -> None:
    existing = session.exec(select(Article).where(Article.slug == slug)).first()
    if existing and existing.id != current_article_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="固定链接已存在")


def ensure_tags(session: Session, tag_slugs: list[str]) -> list[str]:
    normalized: list[str] = []
    for raw in tag_slugs:
        slug = slugify(raw)
        if not slug or slug in normalized:
            continue
        tag = session.exec(select(Tag).where(Tag.slug == slug)).first()
        if not tag:
            session.add(Tag(name=raw.strip() or slug, slug=slug))
        normalized.append(slug)
    session.flush()
    return normalized


def resolve_tags(session: Session, tag_slugs: list[str]) -> list[TagResponse]:
    if not tag_slugs:
        return []
    tags = session.exec(select(Tag).where(Tag.slug.in_(tag_slugs))).all()
    tag_map = {tag.slug: tag for tag in tags}
    return [
        TagResponse(slug=slug, name=tag_map.get(slug).name if tag_map.get(slug) else slug)
        for slug in tag_slugs
    ]


def tag_article_count(session: Session, slug: str) -> int:
    count = 0
    for article in session.exec(select(Article)).all():
        if slug in [item for item in article.tag_slugs.split(",") if item]:
            count += 1
    return count


def serialize_admin_tag(session: Session, tag: Tag) -> AdminTagResponse:
    return AdminTagResponse(
        id=tag.id or 0,
        slug=tag.slug,
        name=tag.name,
        article_count=tag_article_count(session, tag.slug),
    )


def validate_tag_payload(session: Session, payload: TagWrite, current_tag_id: int | None = None) -> tuple[str, str]:
    name = payload.name.strip()
    slug = slugify(payload.slug or payload.name)
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="标签名不能为空")
    if not slug:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="标签链接不能为空")
    existing = session.exec(select(Tag).where(Tag.slug == slug)).first()
    if existing and existing.id != current_tag_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="标签链接已存在")
    return name, slug


def replace_article_tag_slug(session: Session, old_slug: str, new_slug: str) -> None:
    if old_slug == new_slug:
        return
    for article in session.exec(select(Article)).all():
        slugs = [item for item in article.tag_slugs.split(",") if item]
        if old_slug not in slugs:
            continue
        next_slugs: list[str] = []
        for slug in slugs:
            replacement = new_slug if slug == old_slug else slug
            if replacement not in next_slugs:
                next_slugs.append(replacement)
        article.tag_slugs = ",".join(next_slugs)
        article.updated_at = now_utc()
        session.add(article)


def article_matches_search(session: Session, settings: Settings, article: Article, search: str | None) -> bool:
    term = (search or "").strip().lower()
    if not term:
        return True
    category = session.get(Category, article.category_id)
    tag_slugs = [slug for slug in article.tag_slugs.split(",") if slug]
    tag_names = [tag.name for tag in session.exec(select(Tag).where(Tag.slug.in_(tag_slugs))).all()] if tag_slugs else []
    haystack = "\n".join(
        [
            article.title,
            article.slug,
            article.summary,
            category.name if category else "",
            category.slug if category else "",
            " ".join(tag_slugs),
            " ".join(tag_names),
            read_markdown_file(settings, article.markdown_path),
        ]
    ).lower()
    return term in haystack


def serialize_category(
    category: Category,
    depth: int = 0,
    children: list[CategoryResponse] | None = None,
) -> CategoryResponse:
    return CategoryResponse(
        id=category.id or 0,
        name=category.name,
        slug=category.slug,
        parent_id=category.parent_id,
        sort_order=category.sort_order,
        enabled=category.enabled,
        depth=depth,
        children=children or [],
    )


def build_category_tree(categories: list[Category], enabled_only: bool = False) -> list[CategoryResponse]:
    all_category_ids = {category.id for category in categories if category.id is not None}
    candidates = [category for category in categories if category.id is not None]
    if enabled_only:
        candidates = [category for category in candidates if category.enabled]

    category_by_id = {category.id: category for category in candidates if category.id is not None}
    children_by_parent: dict[int | None, list[Category]] = {}
    roots: list[Category] = []

    for category in candidates:
        parent_id = category.parent_id
        if parent_id is None or parent_id not in category_by_id:
            if enabled_only and parent_id in all_category_ids and parent_id not in category_by_id:
                continue
            roots.append(category)
            continue
        children_by_parent.setdefault(parent_id, []).append(category)

    def sort_key(category: Category) -> tuple[int, int]:
        return (category.sort_order, category.id or 0)

    def build_node(category: Category, depth: int, ancestors: set[int]) -> CategoryResponse:
        category_id = category.id or 0
        if category_id in ancestors:
            return serialize_category(category, depth=depth, children=[])
        next_ancestors = ancestors | {category_id}
        children = [
            build_node(child, depth + 1, next_ancestors)
            for child in sorted(children_by_parent.get(category_id, []), key=sort_key)
        ]
        return serialize_category(category, depth=depth, children=children)

    return [build_node(category, 0, set()) for category in sorted(roots, key=sort_key)]


def flatten_category_tree(categories: list[CategoryResponse]) -> list[CategoryResponse]:
    flat: list[CategoryResponse] = []

    def visit(category: CategoryResponse) -> None:
        flat.append(category)
        for child in category.children:
            visit(child)

    for category in categories:
        visit(category)
    return flat


def get_category_descendant_ids(
    session: Session,
    category_id: int,
    enabled_only: bool = False,
) -> set[int]:
    categories = session.exec(select(Category)).all()
    if enabled_only:
        categories = [category for category in categories if category.enabled]
    children_by_parent: dict[int | None, list[Category]] = {}
    for category in categories:
        children_by_parent.setdefault(category.parent_id, []).append(category)

    ids: set[int] = set()

    def visit(current_id: int) -> None:
        if current_id in ids:
            return
        ids.add(current_id)
        for child in children_by_parent.get(current_id, []):
            if child.id is not None:
                visit(child.id)

    visit(category_id)
    return ids


def validate_category_parent(
    session: Session,
    parent_id: int | None,
    current_category_id: int | None = None,
) -> int | None:
    if parent_id is None:
        return None
    parent = session.get(Category, parent_id)
    if not parent:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="父分类不存在")
    if current_category_id is not None:
        if parent_id == current_category_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="分类不能作为自身的父分类")
        descendant_ids = get_category_descendant_ids(session, current_category_id)
        if parent_id in descendant_ids:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="分类层级会产生循环")
    return parent_id


def category_has_children(session: Session, category_id: int) -> bool:
    return session.exec(select(Category).where(Category.parent_id == category_id)).first() is not None


def serialize_article(session: Session, settings: Settings, article: Article) -> ArticleListItem:
    category = session.get(Category, article.category_id)
    if not category:
        raise HTTPException(status_code=500, detail="文章关联的分类缺失")
    tag_slugs = [slug for slug in article.tag_slugs.split(",") if slug]
    return ArticleListItem(
        id=article.id or 0,
        title=article.title,
        slug=article.slug,
        summary=article.summary,
        cover_image=article.cover_image,
        status=article.status,
        category=serialize_category(category),
        tags=resolve_tags(session, tag_slugs),
        published_at=article.published_at,
        updated_at=article.updated_at,
        view_count=article.view_count,
        like_count=article.like_count,
    )


def serialize_article_detail(session: Session, settings: Settings, article: Article) -> ArticleDetail:
    summary = serialize_article(session, settings, article)
    markdown = read_markdown_file(settings, article.markdown_path)
    return ArticleDetail(
        **summary.model_dump(),
        markdown=markdown,
        html=render_markdown(markdown),
    )


def serialize_sidebar_block(block: SidebarBlock, sanitize_content: bool = False) -> SidebarBlockResponse:
    content = block.content
    if sanitize_content and block.type == "html":
        content = sanitize_html_fragment(content)
    return SidebarBlockResponse(
        id=block.id or 0,
        region=block.region,
        type=block.type,
        title=block.title,
        content=content,
        enabled=block.enabled,
        sort_order=block.sort_order,
    )


MAX_UPLOAD_BYTES = 500 * 1024 * 1024
ALLOWED_UPLOAD_SUFFIXES = {
    ".jpg": "image",
    ".jpeg": "image",
    ".png": "image",
    ".gif": "image",
    ".webp": "image",
    ".avif": "image",
    ".mp4": "video",
    ".webm": "video",
    ".ogg": "video",
}


def media_markdown(file_name: str, url: str, media_kind: str) -> str:
    if media_kind == "video":
        return f'<video controls src="{url}"></video>'
    return f"![{file_name}]({url})"


def media_usage_count(session: Session, settings: Settings, file_name: str) -> int:
    url = f"/media/{file_name}"
    count = 0
    for article in session.exec(select(Article)).all():
        markdown = read_markdown_file(settings, article.markdown_path)
        if file_name in markdown or url in markdown:
            count += 1
    for block in session.exec(select(SidebarBlock)).all():
        if file_name in block.content or url in block.content:
            count += 1
    return count


def list_media_items(session: Session, settings: Settings) -> list[MediaItemResponse]:
    ensure_directory(settings.media_dir)
    items: list[MediaItemResponse] = []
    for path in settings.media_dir.iterdir():
        if not path.is_file():
            continue
        suffix = path.suffix.lower()
        media_kind = ALLOWED_UPLOAD_SUFFIXES.get(suffix)
        if not media_kind:
            continue
        stat = path.stat()
        url = f"/media/{path.name}"
        items.append(
            MediaItemResponse(
                file_name=path.name,
                url=url,
                type=media_kind,
                size=stat.st_size,
                modified_at=datetime.fromtimestamp(stat.st_mtime, timezone.utc),
                markdown=media_markdown(path.name, url, media_kind),
                used=media_usage_count(session, settings, path.name) > 0,
            )
        )
    return sorted(items, key=lambda item: item.modified_at, reverse=True)


def delete_media_item(session: Session, settings: Settings, file_name: str) -> None:
    if Path(file_name).name != file_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="无效的媒体文件名")
    target = (settings.media_dir / file_name).resolve()
    media_dir = settings.media_dir.resolve()
    if target.parent != media_dir or not target.exists() or not target.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="媒体文件未找到")
    if media_usage_count(session, settings, file_name) > 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="媒体文件正在被使用")
    target.unlink()


async def store_upload(settings: Settings, upload: UploadFile) -> tuple[str, str, str]:
    ensure_directory(settings.media_dir)
    original_name = upload.filename or "upload"
    suffix = Path(original_name).suffix.lower()
    media_kind = ALLOWED_UPLOAD_SUFFIXES.get(suffix)
    if not media_kind:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的媒体格式",
        )

    stem = slugify(Path(original_name).stem)
    payload = await upload.read(MAX_UPLOAD_BYTES + 1)
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="文件过大，上限10MB",
        )

    file_name = f"{stem}-{uuid4().hex[:12]}{suffix}"
    target = settings.media_dir / file_name
    target.write_bytes(payload)
    url = f"/media/{file_name}"
    markdown = media_markdown(file_name, url, media_kind)
    return file_name, url, markdown
