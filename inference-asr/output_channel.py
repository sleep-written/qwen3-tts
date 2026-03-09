import sys
from json import dumps
from typing import Any, Optional


class OutputChannel:
    def __init__(self) -> None:
        self._stdout = sys.stdout
        sys.stdout = _Interceptor('stdout', self)  # type: ignore[assignment]
        sys.stderr = _Interceptor('stderr', self)  # type: ignore[assignment]

    def emit(self, event: str, message: str, payload: Optional[Any] = None) -> None:
        obj: dict = {'event': event, 'message': message}
        if payload is not None:
            obj['payload'] = payload
        print(dumps(obj, ensure_ascii=False), file=self._stdout, flush=True)


class _Interceptor:
    def __init__(self, event: str, emitter: OutputChannel) -> None:
        self._event = event
        self._emitter = emitter
        self._buf = ''

    def write(self, text: str) -> int:
        self._buf += text
        while '\n' in self._buf:
            line, self._buf = self._buf.split('\n', 1)
            stripped = line.rstrip('\r')
            if stripped:
                self._emitter.emit(self._event, stripped)
        return len(text)

    def flush(self) -> None:
        if self._buf.strip():
            self._emitter.emit(self._event, self._buf.strip())
            self._buf = ''

    def isatty(self) -> bool:
        return False

    def fileno(self) -> int:
        raise OSError('intercepted stream has no fileno')
