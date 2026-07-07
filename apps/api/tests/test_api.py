from __future__ import annotations

import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> TestClient:
    content_dir = tmp_path / "articles"
    media_dir = tmp_path / "media"
    db_path = tmp_path / "blog.db"

    content_dir.mkdir()
    media_dir.mkdir()

    monkeypatch.setenv("BLOG_ADMIN_USERNAME", "admin")
    monkeypatch.setenv("BLOG_ADMIN_PASSWORD", "secret123")
    monkeypatch.setenv("BLOG_SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("BLOG_DB_URL", f"sqlite:///{db_path.as_posix()}")
    monkeypatch.setenv("BLOG_CONTENT_DIR", str(content_dir))
    monkeypatch.setenv("BLOG_MEDIA_DIR", str(media_dir))

    from blog_api.main import create_app

    app = create_app()
    with TestClient(app) as test_client:
        yield test_client


def login(client: TestClient) -> None:
    response = client.post(
        "/api/admin/auth/login",
        json={"username": "admin", "password": "secret123"},
    )
    assert response.status_code == 200


def test_site_settings_can_be_updated_from_admin_and_read_publicly(client: TestClient) -> None:
    public_default = client.get("/api/public/site-settings")
    assert public_default.status_code == 200
    assert public_default.json() == {"siteTitle": "个人博客", "siteSubtitle": "写作系统"}

    login(client)
    update_response = client.put(
        "/api/admin/site-settings",
        json={"siteTitle": "fivif", "siteSubtitle": "blog system"},
    )
    assert update_response.status_code == 200
    assert update_response.json() == {"siteTitle": "fivif", "siteSubtitle": "blog system"}

    public_updated = client.get("/api/public/site-settings")
    assert public_updated.status_code == 200
    assert public_updated.json()["siteTitle"] == "fivif"
    assert public_updated.json()["siteSubtitle"] == "blog system"


def test_public_categories_are_seeded(client: TestClient) -> None:
    response = client.get("/api/public/categories")

    assert response.status_code == 200
    payload = response.json()
    assert [item["slug"] for item in payload] == [
        "daily",
        "news",
        "it",
        "embedded",
        "ai",
    ]


def test_admin_article_flow_persists_markdown_and_exposes_published_content(
    client: TestClient,
) -> None:
    login(client)

    create_response = client.post(
        "/api/admin/articles",
        json={
            "title": "Hello World",
            "slug": "hello-world",
            "summary": "First post",
            "coverImage": "",
            "categorySlug": "ai",
            "tagSlugs": ["react", "fastapi"],
            "status": "draft",
            "markdown": "# Hello\\n\\n```ts\\nconsole.log('hi')\\n```",
        },
    )
    assert create_response.status_code == 201
    article_id = create_response.json()["id"]

    preview_response = client.post(
        "/api/admin/articles/preview",
        json={"markdown": "# Preview\\n\\n<iframe src='https://example.com'></iframe>"},
    )
    assert preview_response.status_code == 200
    assert "iframe" in preview_response.json()["html"]

    publish_response = client.post(f"/api/admin/articles/{article_id}/publish")
    assert publish_response.status_code == 200
    assert publish_response.json()["status"] == "published"

    list_response = client.get("/api/public/articles")
    assert list_response.status_code == 200
    list_payload = list_response.json()
    assert len(list_payload["items"]) == 1
    assert list_payload["items"][0]["slug"] == "hello-world"

    detail_response = client.get("/api/public/articles/hello-world")
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["category"]["slug"] == "ai"
    assert [tag["slug"] for tag in detail_payload["tags"]] == ["react", "fastapi"]
    assert "copy-code-button" in detail_payload["html"]
    assert 'aria-label="\u590d\u5236\u4ee3\u7801"' in detail_payload["html"]
    assert (Path(os.environ["BLOG_CONTENT_DIR"]) / "hello-world.md").exists()


def test_articles_can_be_searched_by_text_tags_and_markdown(client: TestClient) -> None:
    login(client)
    create_response = client.post(
        "/api/admin/articles",
        json={
            "title": "Search Host",
            "slug": "search-host",
            "summary": "summary keyword alpha",
            "coverImage": "",
            "categorySlug": "ai",
            "tagSlugs": ["needle-tag"],
            "status": "published",
            "markdown": "# Body\n\nOnly markdown has deepneedle.",
        },
    )
    assert create_response.status_code == 201

    public_by_markdown = client.get("/api/public/articles?search=deepneedle")
    assert public_by_markdown.status_code == 200
    assert [item["slug"] for item in public_by_markdown.json()["items"]] == ["search-host"]

    public_by_tag = client.get("/api/public/articles?search=needle-tag")
    assert public_by_tag.status_code == 200
    assert [item["slug"] for item in public_by_tag.json()["items"]] == ["search-host"]

    admin_by_summary = client.get("/api/admin/articles?search=alpha")
    assert admin_by_summary.status_code == 200
    assert [item["slug"] for item in admin_by_summary.json()["items"]] == ["search-host"]


def test_markdown_tables_render_as_html_tables() -> None:
    from blog_api.markdown_utils import render_markdown

    markdown = """| 特性 | 异步 | 多线程 | 多进程 |
| --- | --- | --- | --- |
| 比喻 | 单人高效切换任务 | 多人共享一个灶台 | 多个独立厨房 |
| 适用场景 | I/O 密集型 | I/O 密集型 | CPU 密集型 |
"""

    html = render_markdown(markdown)

    assert "<table>" in html
    assert "<thead>" in html
    assert "<tbody>" in html
    assert "<th>异步</th>" in html
    assert "<td>CPU 密集型</td>" in html
    assert "<p>| 特性" not in html


def test_sidebar_blocks_can_be_managed_from_admin_and_read_publicly(
    client: TestClient,
) -> None:
    login(client)

    create_response = client.post(
        "/api/admin/sidebar-blocks",
        json={
            "region": "left",
            "type": "notice",
            "title": "About",
            "content": "Welcome here",
            "enabled": True,
            "sortOrder": 10,
        },
    )
    assert create_response.status_code == 201
    block_id = create_response.json()["id"]

    update_response = client.put(
        f"/api/admin/sidebar-blocks/{block_id}",
        json={
            "region": "left",
            "type": "markdown",
            "title": "Updated",
            "content": "### hello",
            "enabled": True,
            "sortOrder": 5,
        },
    )
    assert update_response.status_code == 200

    public_response = client.get("/api/public/sidebar-blocks")
    assert public_response.status_code == 200
    payload = public_response.json()
    assert payload["left"][0]["title"] == "Updated"
    assert payload["left"][0]["type"] == "markdown"


def test_duplicate_slug_returns_conflict_instead_of_server_error(client: TestClient) -> None:
    login(client)

    payload = {
        "title": "First",
        "slug": "same-slug",
        "summary": "one",
        "coverImage": "",
        "categorySlug": "ai",
        "tagSlugs": [],
        "status": "draft",
        "markdown": "# one",
    }

    first_response = client.post("/api/admin/articles", json=payload)
    assert first_response.status_code == 201

    second_response = client.post(
        "/api/admin/articles",
        json={**payload, "title": "Second"},
    )
    assert second_response.status_code == 409
    assert second_response.json()["detail"] == "Slug already exists"



def test_malformed_session_cookie_returns_unauthorized(client: TestClient) -> None:
    import base64

    token = base64.urlsafe_b64encode(b"admin:not-a-timestamp:deadbeef").decode()
    response = client.get("/api/admin/auth/session", cookies={"blog_session": token})

    assert response.status_code == 401


def test_article_can_be_deleted_and_markdown_file_removed(client: TestClient) -> None:
    login(client)
    create_response = client.post(
        "/api/admin/articles",
        json={
            "title": "Delete Me",
            "slug": "delete-me",
            "summary": "temporary",
            "coverImage": "",
            "categorySlug": "ai",
            "tagSlugs": [],
            "status": "published",
            "markdown": "# remove",
        },
    )
    assert create_response.status_code == 201
    article_id = create_response.json()["id"]
    markdown_path = Path(os.environ["BLOG_CONTENT_DIR"]) / "delete-me.md"
    assert markdown_path.exists()

    delete_response = client.delete(f"/api/admin/articles/{article_id}")
    assert delete_response.status_code == 204
    assert not markdown_path.exists()
    assert client.get("/api/public/articles/delete-me").status_code == 404


def test_media_library_lists_and_deletes_only_unused_media(client: TestClient) -> None:
    login(client)

    unused_upload = client.post(
        "/api/admin/media/upload",
        files={"file": ("unused.png", b"fake image", "image/png")},
    )
    assert unused_upload.status_code == 200
    unused_file = unused_upload.json()["fileName"]

    media_response = client.get("/api/admin/media")
    assert media_response.status_code == 200
    unused_item = next(item for item in media_response.json()["items"] if item["fileName"] == unused_file)
    assert unused_item["used"] is False
    assert unused_item["markdown"].startswith("![")

    delete_unused = client.delete(f"/api/admin/media/{unused_file}")
    assert delete_unused.status_code == 204

    used_upload = client.post(
        "/api/admin/media/upload",
        files={"file": ("used.png", b"fake image", "image/png")},
    )
    assert used_upload.status_code == 200
    used_file = used_upload.json()["fileName"]
    create_response = client.post(
        "/api/admin/articles",
        json={
            "title": "Media Used",
            "slug": "media-used",
            "summary": "",
            "coverImage": "",
            "categorySlug": "ai",
            "tagSlugs": [],
            "status": "draft",
            "markdown": used_upload.json()["markdown"],
        },
    )
    assert create_response.status_code == 201

    used_item = next(item for item in client.get("/api/admin/media").json()["items"] if item["fileName"] == used_file)
    assert used_item["used"] is True

    delete_used = client.delete(f"/api/admin/media/{used_file}")
    assert delete_used.status_code == 409
    assert delete_used.json()["detail"] == "Media is used by content"


def test_upload_rejects_unsupported_file_type(client: TestClient) -> None:
    login(client)
    response = client.post(
        "/api/admin/media/upload",
        files={"file": ("payload.exe", b"not media", "application/octet-stream")},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unsupported media type"


def test_tags_can_be_managed_from_admin(client: TestClient) -> None:
    login(client)

    create_response = client.post("/api/admin/tags", json={"name": "Loose Tag", "slug": "loose-tag"})
    assert create_response.status_code == 201
    tag = create_response.json()
    assert tag["articleCount"] == 0

    update_response = client.put(
        f"/api/admin/tags/{tag['id']}",
        json={"name": "Loose Renamed", "slug": "loose-renamed"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["slug"] == "loose-renamed"

    delete_response = client.delete(f"/api/admin/tags/{tag['id']}")
    assert delete_response.status_code == 204

    article_response = client.post(
        "/api/admin/articles",
        json={
            "title": "Tag Lock",
            "slug": "tag-lock",
            "summary": "",
            "coverImage": "",
            "categorySlug": "ai",
            "tagSlugs": ["used-tag"],
            "status": "draft",
            "markdown": "# tag",
        },
    )
    assert article_response.status_code == 201
    article_id = article_response.json()["id"]
    used = next(item for item in client.get("/api/admin/tags").json() if item["slug"] == "used-tag")
    assert used["articleCount"] == 1

    rename_response = client.put(
        f"/api/admin/tags/{used['id']}",
        json={"name": "Used Renamed", "slug": "used-renamed"},
    )
    assert rename_response.status_code == 200
    detail_response = client.get(f"/api/admin/articles/{article_id}")
    assert [tag["slug"] for tag in detail_response.json()["tags"]] == ["used-renamed"]

    delete_used_response = client.delete(f"/api/admin/tags/{used['id']}")
    assert delete_used_response.status_code == 409
    assert delete_used_response.json()["detail"] == "Tag is used by articles"


def test_categories_can_be_managed_from_admin(client: TestClient) -> None:
    login(client)

    create_response = client.post(
        "/api/admin/categories",
        json={"name": "Projects", "slug": "projects", "sortOrder": 9, "enabled": True},
    )
    assert create_response.status_code == 201
    category = create_response.json()
    category_id = category["id"]
    assert category["slug"] == "projects"

    public_slugs = [item["slug"] for item in client.get("/api/public/categories").json()]
    assert "projects" in public_slugs

    update_response = client.put(
        f"/api/admin/categories/{category_id}",
        json={"name": "Projects Off", "slug": "projects", "sortOrder": 10, "enabled": False},
    )
    assert update_response.status_code == 200
    assert update_response.json()["enabled"] is False

    public_slugs = [item["slug"] for item in client.get("/api/public/categories").json()]
    assert "projects" not in public_slugs

    delete_response = client.delete(f"/api/admin/categories/{category_id}")
    assert delete_response.status_code == 204


def test_parent_category_filter_includes_child_category_articles(client: TestClient) -> None:
    login(client)

    parent_response = client.post(
        "/api/admin/categories",
        json={"name": "Tech Root", "slug": "tech-root", "sortOrder": 20, "enabled": True},
    )
    assert parent_response.status_code == 201
    parent = parent_response.json()

    child_response = client.post(
        "/api/admin/categories",
        json={
            "name": "Frontend",
            "slug": "frontend",
            "parentId": parent["id"],
            "sortOrder": 1,
            "enabled": True,
        },
    )
    assert child_response.status_code == 201
    child = child_response.json()
    assert child["parentId"] == parent["id"]

    tree = client.get("/api/public/categories").json()
    tech_root = next(item for item in tree if item["slug"] == "tech-root")
    assert [item["slug"] for item in tech_root["children"]] == ["frontend"]

    article_response = client.post(
        "/api/admin/articles",
        json={
            "title": "Child Category Article",
            "slug": "child-category-article",
            "summary": "",
            "coverImage": "",
            "categorySlug": "frontend",
            "tagSlugs": [],
            "status": "published",
            "markdown": "# child",
        },
    )
    assert article_response.status_code == 201

    public_parent_filter = client.get("/api/public/articles?category=tech-root")
    assert public_parent_filter.status_code == 200
    assert [item["slug"] for item in public_parent_filter.json()["items"]] == ["child-category-article"]

    cycle_response = client.put(
        f"/api/admin/categories/{parent['id']}",
        json={
            "name": "Tech Root",
            "slug": "tech-root",
            "parentId": child["id"],
            "sortOrder": 20,
            "enabled": True,
        },
    )
    assert cycle_response.status_code == 400

    delete_parent_response = client.delete(f"/api/admin/categories/{parent['id']}")
    assert delete_parent_response.status_code == 409
    assert delete_parent_response.json()["detail"] == "Category has child categories"


def test_used_category_cannot_be_deleted(client: TestClient) -> None:
    login(client)
    create_response = client.post(
        "/api/admin/articles",
        json={
            "title": "Category Lock",
            "slug": "category-lock",
            "summary": "",
            "coverImage": "",
            "categorySlug": "ai",
            "tagSlugs": [],
            "status": "draft",
            "markdown": "# locked",
        },
    )
    assert create_response.status_code == 201
    categories = client.get("/api/admin/categories").json()
    ai = next(item for item in categories if item["slug"] == "ai")

    delete_response = client.delete(f"/api/admin/categories/{ai['id']}")
    assert delete_response.status_code == 409
    assert delete_response.json()["detail"] == "Category is used by articles"
