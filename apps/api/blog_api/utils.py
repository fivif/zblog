from __future__ import annotations

import re
import unicodedata
from pathlib import Path


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^\w\s-]", "", normalized.lower())
    normalized = re.sub(r"[-\s]+", "-", normalized).strip("-_")
    return normalized or "item"


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def normalize_multiline_text(value: str) -> str:
    if "\\n" in value and "\n" not in value:
        return value.replace("\\r\\n", "\n").replace("\\n", "\n")
    return value
