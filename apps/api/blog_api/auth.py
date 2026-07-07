from __future__ import annotations

import base64
import hashlib
import hmac
import time

from fastapi import Depends, HTTPException, Request, status

from .config import Settings


COOKIE_NAME = "blog_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 7


def create_session_token(username: str, settings: Settings) -> str:
    issued_at = str(int(time.time()))
    payload = f"{username}:{issued_at}"
    digest = hmac.new(
        settings.secret_key.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}:{digest}".encode("utf-8")).decode("utf-8")


def verify_session_token(token: str, settings: Settings) -> str | None:
    try:
        decoded = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
        username, issued_at, digest = decoded.split(":")
    except Exception:
        return None

    try:
        issued_timestamp = int(issued_at)
    except ValueError:
        return None

    payload = f"{username}:{issued_at}"
    expected = hmac.new(
        settings.secret_key.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    token_age = int(time.time()) - issued_timestamp
    if token_age < 0 or token_age > SESSION_MAX_AGE:
        return None
    if not hmac.compare_digest(digest, expected):
        return None
    return username


def get_settings_from_request(request: Request) -> Settings:
    return request.app.state.settings


def require_admin(
    request: Request,
    settings: Settings = Depends(get_settings_from_request),
) -> str:
    token = request.cookies.get(COOKIE_NAME)
    username = verify_session_token(token, settings) if token else None
    if username != settings.admin_username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="请先登录",
        )
    return username

