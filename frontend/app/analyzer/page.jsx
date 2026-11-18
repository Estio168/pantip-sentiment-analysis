"use client";
import { useState } from "react";
import { useConsole } from "../../components/Console";
import {
  Panel,
  Title,
  SectionTitle,
  Icon,
  primary,
  secondary,
  field,
  Notice,
  focus,
} from "../../components/UI";
import { api, jsonPost, fmt } from "../../lib/api";
const modes = [
  ["pantip", "กระทู้ Pantip", "link"],
  ["csv", "ไฟล์ CSV", "file"],
  ["demo", "ข้อมูลสาธิต", "layers"],
];
export default function Analyzer() {
  const { source, setSource, begin } = useConsole();
  const [mode, setMode] = useState(
      modes.find((m) => m[1] === source?.kind)?.[0] || "pantip",
    ),
    [url, setUrl] = useState(""),
    [file, setFile] = useState(null),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState("");
  const current =
    source?.kind === modes.find((m) => m[0] === mode)[1] ? source : null;
  function select(value) {
    setMode(value);
    setErr("");
  }
  async function load() {
    setBusy(true);
    setErr("");
    try {
      let opts = { method: "POST" };
      if (mode === "pantip") opts = jsonPost({ url });
      if (mode === "csv") {
        const form = new FormData();
        form.append("file", file);
        opts.body = form;
      }
      setSource(await api("/sources/" + mode, opts));
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Title>วิเคราะห์ความคิดเห็น</Title>
      <div className="grid min-w-0 gap-3">
        <Panel>
          <SectionTitle icon="source">เลือกแหล่งข้อมูล</SectionTitle>
          <div className="my-3 grid grid-cols-3 gap-1 rounded-lg border border-line bg-ink p-1">
            {modes.map(([k, name, icon]) => (
              <button
                key={k}
                disabled={busy}
                aria-pressed={mode === k}
                className={
                  "flex min-h-11 xl:min-h-9 items-center justify-center gap-2 rounded-md px-1 text-sm " +
                  focus +
                  " " +
                  (mode === k
                    ? "bg-aqua/10 font-bold text-aqua"
                    : "text-muted hover:text-white")
                }
                onClick={() => select(k)}
              >
                <Icon name={icon} className="hidden h-4 w-4 sm:block" />
                {name}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
          >
            {mode === "pantip" ? (
              <label className="grid min-w-0 gap-2 text-sm">
                ลิงก์กระทู้สาธารณะที่ได้รับอนุญาต
                <input
                  className={field}
                  type="url"
                  placeholder="https://pantip.com/topic/…"
                  required
                  value={url}
                  disabled={busy}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (current) setSource(null);
                  }}
                />
              </label>
            ) : mode === "csv" ? (
              <label className="grid min-w-0 gap-2 text-sm">
                ไฟล์ UTF-8 ที่มีคอลัมน์ comment_text
                <input
                  className={
                    field +
                    " file:mr-3 file:rounded file:border-0 file:bg-line file:px-3 file:text-white"
                  }
                  type="file"
                  disabled={busy}
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    setFile(e.target.files[0]);
                    if (current) setSource(null);
                  }}
                />
              </label>
            ) : (
              <div>
                <p className="text-sm text-muted">
                  ชุดความคิดเห็นภาษาไทยสำหรับทดลองวิเคราะห์
                </p>
                <p className="mt-1 font-bold">pantip_comments.csv</p>
              </div>
            )}
            <button
              className={secondary}
              disabled={
                busy ||
                (mode === "csv" && !file) ||
                (mode === "pantip" && !url.trim())
              }
            >
              {busy
                ? "กำลังโหลด…"
                : mode === "pantip"
                  ? "ดึงความคิดเห็น"
                  : mode === "csv"
                    ? "อ่านไฟล์ CSV"
                    : "โหลดข้อมูลสาธิต"}
            </button>
          </form>
          {err && <Notice>{err}</Notice>}
        </Panel>
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionTitle icon="message">ตัวอย่างความคิดเห็น</SectionTitle>
            <span className="text-sm text-muted">
              {fmt(current?.total || 0)} ข้อความ
            </span>
          </div>
          {current ? (
            <>
              <p className="mt-4 break-words text-sm text-aqua">
                {current.name}
              </p>
              {current.note && (
                <p className="my-2 text-sm text-muted">{current.note}</p>
              )}
              <ol className="mt-3 divide-y divide-line border-y border-line">
                {current.preview.map((s, i) => (
                  <li key={i} className="flex gap-3 py-2 text-sm">
                    <span className="text-muted tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {s}
                    </span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="my-3 rounded-md border border-dashed border-line px-4 py-5 text-center text-sm text-muted">
              โหลดข้อมูลเพื่อดูตัวอย่างก่อนวิเคราะห์
            </p>
          )}
          <div className="mt-3 flex justify-end">
            <button
              className={primary}
              disabled={!current?.total || busy || !!err}
              onClick={begin}
            >
              วิเคราะห์ความคิดเห็น
              <Icon name="arrow" className="h-4 w-4" />
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}
