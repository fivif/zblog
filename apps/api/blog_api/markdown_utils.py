from __future__ import annotations

from html import escape
from itertools import count
from typing import Any

import bleach
from markdown_it import MarkdownIt
from pygments import highlight
from pygments.formatters import HtmlFormatter
from pygments.lexers import TextLexer, get_lexer_by_name
from pygments.util import ClassNotFound

from .utils import normalize_multiline_text


CODE_COUNTER = count(1)
FORMATTER = HtmlFormatter(nowrap=True)

ALLOWED_TAGS = set(bleach.sanitizer.ALLOWED_TAGS) | {
    "p",
    "pre",
    "code",
    "div",
    "span",
    "button",
    "img",
    "iframe",
    "video",
    "source",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
}


def allow_attributes(tag: str, name: str, value: str) -> bool:
    if name.startswith("data-"):
        return True
    allowed = {
        "*": {"class", "id"},
        "a": {"href", "title", "target", "rel"},
        "img": {"src", "alt", "title", "loading"},
        "iframe": {
            "src",
            "title",
            "width",
            "height",
            "allow",
            "allowfullscreen",
            "frameborder",
            "loading",
            "referrerpolicy",
        },
        "video": {"src", "controls", "poster"},
        "source": {"src", "type"},
        "button": {"type", "aria-label"},
    }
    return name in allowed.get("*", set()) or name in allowed.get(tag, set())


def _build_renderer() -> MarkdownIt:
    renderer = MarkdownIt(
        "commonmark",
        {
            "html": True,
            "linkify": True,
            "typographer": True,
        },
    ).enable("table")

    original_fence = renderer.renderer.rules.get("fence")

    def custom_fence(tokens: list[Any], idx: int, options: dict[str, Any], env: dict[str, Any]) -> str:
        token = tokens[idx]
        info = (token.info or "").strip()
        language = info.split()[0] if info else "text"
        try:
            lexer = get_lexer_by_name(language)
        except ClassNotFound:
            lexer = TextLexer()
            language = "text"
        highlighted = highlight(token.content, lexer, FORMATTER)
        block_id = f"code-block-{next(CODE_COUNTER)}"
        return (
            '<div class="code-block-shell">'
            f'<div class="code-block-toolbar"><span class="code-language">{escape(language)}</span>'
            f'<button type="button" class="copy-code-button" data-code-target="{block_id}" aria-label="复制代码">复制</button>'
            "</div>"
            f'<pre class="code-block"><code id="{block_id}" class="language-{escape(language)}">{highlighted}</code></pre>'
            "</div>"
        )

    renderer.renderer.rules["fence"] = custom_fence
    if original_fence is None:
        renderer.renderer.rules.setdefault("fence", custom_fence)
    return renderer


MARKDOWN_RENDERER = _build_renderer()


def sanitize_html_fragment(html: str) -> str:
    return bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=allow_attributes,
        protocols=bleach.sanitizer.ALLOWED_PROTOCOLS,
        strip=True,
    )


def render_markdown(markdown: str) -> str:
    rendered = MARKDOWN_RENDERER.render(normalize_multiline_text(markdown))
    return sanitize_html_fragment(rendered)
