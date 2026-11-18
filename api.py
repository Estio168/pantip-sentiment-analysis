"""Loopback API for the Pantip Sentiment console. Run with a single worker."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import RLock
from time import monotonic
from uuid import UUID, uuid4

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel

from predict import export_predictions, load_model, parse_comments_csv, predict_batches, prepare_batches
from scraper import fetch_topic
from train import train_and_save

app = FastAPI(title="Pantip Sentiment")
pool = ThreadPoolExecutor(max_workers=2)
lock = RLock()
sources = {}
jobs = {}
DEMO = Path(__file__).parent / "data/pantip_comments.csv"
MAX_UPLOAD = 200 * 1024 * 1024


@app.middleware("http")
async def local_client(request: Request, call_next):
    if request.method == "POST" and request.headers.get("x-pantip-console") != "local":
        return JSONResponse({"detail": "กรุณาส่งคำขอจากหน้าคอนโซล"}, status_code=403)
    return await call_next(request)


@app.exception_handler(ValueError)
async def invalid_input(request, exc):
    return JSONResponse({"detail": str(exc)}, status_code=400)


def read_upload(file):
    data = file.file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise ValueError("ไฟล์ต้องมีขนาดไม่เกิน 200 MB")
    return data


def reserve(store):
    """Expire inactive records and bound memory for this local classroom app."""
    now = monotonic()
    for key, item in list(store.items()):
        if item.get("status") != "running" and now - item["touched"] > 7200:
            del store[key]
    if len(store) >= 128:
        removable = [k for k in store if store[k].get("status") != "running"]
        if not removable:
            raise HTTPException(429, "มีงานอยู่ในคิวจำนวนมาก กรุณาลองอีกครั้ง")
        del store[min(removable, key=lambda k: store[k]["touched"])]


def lookup(store, key):
    item = store.get(str(key))
    if not item:
        raise HTTPException(404, "ข้อมูลหมดอายุ กรุณาเลือกแหล่งข้อมูลใหม่")
    item["touched"] = monotonic()
    return item


def save_source(kind, name, comments, note=""):
    info = dict(id=str(uuid4()), kind=kind, name=name, total=len(comments), note=note, preview=comments[:5])
    with lock:
        reserve(sources)
        sources[info["id"]] = dict(info=info, comments=comments, touched=monotonic())
    return info


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/model")
def model():
    return load_model().training_report_


@app.post("/sources/demo")
def demo():
    comments, _ = parse_comments_csv(DEMO.read_bytes())
    return save_source("ข้อมูลสาธิต", DEMO.name, comments)


@app.post("/sources/csv")
def csv_source(file: UploadFile):
    comments, skipped = parse_comments_csv(read_upload(file))
    return save_source("ไฟล์ CSV", file.filename, comments, f"ข้ามแถวว่าง {skipped:,} แถว" if skipped else "")


class Topic(BaseModel):
    url: str


@app.post("/sources/pantip")
def pantip(topic: Topic):
    title, comments = fetch_topic(topic.url)
    return save_source("กระทู้ Pantip", title or topic.url, comments, "ความคิดเห็นสาธารณะที่อ่านได้ อาจไม่ครบทั้งกระทู้")


class Submission(BaseModel):
    source_id: UUID
    request_id: UUID


def analyze(job, source):
    def update(**values):
        with lock:
            job["progress"].update(values)
    try:
        comments = source["comments"]
        if not comments:
            raise ValueError("ไม่พบความคิดเห็นที่ใช้ได้")
        update(prepared=1)
        pipeline = load_model()
        name = pipeline.training_report_["selected_model"]
        update(prepared=2, model=name)
        batches = prepare_batches(comments)
        update(prepared=3)
        labels = predict_batches(pipeline, batches, lambda done, total: update(done=done))
        result = dict(source=source["info"], model=name, comments=comments, labels=labels)
        with lock:
            job.update(status="complete", result=result, touched=monotonic())
    except Exception as exc:
        with lock:
            job.update(status="error", error=str(exc) if isinstance(exc, ValueError) else "วิเคราะห์ไม่สำเร็จ กรุณาลองอีกครั้ง", touched=monotonic())


@app.post("/jobs")
def start(submission: Submission):
    key = str(submission.request_id)
    with lock:
        if key not in jobs:
            source = lookup(sources, submission.source_id)
            reserve(jobs)
            job = dict(status="running", touched=monotonic(), source_id=submission.source_id,
                       progress=dict(prepared=0, done=0, total=len(source["comments"]), model=""))
            jobs[key] = job
            pool.submit(analyze, job, source)
        elif jobs[key]["source_id"] != submission.source_id:
            raise HTTPException(409, "คำขอนี้ผูกกับข้อมูลอีกชุด")
    return {"id": key}


@app.get("/jobs/{key}")
def progress(key: UUID):
    with lock:
        job = lookup(jobs, key)
        return dict(status=job["status"], error=job.get("error"), **job["progress"])


@app.get("/jobs/{key}/result")
def result(key: UUID):
    with lock:
        job = lookup(jobs, key)
        if job["status"] != "complete":
            raise HTTPException(409, "ผลการวิเคราะห์ยังไม่พร้อม")
        return job["result"]


@app.get("/jobs/{key}/csv")
def download(key: UUID):
    data = result(key)
    return Response(export_predictions(data["comments"], data["labels"]), media_type="text/csv",
                    headers={"Content-Disposition": 'attachment; filename="pantip_predictions.csv"'})


@app.post("/training")
def train(file: UploadFile | None = File(default=None)):
    return train_and_save(read_upload(file), f"CSV · {file.filename}") if file else train_and_save()
