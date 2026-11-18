"""Pantip Sentiment, a local Streamlit application."""

import base64
from html import escape
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
from matplotlib.figure import Figure
from matplotlib.font_manager import FontProperties
from matplotlib.ticker import MaxNLocator
import pandas as pd
import streamlit as st

from predict import (
    export_predictions, load_model, parse_comments_csv, predict_batches,
    prepare_batches,
)
from preprocessing import LABELS
from scraper import fetch_topic
from train import DATASET_PATH, MODEL_PATH, train_and_save

ROOT = Path(__file__).resolve().parent
DEMO_PATH = ROOT / "data" / "pantip_comments.csv"
ASSETS = ROOT / "assets"
PAGES = ("ภาพรวม", "วิเคราะห์ความคิดเห็น", "ผลการวิเคราะห์", "ฝึกโมเดล")
SENTIMENTS = {"positive": "เชิงบวก", "negative": "เชิงลบ", "neutral": "เป็นกลาง"}
COLORS = {"positive": "#4ed9b5", "negative": "#f38c88", "neutral": "#98acd7"}
FONT_DIR = ASSETS / "fonts"

THEME = """
<style>
:root { --aqua:#65ebe2; --line:#245054; --muted:#a1bcbf; }
.stApp { color:#e0eeee; background:#050c0e; }
[data-testid="stAppViewContainer"] {
  background:linear-gradient(#39707216 1px,transparent 1px),
    linear-gradient(90deg,#39707216 1px,transparent 1px),#050c0e;
  background-size:32px 32px;
}
[data-testid="stMainBlockContainer"] { width:94%; max-width:1700px; padding:1.6rem 0 3rem; }
[data-testid="stHeader"] { display:none; }
.stApp, .stApp :is(h1,h2,h3,p,label,button,input,small,th,td,caption,b,strong,video),
.stApp div, .stApp span:not([data-testid*="Icon"]):not([class*="material"]) {
  font-family:"LINE Seed Sans TH",sans-serif;
}
.stApp h1 { font-size:clamp(1.45rem,2vw,2rem); padding:.3rem 0 .1rem; line-height:1.35; }
.stApp h2,.stApp h3 { font-size:1.14rem; }
.st-key-topbar { background:#061113; border-block:1px solid #357576; padding:.6rem .85rem; }
.brand { display:flex; align-items:center; gap:.65rem; font-weight:700; letter-spacing:.095em; white-space:nowrap; }
.brand i { width:24px; height:24px; border:1px solid var(--aqua); border-radius:50%; position:relative; }
.brand i::before,.brand i::after { content:""; position:absolute; background:var(--aqua); inset:10px 3px; }
.brand i::after { transform:rotate(90deg); }
.brand em { color:var(--aqua); font-style:normal; }
.local-status { color:#a6c5c5; text-align:right; font-size:.82rem; }
.local-status::before {content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--aqua);margin-right:.45rem;}
:is(.st-key-navigation,.st-key-source_picker) [role="radiogroup"] { gap:.45rem; flex-wrap:wrap; }
:is(.st-key-navigation,.st-key-source_picker) [role="radiogroup"] label {
  background:#091b1e; border:1px solid #254552; border-radius:2px;
  padding:.44rem .85rem; margin:0;
}
:is(.st-key-navigation,.st-key-source_picker) [role="radiogroup"] label:has(input:checked) {
  border-color:#52cdd6; background:#103436;
}
:is(.st-key-navigation,.st-key-source_picker) [role="radiogroup"] label > div:first-child { display:none; }
:is(.st-key-navigation,.st-key-source_picker) [role="radiogroup"] label:focus-within { outline:2px solid var(--aqua); }
[class*="st-key-panel_"] {
  border:1px solid var(--line) !important; border-radius:3px !important;
  background: linear-gradient(120deg,#0a2226,#07171a 90%);
}
.stApp [data-testid="stCaptionContainer"], .stApp [data-testid="stCaptionContainer"] p {
  opacity:1; color:#bad1d0;
}
.stApp button[kind="primary"], .stApp button[kind="primary"] p { color:#032125; }
[data-testid="stFileUploaderDropzone"] { gap:.65rem; }
[data-testid="stFileUploaderDropzoneInstructions"] { flex:1 1 0; min-width:0; }
[data-testid="stFileUploaderDropzoneInstructions"] > div > * { display:none; }
[data-testid="stFileUploaderDropzoneInstructions"] > div::after {
  content:"ลากไฟล์ CSV มาที่นี่ · ไม่เกิน 20 MB"; color:var(--muted); font-size:.8rem;
}
[data-testid="stFileUploaderDropzone"] button { font-size:0 !important; }
[data-testid="stFileUploaderDropzone"] button::after { content:"เลือกไฟล์"; font-size:.9rem; }
.section-label {
  color:#a6d8e0; border-bottom:1px solid #2a4b56; padding-bottom:.65rem;
  font-size:.98rem; font-weight:700;
}
.scan, .st-key-scan_player {
  position:relative; overflow:hidden;
  background: radial-gradient(ellipse at center, #103847 0, #070f18 67%);
  border:1px solid #347e89; aspect-ratio: 832 / 560;
}
.scan { display:grid; place-items:center; }
.scan::after, .st-key-scan_player::after {
  content:""; position:absolute; inset:0; pointer-events:none; z-index:1;
  background:
    linear-gradient(var(--aqua),var(--aqua)) 0 0 / 22px 2px,
    linear-gradient(var(--aqua),var(--aqua)) 0 0 / 2px 22px,
    linear-gradient(var(--aqua),var(--aqua)) 100% 0 / 22px 2px,
    linear-gradient(var(--aqua),var(--aqua)) 100% 0 / 2px 22px,
    linear-gradient(var(--aqua),var(--aqua)) 0 100% / 22px 2px,
    linear-gradient(var(--aqua),var(--aqua)) 0 100% / 2px 22px,
    linear-gradient(var(--aqua),var(--aqua)) 100% 100% / 22px 2px,
    linear-gradient(var(--aqua),var(--aqua)) 100% 100% / 2px 22px;
  background-repeat:no-repeat;
}
.scan img { width:100%; height:100%; object-fit:contain; position:absolute; inset:0; }
.st-key-scan_player video { display:block; background:transparent; }
.stMain:has(.st-key-processing_frame) { overflow-anchor:none; }
.stMain:has(.st-key-processing_frame) [data-stale="true"] { display:none; }
.scan-note { color:var(--muted); margin:1rem; text-align:center; }
.source-number { color:var(--aqua); font-size:2.5rem; font-weight:700; line-height:1; }
.sentiment { display:flex; justify-content:space-between; align-items:baseline;
  gap:.5rem; border-bottom:1px solid #254653; padding:.72rem 0;  }
.sentiment b { font-variant-numeric:tabular-nums; white-space:nowrap; }
.comments-table { width:100%; border-collapse:collapse; table-layout:fixed;  }
.comments-table th, .comments-table td {
  text-align:start; vertical-align:top; border-bottom:1px solid #234651; padding:.72rem .55rem;
}
.comments-table th { color:#a6d8e0; font-weight:600; }
.comments-table th:first-child { width:3.2rem; }
.comments-table th:last-child { width:6.4rem; }
.comments-table td:nth-child(2) { white-space:pre-wrap; overflow-wrap:anywhere; }
.comments-table tbody tr:nth-child(even) { background:#15313c40; }
[data-testid="stProgressBar"] > div > div { background:var(--aqua); }

.model-name { color:#e2f8f5; font-size:1.5rem; font-weight:700; }
.section-label::before { content:""; display:inline-block; width:4px; height:.78em; background:var(--aqua); margin-right:.55rem; }
.scan-caption { display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--line); color:#9fbfc1; padding-top:.5rem; font-size:.83rem; }
.meter { display:block; height:4px; background:#15343a; margin:.45rem 0 .75rem; }
.meter i { display:block;height:100%; }
.summary-row { display:flex; align-items:center; justify-content:space-between; gap:.45rem; }
:is(.st-key-hud,.st-key-inputs) [data-testid="stColumn"] > div { height:100%; }
:is(.st-key-hud,.st-key-inputs) [class*="st-key-panel_"] { flex:1; }
.hud-table { overflow:auto; }
.hud-table table { width:100%; border-collapse:collapse; }
.hud-table td,.hud-table th { padding:.5rem; text-align:left; border-bottom:1px solid var(--line); }
.hud-table th {color:#a5d1d1;}
.st-key-navigation label p {font-size:.94rem;}
.stApp button {border-radius:3px;}
@media(max-width: 850px) {
  [data-testid="stMainBlockContainer"] { padding:1rem 0 2rem; }
  :is(.st-key-hud, .st-key-home, .st-key-inputs, .st-key-panel_active, .st-key-panel_held_out, .st-key-train_controls, .st-key-topbar) [data-testid="stHorizontalBlock"] {
    flex-direction:column !important;
  }
  :is(.st-key-hud, .st-key-home, .st-key-inputs, .st-key-panel_active, .st-key-panel_held_out, .st-key-train_controls, .st-key-topbar) [data-testid="stColumn"] {
    width:100% !important; flex: 1 1 auto !important;
  }
}
@media(max-width:850px){.local-status{display:none}:is(.st-key-navigation,.st-key-source_picker) [role="radiogroup"]{gap:.25rem}:is(.st-key-navigation,.st-key-source_picker) [role="radiogroup"] label{padding:.3rem .48rem}.st-key-topbar [data-testid="stHorizontalBlock"]{gap:.5rem}}
</style>
"""


def render_table(frame):
    table = frame.to_html(index=False, border=0, float_format=lambda value: f"{value:.4f}")
    st.html(f'<div class="hud-table">{table}</div>')


def panel_title(title):
    st.html(f'<div class="section-label">{title}</div>')


def source_details(source):
    st.caption(source["type"])
    st.write(source["name"])
    st.html(f'<div class="source-number">{len(source["comments"]):,}</div>')
    st.caption("ความคิดเห็นที่ใช้ได้")
    if source.get("coverage"):
        st.caption(source["coverage"])


@st.cache_data(show_spinner=False)
def media_data_uri(path, mime_type):
    if path.is_file():
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"
    return ""


def render_scan(animated=False):
    poster = media_data_uri(ASSETS / "brain_scan_poster.png", "image/png")
    video = ASSETS / "brain_scan_loop.mp4"
    if animated and video.is_file():
        if poster:
            st.html(
                f'<style>.st-key-scan_player {{background: #070f18 url("{poster}") '
                'center / contain no-repeat;}</style>'
            )
        with st.container(key="scan_player"):
            st.video(str(video), autoplay=True, loop=True, muted=True)
        return
    content = '<span class="scan-note">ภาพประกอบการสแกน</span>'
    if poster:
        content = f'<img src="{poster}" alt="ภาพสมองโฮโลแกรมสีอควา">'
    st.html(f'<div class="scan">{content}</div>')


def render_home_page():
    st.title("ภาพรวม")
    source = st.session_state.get("source")
    result = st.session_state.get("result")
    report = None
    if model_signature():
        try:
            report = active_report(model_signature())
        except ValueError as exc:
            st.warning(str(exc))
    with st.container(key="home"):
        left, center, right = st.columns([1, 2.2, 1], gap="small")
        with left:
            with st.container(border=True, key="panel_source"):
                panel_title("แหล่งความคิดเห็น")
                if source:
                    source_details(source)
                else:
                    st.write("ยังไม่ได้เลือกแหล่งข้อมูล")
                    st.caption("เลือกกระทู้ Pantip อัปโหลดไฟล์ CSV หรือลองชุดข้อมูลสาธิต")
                st.button("เลือกแหล่งข้อมูล", on_click=go_to, args=(PAGES[1],))
            if report:
                with st.container(border=True, key="panel_corpus"):
                    panel_title("ชุดข้อมูลฝึก")
                    st.caption(report["dataset_source"])
                    counts = report["class_counts"]
                    total = sum(counts.values())
                    for label in LABELS:
                        count = counts[label]
                        st.html(
                            f'<div class="summary-row">{SENTIMENTS[label]}<b>{count:,}</b></div>'
                            f'<span class="meter"><i style="background:{COLORS[label]};width:{count/total:.2%}"></i></span>'
                        )
        with center, st.container(border=True, key="panel_scan"):
            panel_title("จอประมวลผลความคิดเห็น")
            render_scan()
            st.html('<div class="scan-caption"><span>ภาพจำลองสมอง</span><span>พร้อมรับข้อมูล</span></div>')
        with right:
            with st.container(border=True, key="panel_classifier"):
                panel_title("ตัวจำแนกที่ใช้งาน")
                if report:
                    st.html(f'<div class="model-name">{escape(report["selected_model"])}</div>')
                    st.caption("คะแนนจากชุดทดสอบ")
                    for name, metric in [("Accuracy", "accuracy"), ("Macro F1", "macro_f1")]:
                        st.html(f'<div class="summary-row">{name}<b>{report["held_out"][metric]:.4f}</b></div>')
                else:
                    st.caption("ยังไม่มีโมเดล กรุณาเปิดเมนูฝึกโมเดล")
            with st.container(border=True, key="panel_latest"):
                panel_title("ผลการวิเคราะห์ล่าสุด")
                if result:
                    st.caption(result["source"]["name"])
                    sentiment_totals(result["labels"])
                    st.button("เปิดผลการวิเคราะห์", on_click=go_to, args=(PAGES[2],))
                else:
                    st.write("ยังไม่มีผลการวิเคราะห์")
                    st.caption("เมื่อวิเคราะห์เสร็จ สัดส่วนความรู้สึกทั้งสามประเภทจะแสดงที่นี่")
                st.button("เริ่มวิเคราะห์", type="primary", width="stretch", on_click=go_to, args=(PAGES[1],))



def accept_csv(data, name, source_type):
    comments, skipped = parse_comments_csv(data)
    coverage = f"ข้ามแถวว่าง {skipped:,} แถว" if skipped else ""
    return {"type": source_type, "name": name, "comments": comments, "coverage": coverage}


def render_analyzer_page():
    st.title("วิเคราะห์ความคิดเห็น")
    new_source = None
    with st.container(border=True, key="panel_inputs"):
        panel_title("แหล่งข้อมูล")
        source_type = st.radio(
            "เลือกแหล่งข้อมูล", ["กระทู้ Pantip", "ไฟล์ CSV", "ข้อมูลสาธิต"],
            key="source_picker", horizontal=True, label_visibility="collapsed",
        )
        if source_type == "กระทู้ Pantip":
            st.caption("ใช้กระทู้สาธารณะที่ได้รับอนุญาตให้ดึงข้อมูล")
            url = st.text_input("ลิงก์กระทู้", placeholder="https://pantip.com/topic/12345678")
            if st.button("ดึงความคิดเห็น"):
                try:
                    with st.spinner("กำลังอ่านความคิดเห็นจาก Pantip"):
                        title, comments = fetch_topic(url)
                    new_source = {
                        "type": "กระทู้ Pantip",
                        "name": title or url,
                        "comments": comments,
                        "coverage": "แสดงความคิดเห็นสาธารณะที่อ่านได้ จำนวนอาจไม่ครบทั้งกระทู้",
                    }
                except ValueError as exc:
                    st.error(str(exc))
        elif source_type == "ไฟล์ CSV":
            uploaded = st.file_uploader("ไฟล์ความคิดเห็น · comment_text", type=["csv"], key="comments_upload")
            if st.button("ใช้ไฟล์ CSV", disabled=uploaded is None):
                try:
                    new_source = accept_csv(uploaded.getvalue(), uploaded.name, "CSV ที่อัปโหลด")
                except ValueError as exc:
                    st.error(str(exc))
        else:
            st.caption("ตัวอย่างความคิดเห็นภาษาไทยสำหรับทดลองวิเคราะห์")
            if st.button("โหลดข้อมูลสาธิต"):
                try:
                    new_source = accept_csv(DEMO_PATH.read_bytes(), DEMO_PATH.name, "ข้อมูลสาธิต")
                except (OSError, ValueError) as exc:
                    st.error(f"โหลดชุดข้อมูลสาธิตไม่ได้ กรุณาตรวจสอบไฟล์ data/pantip_comments.csv · {exc}")
    if new_source is not None:
        st.session_state.source = new_source
        st.session_state.pop("result", None)
        st.session_state.pop("processing_error", None)

    error = st.session_state.get("processing_error")
    if error:
        st.error(error)
    source = st.session_state.get("source")
    with st.container(border=True, key="panel_active"):
        panel_title("ข้อมูลที่เลือก")
        details, preview = st.columns([1, 2.1], gap="medium")
        with details:
            if source:
                source_details(source)
            else:
                st.caption("ยังไม่มีความคิดเห็น กรุณาเลือกแหล่งข้อมูลด้านบน")
            if st.button("วิเคราะห์ความคิดเห็น", type="primary", disabled=not source):
                st.session_state.run_pending = True
                st.session_state.pop("processing_error", None)
                st.rerun()
        with preview:
            if source:
                render_table(
                    pd.DataFrame({"ตัวอย่างความคิดเห็น": source["comments"][:5]}),
                )


def model_signature():
    try:
        details = MODEL_PATH.stat()
        return details.st_mtime_ns, details.st_size
    except OSError:
        return None


def render_processing_page():
    if not st.session_state.get("processing_active"):
        return
    st.title("กำลังวิเคราะห์")
    source = st.session_state.get("source")
    comments = source["comments"] if source else []
    with st.container(key="hud"):
        left, center, right = st.columns([1, 2.2, 1], gap="small")
        with left, st.container(border=True, key="panel_preparation"):
            panel_title("เตรียมข้อมูล")
            if source:
                source_details(source)
            preparation = st.progress(0, text="กำลังตรวจสอบข้อมูล")
        with center, st.container(border=True, key="panel_scan"):
            panel_title("สแกนความคิดเห็น")
            render_scan(animated=True)
        with right, st.container(border=True, key="panel_prediction"):
            panel_title("จำแนกความรู้สึก")
            model_name = st.empty()
            model_name.caption("กำลังโหลดตัวจำแนก")
            prediction = st.progress(0, text=f"0 / {len(comments):,}")
    status = st.empty()
    status.info("กำลังตรวจสอบความคิดเห็นที่เลือก")

    run_inference(comments, source, preparation, model_name, prediction, status)


@st.fragment(run_every=0.25)
def run_inference(comments, source, preparation, model_name, prediction, status):
    # Mount the video once in the parent page before the first inference tick.
    if not st.session_state.get("processing_active"):
        return
    if not st.session_state.pop("processing_rendered", False):
        st.session_state.processing_rendered = True
        return
    st.session_state.pop("processing_active", None)

    def update_prediction(done, total):
        prediction.progress(done / total, text=f"{done:,} / {total:,}")

    try:
        if not comments:
            raise ValueError("ยังไม่มีความคิดเห็น กรุณาโหลดข้อมูลก่อนวิเคราะห์")
        preparation.progress(1 / 3, text="ตรวจสอบข้อมูลแล้ว")
        status.info("กำลังโหลดโมเดลที่บันทึกไว้")
        signature = model_signature()
        pipeline = load_model()
        name = pipeline.training_report_["selected_model"]
        model_name.write(name)
        preparation.progress(2 / 3, text="โหลดโมเดลแล้ว")
        batches = prepare_batches(comments)
        preparation.progress(1.0, text=f"เตรียมข้อมูลแล้ว {len(batches):,} ชุด")
        status.info("กำลังจำแนกความรู้สึกทีละชุด")
        labels = predict_batches(pipeline, batches, on_progress=update_prediction)
        csv_data = export_predictions(comments, labels)
    except Exception as exc:
        message = str(exc) if isinstance(exc, ValueError) and str(exc).startswith(
            ("ยังไม่มี", "เปิดไฟล์")
        ) else "วิเคราะห์ไม่สำเร็จ กรุณาลองใหม่จากหน้าวิเคราะห์ความคิดเห็น หรือฝึกโมเดลใหม่"
        st.session_state.processing_error = message
        go_to(PAGES[1])
        st.rerun()

    st.session_state.result = {
        "source": source, "labels": labels, "model": name, "signature": signature, "csv": csv_data,
    }
    status.success("วิเคราะห์เสร็จแล้ว กำลังเปิดผลการวิเคราะห์")
    go_to(PAGES[2])
    st.rerun()


def sentiment_totals(labels):
    for label in LABELS:
        count = labels.count(label)
        share = count / len(labels)
        st.html(
            f'<div class="sentiment"><span style="color:{COLORS[label]}">{SENTIMENTS[label]}</span>'
            f'<b>{count:,} · {share:.1%}</b></div>'
        )


def chart_font():
    return FontProperties(fname=FONT_DIR / "LINESeedSansTH_Rg.ttf")


def plot_distribution(labels):
    counts = [labels.count(label) for label in LABELS]
    figure = Figure(figsize=(7, 3.15), facecolor="#07191c", layout="constrained")
    axis = figure.subplots()
    axis.set_facecolor("#07191c")
    bars = axis.bar(range(3), counts, color=[COLORS[label] for label in LABELS], width=0.53)
    axis.set_ylim(0, max(counts) * 1.25)
    font = chart_font()
    axis.set_xticks(range(3), [SENTIMENTS[label] if font else label.title() for label in LABELS],
                    fontproperties=font)
    axis.tick_params(colors="#b0cad5", length=0, pad=8)
    axis.yaxis.set_major_locator(MaxNLocator(nbins=6, integer=True))
    axis.yaxis.grid(True, color="#234651", linewidth=0.7)
    axis.set_axisbelow(True)
    for spine in axis.spines.values():
        spine.set_visible(False)
    axis.bar_label(bars, fmt="%d", color="#e7f4fa", padding=5)
    return figure


def render_results_page():
    st.title("ผลการวิเคราะห์")
    result = st.session_state.get("result")
    if not result:
        with st.container(border=True, key="panel_empty"):
            panel_title("ยังไม่มีผลลัพธ์")
            st.caption("เลือกแหล่งความคิดเห็นและเริ่มวิเคราะห์เพื่อดูจำนวนและสัดส่วนของแต่ละประเภท")
            st.button("ไปหน้าวิเคราะห์", type="primary", on_click=go_to, args=(PAGES[1],))
        return

    source, labels = result["source"], result["labels"]
    with st.container(key="hud"):
        left, center, right = st.columns([1, 2.2, 1], gap="small")
        with left, st.container(border=True, key="panel_result_source"):
            panel_title("ข้อมูลที่วิเคราะห์")
            source_details(source)
            st.caption("ตัวจำแนก")
            st.write(result["model"])
        with center, st.container(border=True, key="panel_distribution"):
            panel_title("จำนวนความคิดเห็นตามความรู้สึก")
            st.pyplot(plot_distribution(labels), width="stretch")
        with right, st.container(border=True, key="panel_result_totals"):
            panel_title("สรุปผลและส่งออก")
            sentiment_totals(labels)
            st.download_button(
                "ดาวน์โหลด CSV", data=result["csv"], file_name="pantip_predictions.csv",
                mime="text/csv", type="primary", width="stretch", on_click="ignore",
            )
    with st.container(border=True, key="panel_comments"):
        title, pager = st.columns([3, 1], vertical_alignment="center")
        with title:
            panel_title("ความคิดเห็นและผลจำแนก")
        page_size = 20
        pages = range(1, (len(labels) - 1) // page_size + 2)
        page = pager.selectbox("หน้าของตาราง", pages, format_func=lambda n: f"หน้า {n} / {len(pages)}",
                               label_visibility="collapsed") if len(pages) > 1 else 1
        start = (page - 1) * page_size
        stop = min(start + page_size, len(labels))
        st.caption(f"รายการ {start + 1:,}–{stop:,} จาก {len(labels):,}")
        rows = []
        for index in range(start, stop):
            label = labels[index]
            rows.append(
                f'<tr><td>{index + 1:,}</td><td>{escape(source["comments"][index])}</td>'
                f'<td style="color:{COLORS[label]}">{SENTIMENTS[label]}</td></tr>'
            )
        st.html(
            '<table class="comments-table"><thead><tr><th scope="col">ลำดับ</th>'
            '<th scope="col">ความคิดเห็น</th><th scope="col">ความรู้สึก</th></tr></thead>'
            f'<tbody>{"".join(rows)}</tbody></table>'
        )


def plot_confusion(report):
    matrix = report["confusion_matrix"]
    figure = Figure(figsize=(5.3, 4.2), facecolor="#07191c", layout="constrained")
    axis = figure.subplots()
    axis.imshow(matrix, cmap="Blues")
    font = chart_font()
    labels = [SENTIMENTS[label] if font else label.title() for label in report["label_order"]]
    axis.set_xticks(range(3), labels, fontproperties=font)
    axis.set_yticks(range(3), labels, fontproperties=font)
    axis.tick_params(colors="#b0cad5", length=0, pad=8)
    axis.set_xlabel("ผลทำนาย" if font else "Predicted", fontproperties=font, color="#e7f4fa", labelpad=9)
    axis.set_ylabel("ป้ายกำกับจริง" if font else "Actual", fontproperties=font, color="#e7f4fa", labelpad=9)
    threshold = max(max(row) for row in matrix) * 0.55
    for row in range(3):
        for column in range(3):
            value = matrix[row][column]
            axis.text(column, row, f"{value:,}", ha="center", va="center",
                      color="white" if value >= threshold else "#071119")
    return figure


@st.cache_data(show_spinner=False, max_entries=3)
def active_report(signature):
    return load_model().training_report_


def render_training_page():
    st.title("ฝึกโมเดล")
    report = None
    if model_signature():
        try:
            report = active_report(model_signature())
        except ValueError as exc:
            st.warning(str(exc))

    with st.container(key="train_controls"):
        controls, current = st.columns([1.5, 1], gap="small")
    with current, st.container(border=True, key="panel_current_model"):
        panel_title("โมเดลปัจจุบัน")
        st.write(report["selected_model"] if report else "ยังไม่มีโมเดลที่ใช้งานได้")
        if report:
            st.caption(report["dataset_source"])
    with controls, st.container(border=True, key="panel_training"):
        panel_title("ชุดข้อมูลสำหรับฝึก")
        st.caption(f"ชุดข้อมูลเริ่มต้น · {DATASET_PATH.name} จาก Wisesight Sentiment Corpus")
        uploaded = st.file_uploader("ไฟล์ฝึกเพิ่มเติม (ถ้ามี) · text,label", type=["csv"], key="training_upload")
        if st.button("เริ่มฝึกโมเดล", type="primary"):
            try:
                with st.spinner("กำลังเปรียบเทียบตัวจำแนกและประเมินผล กรุณารอสักครู่"):
                    if uploaded:
                        report = train_and_save(uploaded.getvalue(), f"CSV ที่อัปโหลด · {uploaded.name}")
                    else:
                        report = train_and_save()
                st.session_state.pop("result", None)
                st.session_state.pop("processing_error", None)
                st.session_state.training_success = report["selected_model"]
                st.rerun()
            except Exception as exc:
                detail = str(exc) if isinstance(exc, ValueError) else "กรุณาตรวจสอบไฟล์ฝึกและสิทธิ์เขียนในโฟลเดอร์ models"
                previous = " โมเดลและผลเดิมยังใช้ได้" if report else ""
                st.error(f"ฝึกหรือบันทึกโมเดลไม่สำเร็จ · {detail}{previous}")
        if "training_success" in st.session_state:
            st.success(f"บันทึกโมเดลใหม่แล้ว · {st.session_state.pop('training_success')}")
    if not report:
        return

    with st.container(border=True, key="panel_evaluation"):
        panel_title("เปรียบเทียบโมเดลด้วย Cross-validation")
        split = report["split_sizes"]
        st.caption(
            f"ฝึก {split['train']:,} · ทดสอบ {split['test']:,} · "
            f"{report['fold_count']} folds · seed {report['seed']} · "
            f"ตัดรายการซ้ำ {report['duplicates_removed']:,} รายการ"
        )
        st.caption(" · ".join(f"{SENTIMENTS[label]} {report['class_counts'][label]:,}" for label in LABELS))
        comparison = [
            {"ตัวจำแนก": row["model"], "Macro F1 เฉลี่ย": row["mean_macro_f1"],
             "ส่วนเบี่ยงเบนมาตรฐาน": row["std_macro_f1"]}
            for row in report["cv_comparison"]
        ]
        render_table(pd.DataFrame(comparison))
        st.write(f"โมเดลที่เลือก · {report['selected_model']}")

    with st.container(border=True, key="panel_held_out"):
        panel_title("ผลประเมินจากชุดทดสอบที่กันไว้")
        st.caption(report["evaluation_scope"])
        left, right = st.columns([1.1, 1], gap="large")
        with left:
            render_table(pd.DataFrame([{
                "Accuracy": report["held_out"]["accuracy"],
                "Macro Precision": report["held_out"]["macro_precision"],
                "Macro Recall": report["held_out"]["macro_recall"],
                "Macro F1": report["held_out"]["macro_f1"],
            }]))
            per_class = [
                {"ความรู้สึก": SENTIMENTS[label], **report["per_class"][label]} for label in LABELS
            ]
            render_table(pd.DataFrame(per_class))
        with right:
            st.markdown("**ตารางสับสน**")
            st.pyplot(plot_confusion(report), width="stretch")


def go_to(page):
    st.session_state.page = page


def select_navigation_page():
    go_to(st.session_state.navigation)


def main():
    st.set_page_config(page_title="Pantip Sentiment", page_icon="◉", layout="wide")
    fonts = []
    for weight, suffix in [(400, "Rg"), (700, "Bd")]:
        uri = media_data_uri(FONT_DIR / f"LINESeedSansTH_{suffix}.ttf", "font/ttf")
        fonts.append(f'@font-face{{font-family:"LINE Seed Sans TH";font-weight:{weight};src:url("{uri}") format("truetype");}}')
    st.html("<style>" + "".join(fonts) + "</style>" + THEME)
    if st.session_state.pop("run_pending", False):
        st.session_state.processing_active = True
    processing = st.session_state.get("processing_active", False)
    result = st.session_state.get("result")
    signature = model_signature()
    if result and signature and signature != result["signature"]:
        st.session_state.pop("result")

    page = st.session_state.get("page", PAGES[0])
    if st.session_state.get("navigation") != page:
        st.session_state.navigation = page
    with st.container(key="topbar"):
        brand, navigation, status = st.columns([1, 2.2, 0.8], gap="small", vertical_alignment="center")
        brand.html('<div class="brand"><i aria-hidden="true"></i><span>PANTIP <em>/</em> SENTIMENT</span></div>')
        with navigation:
            st.radio("เมนูหลัก", PAGES, key="navigation", horizontal=True, label_visibility="collapsed",
                     disabled=processing, on_change=select_navigation_page)
        status.html('<div class="local-status">ประมวลผลในเครื่อง</div>')
    if processing:
        with st.container(key="processing_frame"):
            render_processing_page()
        return
    screens = {
        PAGES[0]: render_home_page,
        PAGES[1]: render_analyzer_page,
        PAGES[2]: render_results_page,
        PAGES[3]: render_training_page,
    }
    screens[page]()


if __name__ == "__main__":
    main()
