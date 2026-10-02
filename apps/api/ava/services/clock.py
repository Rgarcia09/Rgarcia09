from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from ava.config import get_settings


def office_today() -> date:
    return datetime.now(ZoneInfo(get_settings().office_timezone)).date()
