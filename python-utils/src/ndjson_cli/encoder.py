from __future__ import annotations
import json
from typing import Any

def dumps_compact(obj: Any) -> str:
    # separators compacta el JSON; ensure_ascii=False mantiene UTF-8 legible
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))