"""Train and evaluate three traditional Thai sentiment classifiers."""

import argparse
import contextlib
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

from preprocessing import LABELS, clean_thai_text, normalize_text, read_csv_rows, tokenize_thai_text

ROOT = Path(__file__).resolve().parent
DATASET_PATH = ROOT / "data" / "dataset.csv"
MODEL_PATH = ROOT / "models" / "sentiment_model.pkl"
EVALUATION_PATH = ROOT / "models" / "evaluation.json"
DATASET_SOURCE = "Wisesight Sentiment Corpus v1.1 (CC0 1.0)"
SEED = 42


def load_training_data(data):
    rows = read_csv_rows(data, ("text", "label"))
    observed = {}
    duplicates = 0
    for number, (original, label) in enumerate(rows, start=2):
        text = normalize_text(original)
        label = label.strip().lower()
        if not text:
            raise ValueError(f"ข้อมูลฝึกแถวที่ {number} ต้องมีข้อความในคอลัมน์ text")
        if label not in LABELS:
            raise ValueError(
                f"ป้ายกำกับแถวที่ {number} ต้องเป็น positive, negative หรือ neutral"
            )
        if text in observed:
            if observed[text] != label:
                raise ValueError(f"ข้อความเดียวกันมีป้ายกำกับขัดแย้งกันที่แถว {number}")
            duplicates += 1
        else:
            observed[text] = label

    texts, labels = list(observed), list(observed.values())
    if set(labels) != set(LABELS):
        raise ValueError("ชุดข้อมูลฝึกต้องมีป้ายกำกับครบทั้งสามประเภท")
    return texts, labels, duplicates


def build_pipeline(classifier):
    return Pipeline([
        ("tfidf", TfidfVectorizer(
            preprocessor=clean_thai_text,
            tokenizer=tokenize_thai_text,
            token_pattern=None,
            ngram_range=(1, 2),
            lowercase=False,
            sublinear_tf=True,
        )),
        ("classifier", classifier),
    ])


def build_naive_bayes_pipeline():
    classifier = MultinomialNB(alpha=0.5)
    return build_pipeline(classifier)


def build_logistic_regression_pipeline():
    classifier = LogisticRegression(C=3.0, max_iter=800, solver="saga", random_state=SEED)
    return build_pipeline(classifier)


def build_linear_svm_pipeline():
    classifier = LinearSVC(C=1.0, dual="auto", max_iter=5000, random_state=SEED)
    return build_pipeline(classifier)


def compare_models(texts, labels, fold_count):
    candidates = [
        ("Multinomial Naive Bayes", build_naive_bayes_pipeline()),
        ("Logistic Regression", build_logistic_regression_pipeline()),
        ("Linear SVM", build_linear_svm_pipeline()),
    ]
    splitter = StratifiedKFold(n_splits=fold_count, shuffle=True, random_state=SEED)
    folds = list(splitter.split(texts, labels))
    scores = []
    for name, pipeline in candidates:
        values = cross_val_score(
            pipeline, texts, labels, cv=folds, scoring="f1_macro", error_score="raise"
        )
        scores.append({
            "model": name,
            "mean_macro_f1": float(values.mean()),
            "std_macro_f1": float(values.std()),
        })
    return candidates, scores


def evaluate_model(pipeline, test_texts, test_labels):
    predicted = pipeline.predict(test_texts)
    precision, recall, f1, support = precision_recall_fscore_support(
        test_labels, predicted, labels=LABELS, zero_division=0
    )
    metrics = {
        "accuracy": float(accuracy_score(test_labels, predicted)),
        "macro_precision": float(precision.mean()),
        "macro_recall": float(recall.mean()),
        "macro_f1": float(f1.mean()),
    }
    per_class = {
        label: {
            "precision": float(precision[index]),
            "recall": float(recall[index]),
            "f1": float(f1[index]),
            "support": int(support[index]),
        }
        for index, label in enumerate(LABELS)
    }
    return metrics, per_class, confusion_matrix(test_labels, predicted, labels=LABELS).tolist()


def train_and_save(data=None, dataset_source=DATASET_SOURCE):
    texts, labels, duplicates = load_training_data(
        DATASET_PATH.read_bytes() if data is None else data
    )
    try:
        train_texts, test_texts, train_labels, test_labels = train_test_split(
            texts, labels, test_size=0.2, random_state=SEED, stratify=labels
        )
    except ValueError as exc:
        raise ValueError("ข้อมูลน้อยเกินไปสำหรับการแบ่งฝึกและทดสอบแบบ 80/20") from exc
    if any(set(split) != set(LABELS) for split in (train_labels, test_labels)):
        raise ValueError("เพิ่มตัวอย่างในคลาสที่มีน้อย เพื่อให้ทั้งชุดฝึกและชุดทดสอบครบสามคลาส")
    fold_count = min(5, *(train_labels.count(label) for label in LABELS))
    if fold_count < 2:
        raise ValueError("แต่ละคลาสในชุดฝึกต้องมีอย่างน้อย 2 รายการสำหรับ Cross-validation")

    try:
        candidates, scores = compare_models(train_texts, train_labels, fold_count)
        winner_index = max(range(len(scores)), key=lambda index: scores[index]["mean_macro_f1"])
        model_name, pipeline = candidates[winner_index]
        pipeline.fit(train_texts, train_labels)
        metrics, per_class, matrix = evaluate_model(pipeline, test_texts, test_labels)
    except ValueError as exc:
        raise ValueError("ฝึกโมเดลไม่ได้ กรุณาใช้ CSV ที่มีข้อความและตัวอย่างหลากหลายในทุกคลาส") from exc

    report = {
        "dataset_source": dataset_source,
        "evaluation_scope": "คะแนนจากชุดทดสอบที่กันไว้ในชุดข้อมูลฝึกนี้",
        "class_counts": {label: labels.count(label) for label in LABELS},
        "duplicates_removed": duplicates,
        "split_sizes": {"train": len(train_texts), "test": len(test_texts)},
        "seed": SEED,
        "fold_count": fold_count,
        "cv_comparison": scores,
        "selected_model": model_name,
        "held_out": metrics,
        "per_class": per_class,
        "label_order": list(LABELS),
        "confusion_matrix": matrix,
    }
    pipeline.training_report_ = report
    save_artifacts(pipeline, report)
    return report


@contextlib.contextmanager
def artifact_write_lock(directory):
    """Keep CLI and Streamlit publishers from replacing each other's files."""
    with (directory / ".train.lock").open("a+b") as handle:
        try:
            if os.name == "nt":
                import msvcrt

                handle.seek(0)
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl

                fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            raise ValueError("กำลังบันทึกโมเดลจากอีกหน้าต่าง กรุณาลองใหม่") from exc
        # The operating system releases the lock when the handle closes.
        yield


def save_artifacts(pipeline, report):
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    with artifact_write_lock(MODEL_PATH.parent):
        with TemporaryDirectory(dir=MODEL_PATH.parent) as staging:
            staging = Path(staging)
            staged_model = staging / MODEL_PATH.name
            staged_report = staging / EVALUATION_PATH.name
            joblib.dump(pipeline, staged_model, compress=3)
            staged_report.write_text(
                json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
            prior_report = EVALUATION_PATH.read_bytes() if EVALUATION_PATH.exists() else None
            backup = staging / "prior-report.json"
            if prior_report is not None:
                backup.write_bytes(prior_report)
            os.replace(staged_report, EVALUATION_PATH)
            try:
                os.replace(staged_model, MODEL_PATH)
            except OSError:
                if prior_report is None:
                    EVALUATION_PATH.unlink()
                else:
                    os.replace(backup, EVALUATION_PATH)
                raise


def main():
    parser = argparse.ArgumentParser(description="ฝึกโมเดลจำแนกความรู้สึกภาษาไทย")
    parser.add_argument("--dataset", type=Path, help="ไฟล์ CSV สำหรับฝึกที่มีคอลัมน์ text,label")
    args = parser.parse_args()
    try:
        report = (
            train_and_save(args.dataset.read_bytes(), f"CSV สำหรับฝึก · {args.dataset.name}")
            if args.dataset else train_and_save()
        )
    except (OSError, ValueError) as exc:
        parser.exit(1, f"ฝึกหรือบันทึกโมเดลไม่สำเร็จ: {exc}\n")
    print(f'โมเดลที่เลือก: {report["selected_model"]}')
    for entry in report["cv_comparison"]:
        print(f'{entry["model"]}: CV Macro F1 {entry["mean_macro_f1"]:.4f} ± {entry["std_macro_f1"]:.4f}')
    for name, score in report["held_out"].items():
        print(f"{name}: {score:.4f}")


if __name__ == "__main__":
    main()
