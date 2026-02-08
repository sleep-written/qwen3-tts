from __future__ import annotations
import io
import sys
import threading
from typing import Callable

class StreamInterceptor(io.TextIOBase):
    """
    Intercepta writes a stdout/stderr y emite eventos NDJSON.
    Maneja:
      - '\n' como fin de línea
      - '\r' como "update" (progress), emite evento inmediato
    """
    def __init__(
        self,
        original: io.TextIOBase,
        emit_line: Callable[[str], None],
        *,
        treat_cr_as_event: bool = True,
    ) -> None:
        self._original = original
        self._emit_line = emit_line
        self._treat_cr_as_event = treat_cr_as_event
        self._buf = ""
        self._lock = threading.Lock()

    @property
    def encoding(self) -> str:
        return getattr(self._original, "encoding", "utf-8")

    def write(self, s: str) -> int:
        if not s:
            return 0

        with self._lock:
            for ch in s:
                if ch == "\n":
                    line = self._buf
                    self._buf = ""
                    if line.strip() != "":
                        self._emit_line(line)
                    else:
                        # si es línea vacía, igual la dejamos pasar al original
                        self._emit_line("")
                elif ch == "\r" and self._treat_cr_as_event:
                    # progreso: emitimos buffer actual como evento y reseteamos
                    line = self._buf
                    self._buf = ""
                    if line.strip() != "":
                        self._emit_line(line)
                else:
                    self._buf += ch

        # opcional: no “duplicamos” la salida original para no ensuciar.
        # Si quisieras espejo, escribe también al original aquí.
        return len(s)

    def flush(self) -> None:
        with self._lock:
            if self._buf.strip() != "":
                self._emit_line(self._buf)
            self._buf = ""
        try:
            self._original.flush()
        except Exception:
            pass

def install_warnings_hook(emit_warning: Callable[[str], None]) -> Callable[[], None]:
    import warnings

    old_showwarning = warnings.showwarning

    def showwarning(message, category, filename, lineno, file=None, line=None):
        text = f"{category.__name__}: {message} ({filename}:{lineno})"
        emit_warning(text)

    warnings.showwarning = showwarning

    def uninstall() -> None:
        warnings.showwarning = old_showwarning

    return uninstall

def install_excepthook(emit_error: Callable[[str], None]) -> Callable[[], None]:
    old_hook = sys.excepthook

    def hook(exctype, value, tb):
        emit_error(f"Uncaught {exctype.__name__}: {value}")
        old_hook(exctype, value, tb)

    sys.excepthook = hook

    def uninstall() -> None:
        sys.excepthook = old_hook

    return uninstall