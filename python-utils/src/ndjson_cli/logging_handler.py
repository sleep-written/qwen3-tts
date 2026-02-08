from __future__ import annotations
import logging
from typing import Callable

class NDJSONLoggingHandler(logging.Handler):
    def __init__(self, emit_log: Callable[[str], None]) -> None:
        super().__init__()
        self._emit_log = emit_log

    def emit(self, record: logging.LogRecord) -> None:
        try:
            msg = self.format(record)
        except Exception:
            msg = record.getMessage()
        self._emit_log(msg)