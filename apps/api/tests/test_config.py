from __future__ import annotations

import os
from pathlib import Path

from blog_api.config import load_env_file


def test_load_env_file_sets_missing_values_only(tmp_path: Path, monkeypatch) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text(
        "BLOG_ADMIN_USERNAME=writer\nBLOG_ADMIN_PASSWORD=secret\n",
        encoding="utf-8",
    )

    monkeypatch.delenv("BLOG_ADMIN_USERNAME", raising=False)
    monkeypatch.setenv("BLOG_ADMIN_PASSWORD", "existing-password")

    load_env_file(env_file)

    assert os.getenv("BLOG_ADMIN_USERNAME") == "writer"
    assert os.getenv("BLOG_ADMIN_PASSWORD") == "existing-password"
