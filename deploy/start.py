"""Run Next.js and a single FastAPI worker in the same container."""

import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import threading
import time
from urllib.error import URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent


def main():
    stop = threading.Event()
    for signum in (signal.SIGINT, signal.SIGTERM):
        signal.signal(signum, lambda *_: stop.set())

    web = ROOT / "frontend"
    if not (web / "server.js").exists():
        web = web / ".next" / "standalone"
    if not (web / "server.js").exists():
        raise RuntimeError("Build the frontend with npm run build before starting the deployment.")
    node = shutil.which("node")
    if not node:
        raise RuntimeError("Node.js is required to run the frontend.")

    env = {**os.environ, "HOSTNAME": "0.0.0.0", "PORT": os.environ.get("PORT", "10000")}
    port = int(env["PORT"])
    if not 1 <= port <= 65535 or port == 8000:
        raise RuntimeError("PORT must be a valid web port other than the internal API port 8000.")

    children = []
    try:
        api = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "api:app", "--host", "127.0.0.1", "--port", "8000", "--workers", "1"],
            cwd=ROOT, env=env,
        )
        children.append(api)
        deadline = time.monotonic() + 60
        while not stop.is_set():
            if api.poll() is not None:
                raise RuntimeError("FastAPI exited during startup.")
            try:
                with urlopen("http://127.0.0.1:8000/health", timeout=2) as response:
                    if json.load(response).get("ok") is True:
                        break
            except (URLError, TimeoutError, ConnectionError):
                pass
            if time.monotonic() >= deadline:
                raise RuntimeError("FastAPI did not become healthy within 60 seconds.")
            stop.wait(0.25)

        if stop.is_set():
            return 0
        children.append(subprocess.Popen([node, "server.js"], cwd=web, env=env))
        while not stop.wait(0.5):
            for child in children:
                if child.poll() is not None:
                    raise RuntimeError(f"An application process exited with status {child.returncode}.")
        return 0
    finally:
        for child in children:
            if child.poll() is None:
                child.terminate()
        for child in children:
            try:
                child.wait(timeout=10)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


if __name__ == "__main__":
    raise SystemExit(main())
