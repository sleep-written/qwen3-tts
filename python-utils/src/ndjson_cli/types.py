from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Literal, Optional

EventType = Literal["standard", "stdout", "stderr"]

@dataclass(frozen=True)
class CLIJSON:
    type: EventType
    date: str            # ISO 8601 con Z, parseable por JS
    message: str
    payload: Optional[Any] = None
