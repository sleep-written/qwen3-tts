import os
import threading

class FDInterceptor:
    def __init__(self, fd: int, callback):
        self.fd = fd
        self.callback = callback

        self._old_fd = os.dup(fd)
        self._pipe_r, self._pipe_w = os.pipe()

        os.dup2(self._pipe_w, fd)

        self._thread = threading.Thread(target=self._reader, daemon=True)
        self._thread.start()

    def _reader(self):
        with os.fdopen(self._pipe_r, "r", errors="replace") as f:
            for line in f:
                line = line.rstrip()
                if line:
                    self.callback(line)

    def close(self):
        os.dup2(self._old_fd, self.fd)
        os.close(self._old_fd)
        os.close(self._pipe_w)