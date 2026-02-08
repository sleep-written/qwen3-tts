from __future__ import annotations
from datetime import datetime, timezone

def iso_utc_now_ms() -> str:
    # 2026-02-07T23:13:17.050Z
    dt = datetime.now(timezone.utc)
    s = dt.isoformat(timespec="milliseconds")
    return s.replace("+00:00", "Z")