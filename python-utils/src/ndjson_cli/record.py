from __future__ import annotations
from dataclasses import asdict
from typing import Any, Optional

from .types import CLIJSON, EventType
from .timeutil import iso_utc_now_ms
from .encoder import dumps_compact

def make_event(event_type: EventType, message: str, payload: Optional[Any] = None) -> str:
    evt = CLIJSON(type=event_type, date=iso_utc_now_ms(), message=message, payload=payload)
    d = asdict(evt)
    if payload is None:
        d.pop("payload", None)
    return dumps_compact(d)