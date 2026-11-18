"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConsole } from "../../components/Console";
import {
  Title,
  Panel,
  SectionTitle,
  Action,
  Notice,
  three,
  Icon,
} from "../../components/UI";
import Scan from "../../components/Scan";
import { api, jsonPost, fmt } from "../../lib/api";
const checkpoints = [
  "ตรวจความคิดเห็น",
  "โหลดโมเดลที่บันทึกไว้",
  "แบ่งชุดข้อมูลสำหรับทำนาย",
];
function Meter({ name, value, max }) {
  const percent = Math.floor((100 * value) / max);
  return (
    <div className="mt-3">
      <p className="mb-2 flex items-baseline justify-between gap-2 text-xs text-muted">
        <span>{name}</span>
        <b className="text-base text-aqua tabular-nums">{percent}%</b>
      </p>
      <progress
        aria-label={name}
        value={value}
        max={max}
        className="block h-1.5 w-full overflow-hidden rounded-full border-0 bg-line accent-aqua [&::-moz-progress-bar]:bg-aqua [&::-webkit-progress-bar]:bg-line [&::-webkit-progress-value]:bg-aqua"
      />
    </div>
  );
}
export default function Processing() {
  const { job, setResult, finish } = useConsole(),
    router = useRouter();
  const [progress, setProgress] = useState({ prepared: 0, done: 0 }),
    [error, setError] = useState("");
  useEffect(() => {
    if (!job) return;
    let active = true,
      timer,
      frame;
    async function run() {
      try {
        await api(
          "/jobs",
          jsonPost({ source_id: job.source.id, request_id: job.id }),
        );
        if (active) poll();
      } catch (e) {
        if (active) setError(e.message);
      }
    }
    async function poll() {
      try {
        const p = await api("/jobs/" + job.id);
        if (!active) return;
        setProgress(p);
        if (p.status === "error") throw new Error(p.error);
        if (p.status === "complete" && p.prepared === 3 && p.done === p.total) {
          const data = await api("/jobs/" + job.id + "/result");
          if (!active) return;
          setResult({ ...data, id: job.id });
          frame = requestAnimationFrame(() => {
            if (active) {
              router.replace("/results");
              finish();
            }
          });
          return;
        }
        timer = setTimeout(poll, 140);
      } catch (e) {
        if (active) setError(e.message);
      }
    }
    run();
    return () => {
      active = false;
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [job, router, setResult]);
  if (!job)
    return (
      <>
        <Title>ประมวลผล</Title>
        <Panel>
          <p className="mb-4">ยังไม่มีงานประมวลผล</p>
          <Action />
        </Panel>
      </>
    );
  return (
    <>
      <Title info={job.source.kind}>กำลังวิเคราะห์ความคิดเห็น</Title>
      <div className={three}>
        <Panel>
          <SectionTitle icon="source">เตรียมข้อมูล</SectionTitle>
          <p className="mt-4 break-words text-lg font-bold">
            {job.source.name}
          </p>
          <p className="mt-2 text-sm text-muted">
            {fmt(job.source.total)} ความคิดเห็น
          </p>
          <Meter name="ขั้นตอนที่เสร็จแล้ว" value={progress.prepared} max={3} />
          <ol className="mt-4 space-y-2">
            {checkpoints.map((s, i) => (
              <li key={s} className="flex items-center gap-2 text-sm">
                <span
                  className={i < progress.prepared ? "text-aqua" : "text-muted"}
                >
                  <Icon
                    name={i < progress.prepared ? "check" : "scan"}
                    className="h-4 w-4"
                  />
                </span>
                {s}
              </li>
            ))}
          </ol>
        </Panel>
        <Scan working />
        <Panel>
          <SectionTitle icon="analyzer">การจำแนกความรู้สึก</SectionTitle>
          <div
            className="mt-4 text-[2rem] leading-tight font-bold tabular-nums"
            data-testid="predicted"
          >
            {fmt(progress.done)}
          </div>
          <p className="mt-2 text-sm text-muted">
            จาก {fmt(job.source.total)} ความคิดเห็น
          </p>
          <Meter
            name="ทำนายสำเร็จ"
            value={progress.done}
            max={job.source.total}
          />
          {progress.model && (
            <p className="mt-4 text-sm text-muted">{progress.model}</p>
          )}
          {error && (
            <>
              <Notice>{error}</Notice>
              <button
                className="rounded border border-aqua p-2 text-aqua"
                onClick={() => {
                  finish();
                  router.push("/analyzer");
                }}
              >
                กลับไปลองอีกครั้ง
              </button>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
