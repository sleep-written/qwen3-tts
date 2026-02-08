from __future__ import annotations

import io
import os
import sys
import logging

from typing import Any, Optional
from transformers.utils import logging as hf_logging

from .record import make_event
from .fd_intercept import FDInterceptor
from .interceptors import StreamInterceptor, install_warnings_hook, install_excepthook
from .logging_handler import NDJSONLoggingHandler

class CLI:
    """
    Emits NDJSON by stdout (default) or into a file-like.
    And can intercepts stdout/stderr/warnings/logging.
    """
    def __init__(self, out: Optional[io.TextIOBase] = None) -> None:
        os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"
        hf_logging.disable_progress_bar()
        hf_logging.set_verbosity_error()

        self._out = out or sys.__stdout__
        self._installed = False

        self._old_stdout: Optional[io.TextIOBase] = None
        self._old_stderr: Optional[io.TextIOBase] = None
        self._uninstall_excepthook = None
        self._uninstall_warnings = None
        self._stderr_fd = None

        self._log_handler: Optional[logging.Handler] = None
        self._old_root_level: Optional[int] = None

    def _emit(self, line: str) -> None:
        # NDJSON: una línea = un objeto
        self._out.write(line + "\n")
        self._out.flush()

    def send(self, message: str, payload: Optional[Any] = None) -> None:
        self._emit(make_event("standard", message, payload))

    def system(self, message: str, payload: Optional[Any] = None) -> None:
        self._emit(make_event("system", message, payload))

    def enable_intercept(
        self,
        *,
        intercept_stdout: bool = True,
        intercept_stderr: bool = True,
        intercept_warnings: bool = True,
        intercept_logging: bool = True,
        logging_level: int = logging.INFO,
    ) -> None:
        if self._installed:
            return

        if intercept_stdout:
            self._old_stdout = sys.stdout
            sys.stdout = StreamInterceptor(
                self._old_stdout,
                lambda msg: self._emit(make_event("system", msg)),
            )

        if intercept_stderr:
            self._old_stderr = sys.stderr
            sys.stderr = StreamInterceptor(
                self._old_stderr,
                lambda msg: self._emit(make_event("stderr", msg)),
            )

        if intercept_warnings:
            self._uninstall_warnings = install_warnings_hook(
                lambda msg: self._emit(make_event("warning", msg))
            )

        if intercept_logging:
            root = logging.getLogger()
            self._old_root_level = root.level
            root.setLevel(min(root.level, logging_level) if root.level else logging_level)

            h = NDJSONLoggingHandler(lambda msg: self._emit(make_event("log", msg)))
            # formato simple; ajusta si quieres timestamps extra, logger name, etc.
            h.setFormatter(logging.Formatter("%(levelname)s:%(name)s:%(message)s"))
            root.addHandler(h)
            self._log_handler = h

        self._uninstall_excepthook = install_excepthook(
            lambda msg: self._emit(make_event("error", msg))
        )

        self._stderr_fd = FDInterceptor(
            2,
            lambda msg: self._emit(make_event("stderr", msg)),
        )

        self._installed = True

    def disable_intercept(self) -> None:
        if not self._installed:
            return

        if self._old_stdout is not None:
            try:
                sys.stdout.flush()
            except Exception:
                pass
            sys.stdout = self._old_stdout
            self._old_stdout = None

        if self._old_stderr is not None:
            try:
                sys.stderr.flush()
            except Exception:
                pass
            sys.stderr = self._old_stderr
            self._old_stderr = None

        if self._uninstall_warnings is not None:
            try:
                self._uninstall_warnings()
            except Exception:
                pass
            self._uninstall_warnings = None

        if self._uninstall_excepthook is not None:
            try:
                self._uninstall_excepthook()
            except Exception:
                pass
            self._uninstall_excepthook = None

        if self._log_handler is not None:
            root = logging.getLogger()
            try:
                root.removeHandler(self._log_handler)
            except Exception:
                pass
            self._log_handler = None

        if self._old_root_level is not None:
            logging.getLogger().setLevel(self._old_root_level)
            self._old_root_level = None

        if self._stderr_fd:
            self._stderr_fd.close()
            self._stderr_fd = None

        self._installed = False

    def __enter__(self) -> "CLI":
        self.enable_intercept()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.disable_intercept()