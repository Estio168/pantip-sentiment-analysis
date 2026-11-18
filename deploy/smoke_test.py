"""Check the public web URL, saved model, analysis jobs, and CSV export."""

import csv
import io
import json
import sys
import time
from urllib.error import URLError
from urllib.request import Request, urlopen
from uuid import uuid4

base = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8080").rstrip("/")


def request(path, data=None):
    headers = {"x-pantip-console": "local"}
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    with urlopen(Request(base + path, data=body, headers=headers), timeout=20) as response:
        return response.read()


for attempt in range(60):
    try:
        assert json.loads(request("/api/health"))["ok"] is True
        break
    except (URLError, TimeoutError, AssertionError):
        if attempt == 59:
            raise
        time.sleep(2)

assert b"<html" in request("/").lower()
report = json.loads(request("/api/model"))
assert report["selected_model"]
source = json.loads(request("/api/sources/demo", {}))
assert source["total"] == 42
job = json.loads(request("/api/jobs", {"source_id": source["id"], "request_id": str(uuid4())}))
for attempt in range(120):
    progress = json.loads(request("/api/jobs/" + job["id"]))
    if progress["status"] == "error":
        raise RuntimeError(progress["error"])
    if progress["status"] == "complete":
        assert progress["prepared"] == 3 and progress["done"] == source["total"]
        break
    time.sleep(0.5)
else:
    raise RuntimeError("The demo analysis did not finish.")

result = json.loads(request("/api/jobs/" + job["id"] + "/result"))
raw = request("/api/jobs/" + job["id"] + "/csv")
assert raw.startswith(b"\xef\xbb\xbf")
reader = csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
assert reader.fieldnames == ["comment_text", "predicted_sentiment"]
rows = list(reader)
assert len(rows) == 42
assert [row["comment_text"] for row in rows] == result["comments"]
assert [row["predicted_sentiment"] for row in rows] == result["labels"]
print(f"PASS {base} — frontend, API, {result['model']}, 42 predictions, ordered UTF-8 BOM CSV")
