from __future__ import annotations

import io
import os
import sys

from typing import Any, Optional
from transformers.utils import logging as hf_logging

from .record import make_event
from .fd_intercept import FDInterceptor
from .interceptors import StreamInterceptor

class CLI:
    """
    Emits NDJSON by stdout (default) or into a file-like.
    Can intercept stdout/stderr.
    """
    def __init__(self, out: Optional[io.TextIOBase] = None) -> None:
        os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"
        hf_logging.disable_progress_bar()
        hf_logging.set_verbosity_error()

        self._out = out or sys.__stdout__
        self._installed = False

        self._old_stdout: Optional[io.TextIOBase] = None
        self._old_stderr: Optional[io.TextIOBase] = None
        self._stderr_fd = None

    def _emit(self, line: str) -> None:
        # NDJSON: una línea = un objeto
        self._out.write(line + "\n")
        self._out.flush()

    def send(self, message: str, payload: Optional[Any] = None) -> None:
        self._emit(make_event("standard", message, payload))

    def enable_intercept(
        self,
        *,
        intercept_stdout: bool = True,
        intercept_stderr: bool = True,
    ) -> None:
        if self._installed:
            return

        if intercept_stdout:
            self._old_stdout = sys.stdout
            sys.stdout = StreamInterceptor(
                self._old_stdout,
                lambda msg: self._emit(make_event("stdout", msg)),
            )

        if intercept_stderr:
            self._old_stderr = sys.stderr
            sys.stderr = StreamInterceptor(
                self._old_stderr,
                lambda msg: self._emit(make_event("stderr", msg)),
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

        if self._stderr_fd:
            self._stderr_fd.close()
            self._stderr_fd = None

        self._installed = False

    def __enter__(self) -> "CLI":
        self.enable_intercept()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.disable_intercept()
