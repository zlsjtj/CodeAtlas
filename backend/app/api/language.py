from __future__ import annotations

from fastapi import Header

from app.schemas.common import ResponseLanguage


def get_response_language(
    x_response_language: str | None = Header(default=None, alias="X-Response-Language"),
) -> ResponseLanguage | None:
    if x_response_language == ResponseLanguage.ZH_CN.value:
        return ResponseLanguage.ZH_CN
    if x_response_language == ResponseLanguage.EN.value:
        return ResponseLanguage.EN
    return None
