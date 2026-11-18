"use client";
import { useState } from "react";
import { useConsole } from "../../components/Console";
import {
  Panel,
  SectionTitle,
  Title,
  Notice,
  Reveal,
  field,
  primary,
  secondary,
} from "../../components/UI";
import { api, fmt, labels } from "../../lib/api";
const metricNames = {
  accuracy: "Accuracy",
  macro_precision: "Macro Precision",
  macro_recall: "Macro Recall",
  macro_f1: "Macro F1",
};
export default function Training() {
  const { report, setReport, modelError, modelLoading, refreshModel } =
      useConsole(),
    [mode, setMode] = useState("bundled"),
    [file, setFile] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [finished, setFinished] = useState(false);
  async function train() {
    if (busy) return;
    setBusy(true);
    setError("");
    setFinished(false);
    try {
      const form = new FormData();
      if (mode === "csv") form.append("file", file);
      setReport(await api("/training", { method: "POST", body: form }));
      setFinished(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Title subtitle="เลือกชุดข้อมูล ฝึกเปรียบเทียบโมเดล และตรวจผลประเมินจากชุดทดสอบ">
        ฝึกโมเดล
      </Title>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionTitle icon="source">ชุดข้อมูลสำหรับฝึก</SectionTitle>
          <label className="my-4 grid gap-2 text-sm">
            แหล่งข้อมูล
            <select
              className={field}
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              disabled={busy}
            >
              <option value="bundled">ชุดข้อมูลในโครงการ</option>
              <option value="csv">อัปโหลด CSV ที่มีคอลัมน์ text,label</option>
            </select>
          </label>
          {mode === "csv" && (
            <input
              aria-label="ไฟล์ฝึก CSV"
              type="file"
              accept=".csv"
              disabled={busy}
              className={field + " mb-4 block w-full"}
              onChange={(e) => setFile(e.target.files[0])}
            />
          )}
          {mode === "bundled" && report && (
            <div className="mb-4 rounded-lg border border-line bg-ink/50 p-4">
              <p className="text-sm text-muted [overflow-wrap:anywhere]">
                {report.dataset_source}
              </p>
              <dl className="mt-3 grid grid-cols-3 gap-3">
                {Object.entries(report.class_counts).map(([key, count]) => (
                  <div key={key}>
                    <dt className="text-sm text-muted">{labels[key]}</dt>
                    <dd className="mt-1 text-lg font-bold tabular-nums">
                      {fmt(count)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          <p className="mb-4 text-sm leading-relaxed text-muted">
            เมื่อฝึกสำเร็จ ระบบจะบันทึกโมเดลที่ได้คะแนนดีที่สุดเป็นโมเดลที่ใช้งาน
          </p>
          <button
            className={primary}
            disabled={busy || (mode === "csv" && !file)}
            onClick={train}
          >
            {busy ? "กำลังฝึกและประเมินผล…" : "เริ่มฝึกโมเดล"}
          </button>
          {finished && (
            <p role="status" className="mt-3 text-aqua">
              บันทึกโมเดลแล้ว
            </p>
          )}
          {error && <Notice>{error}</Notice>}
        </Panel>
        <Panel>
          <SectionTitle icon="model">โมเดลที่ใช้งาน</SectionTitle>
          {report ? (
            <>
              <p
                role="status"
                className="mt-4 w-fit rounded-md bg-aqua/10 px-3 py-1 text-sm text-aqua"
              >
                {busy ? "กำลังฝึกและประเมินผล" : "พร้อมวิเคราะห์"}
              </p>
              <p className="my-4 text-metric font-bold">
                {report.selected_model}
              </p>
              <p className="text-sm text-muted">{report.dataset_source}</p>
              <div className="mt-4 flex flex-wrap gap-4 border-t border-line pt-3">
                {Object.entries(report.split_sizes).map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs text-muted">
                      {k === "train" ? "ชุดฝึก" : "ชุดทดสอบ"}
                    </p>
                    <b className="text-xl tabular-nums">{fmt(v)}</b>
                  </div>
                ))}
              </div>
            </>
          ) : modelError ? (
            <div>
              <Notice>{modelError}</Notice>
              <button
                className={secondary}
                disabled={modelLoading}
                onClick={refreshModel}
              >
                {modelLoading ? "กำลังเชื่อมต่อ…" : "ลองเชื่อมต่ออีกครั้ง"}
              </button>
            </div>
          ) : (
            <p
              role="status"
              className="mt-4 rounded-lg bg-ink/50 p-4 text-sm text-muted"
            >
              กำลังโหลดข้อมูลโมเดลและผลประเมิน…
            </p>
          )}
        </Panel>
      </div>
      {report && (
        <div className="mt-4 grid gap-4">
          <Reveal>
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel>
                <SectionTitle icon="results">
                  เปรียบเทียบ {report.fold_count}-fold CV
                </SectionTitle>
                <div className="mt-3 text-xs text-muted">
                  คะแนนเฉลี่ย Macro F1 ± ส่วนเบี่ยงเบนมาตรฐาน
                </div>
                {report.cv_comparison.map((row) => (
                  <div
                    key={row.model}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2 text-sm"
                  >
                    <span>{row.model}</span>
                    <b className="text-aqua tabular-nums">
                      {row.mean_macro_f1.toFixed(4)} ±{" "}
                      {row.std_macro_f1.toFixed(4)}
                    </b>
                  </div>
                ))}
              </Panel>
              <Panel>
                <SectionTitle icon="analyzer">ผลประเมินชุดทดสอบ</SectionTitle>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {Object.entries(report.held_out).map(([k, v]) => (
                    <div className="border-l border-line pl-3" key={k}>
                      <p className="text-xs text-muted">{metricNames[k]}</p>
                      <b className="text-2xl tabular-nums">{v.toFixed(4)}</b>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </Reveal>
          <Reveal>
            <Panel>
              <SectionTitle icon="overview">ตารางสับสน</SectionTitle>
              <p className="my-3 text-sm text-muted">
                แถวแสดงความรู้สึกจริง คอลัมน์แสดงผลที่โมเดลทำนาย
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px] table-fixed text-center text-sm tabular-nums">
                  <thead>
                    <tr>
                      <th className="p-2 text-left">จริง / ทำนาย</th>
                      {report.label_order.map((k) => (
                        <th key={k}>{labels[k]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.confusion_matrix.map((row, i) => (
                      <tr key={i} className="border-t border-line">
                        <th className="px-2 py-2 text-left">
                          {labels[report.label_order[i]]}
                        </th>
                        {row.map((v, j) => (
                          <td
                            key={j}
                            className={
                              i === j ? "bg-aqua/10 font-bold text-aqua" : ""
                            }
                          >
                            {fmt(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </Reveal>
          <Reveal>
            <Panel>
              <SectionTitle icon="results">ผลประเมินรายความรู้สึก</SectionTitle>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {report.label_order.map((k) => (
                  <div className="border-l border-line pl-3" key={k}>
                    <h3 className="mb-2 font-bold">{labels[k]}</h3>
                    {Object.entries(report.per_class[k]).map(([metric, v]) => (
                      <div
                        className="flex justify-between gap-3 py-1 text-sm"
                        key={metric}
                      >
                        <span className="text-muted">
                          {
                            {
                              precision: "Precision",
                              recall: "Recall",
                              f1: "F1",
                              support: "จำนวนจริง",
                            }[metric]
                          }
                        </span>
                        <span className="tabular-nums">
                          {metric === "support" ? fmt(v) : v.toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </Panel>
          </Reveal>
        </div>
      )}
    </>
  );
}
