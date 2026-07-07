from __future__ import annotations

from sqlmodel import Session, select

from .models import Category, SiteSetting


DEFAULT_CATEGORIES = [
    {"name": "日常", "slug": "daily", "sort_order": 1},
    {"name": "news", "slug": "news", "sort_order": 2},
    {"name": "IT", "slug": "it", "sort_order": 3},
    {"name": "嵌入式", "slug": "embedded", "sort_order": 4},
    {"name": "AI", "slug": "ai", "sort_order": 5},
]


def seed_categories(session: Session) -> None:
    existing = {item.slug for item in session.exec(select(Category)).all()}
    created = False
    for item in DEFAULT_CATEGORIES:
        if item["slug"] in existing:
            continue
        session.add(Category(**item))
        created = True
    if created:
        session.commit()



DEFAULT_SITE_SETTINGS = {
    "site_title": "个人博客",
    "site_subtitle": "写作系统",
}


def seed_site_settings(session: Session) -> None:
    created = False
    for key, value in DEFAULT_SITE_SETTINGS.items():
        if session.get(SiteSetting, key):
            continue
        session.add(SiteSetting(key=key, value=value))
        created = True
    if created:
        session.commit()
