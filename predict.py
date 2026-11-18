"""Local model loading, ordered batch inference, and CSV output."""

import csv
import io

import joblib

from preprocessing import LABELS, normalize_text, read_csv_rows
from train import MODEL_PATH

BATCH_SIZE = 16


def parse_comments_csv(data):
    rows = read_csv_rows(data, ("comment_text",))
    comments = [original for (original,) in rows if normalize_text(original)]
    if not comments:
        raise ValueError("ไม่พบข้อความในคอลัมน์ comment_text กรุณาเพิ่มความคิดเห็นในไฟล์")
    return comments, len(rows) - len(comments)


def load_model():
    try:
        pipeline = joblib.load(MODEL_PATH)
        if set(pipeline.classes_) != set(LABELS):
            raise ValueError("unexpected labels")
        report = pipeline.training_report_
        if not report.get("selected_model"):
            raise ValueError("missing training report")
    except FileNotFoundError as exc:
        raise ValueError("ยังไม่มีไฟล์โมเดล กรุณาเปิดเมนูฝึกโมเดลแล้วกดเริ่มฝึก") from exc
    except Exception as exc:
        raise ValueError("เปิดไฟล์โมเดลไม่ได้ กรุณาฝึกโมเดลใหม่ในเมนูฝึกโมเดล") from exc
    return pipeline


def prepare_batches(comments):
    return [comments[start:start + BATCH_SIZE] for start in range(0, len(comments), BATCH_SIZE)]


def predict_batches(pipeline, batches, on_progress=None):
    labels = []
    total = sum(map(len, batches))
    for batch in batches:
        labels.extend(pipeline.predict(batch).tolist())
        if on_progress:
            on_progress(len(labels), total)
    return labels


def export_predictions(comments, labels):
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(("comment_text", "predicted_sentiment"))
    writer.writerows(zip(comments, labels, strict=True))
    return output.getvalue().encode("utf-8-sig")
