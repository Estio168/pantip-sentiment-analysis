"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useConsole } from "../components/Console";
import {
  SectionTitle,
  Panel,
  Icon,
  Action,
  Reveal,
  Notice,
  Status,
  secondary,
  focus,
} from "../components/UI";
import Scan from "../components/Scan";
import SentimentGauge from "../components/SentimentGauge";
import { api, fmt, labels, colors } from "../lib/api";

export default function Overview() {
  const { source, result, report, modelError, modelLoading, refreshModel } =
    useConsole();
  const [health, setHealth] = useState({
    state: "pending",
    checkedAt: null,
    error: "",
  });
  const [healthAttempt, setHealthAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const data = await api("/health");
        if (active)
          setHealth({
            state: data.ok === true ? "ready" : "error",
            checkedAt: new Date(),
            error: data.ok === true ? "" : "บริการ API ยังไม่พร้อม",
          });
      } catch (e) {
        if (active)
          setHealth({
            state: "error",
            checkedAt: new Date(),
            error: e.message,
          });
      }
    }
    check();
    const timer = setInterval(check, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [healthAttempt]);
  const counts = { positive: 0, negative: 0, neutral: 0 };
  for (const label of result?.labels || []) counts[label]++;
  const modelState = modelLoading
    ? "pending"
    : modelError || !report
      ? "error"
      : "ready";
  return (
    <>
      <div
        data-testid="overview-hud"
        className="grid min-w-0 items-stretch gap-4 bg-scan bg-[size:48px_48px] sm:grid-cols-2 console:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)_minmax(0,1fr)] console:gap-3"
      >
        <div
          data-testid="overview-data"
          className="order-2 grid min-w-0 gap-4 console:order-1 console:grid-rows-3 console:gap-3 short:gap-2"
        >
          <Panel compact>
            <SectionTitle compact icon="source">
              แหล่งความคิดเห็น
            </SectionTitle>
            <h3 className="text-sm font-bold [overflow-wrap:anywhere]">
              {source?.name || "ยังไม่ได้เลือกข้อมูล"}
            </h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              {source?.kind || "กระทู้ Pantip · CSV · ข้อมูลสาธิต"}
            </p>
            <dl className="mt-1 flex flex-wrap items-baseline justify-between gap-x-2">
              <dt className="text-xs text-muted">ความคิดเห็นพร้อมวิเคราะห์</dt>
              <dd className="text-2xl font-bold leading-7 tabular-nums">
                {fmt(source?.total ?? 0)}{" "}
                <span className="text-xs font-normal text-muted">ข้อความ</span>
              </dd>
            </dl>
            <Link
              href="/analyzer"
              className={
                "mt-1 flex min-h-11 w-fit items-center gap-2 text-sm text-aqua console:min-h-8 " +
                focus
              }
            >
              เลือกแหล่งข้อมูล <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </Panel>
          <Panel compact>
            <SectionTitle compact icon="model">
              โมเดลที่ใช้งาน
            </SectionTitle>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-lg font-bold leading-6">
                {report?.selected_model || "—"}
              </p>
              <Status compact state={modelState}>
                {modelLoading
                  ? "กำลังตรวจสอบ"
                  : modelError
                    ? "โหลดโมเดลไม่ได้"
                    : report
                      ? "พร้อมวิเคราะห์"
                      : "ยังไม่พร้อม"}
              </Status>
            </div>
            <p className="mt-2 text-xs text-muted">
              {report ? "TF-IDF + PyThaiNLP" : "ยังไม่มีข้อมูลโมเดล"}
            </p>
            {report && (
              <dl className="mt-2 flex flex-wrap justify-between gap-2 border-t border-line pt-2 text-sm">
                <dt className="text-muted">Macro F1 ชุดทดสอบ</dt>
                <dd className="font-bold text-aqua tabular-nums">
                  {report.held_out.macro_f1.toFixed(3)}
                </dd>
              </dl>
            )}
            {modelError && (
              <>
                <Notice>{modelError}</Notice>
                <button
                  disabled={modelLoading}
                  className={secondary}
                  onClick={refreshModel}
                >
                  ลองเชื่อมต่ออีกครั้ง
                </button>
              </>
            )}
          </Panel>
          <Panel compact>
            <SectionTitle compact icon="signal">
              สถานะระบบ
            </SectionTitle>
            <dl className="space-y-1.5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-muted">API</dt>
                <dd data-testid="api-status">
                  <Status compact state={health.state}>
                    {health.state === "pending"
                      ? "กำลังตรวจสอบ"
                      : health.state === "ready"
                        ? "เชื่อมต่อแล้ว"
                        : "เชื่อมต่อไม่ได้"}
                  </Status>
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-muted">บริการวิเคราะห์</dt>
                <dd>
                  <Status
                    compact
                    state={health.state === "ready" ? modelState : health.state}
                  >
                    {health.state !== "ready"
                      ? "รอตรวจการเชื่อมต่อ"
                      : modelState === "ready"
                        ? "โหลดโมเดลได้"
                        : "รอตรวจโมเดล"}
                  </Status>
                </dd>
              </div>
            </dl>
            <div className="mt-1 flex items-center justify-between gap-2 border-t border-line pt-1">
              <p className="text-xs text-muted">
                {health.checkedAt
                  ? `ตรวจล่าสุด ${health.checkedAt.toLocaleTimeString("th-TH")}`
                  : "กำลังตรวจการเชื่อมต่อ"}
              </p>
              <button
                aria-label="ตรวจการเชื่อมต่ออีกครั้ง"
                title="ตรวจการเชื่อมต่ออีกครั้ง"
                className={
                  "flex min-h-11 min-w-11 items-center justify-center rounded text-aqua transition-colors hover:bg-aqua/10 disabled:opacity-40 console:min-h-8 console:min-w-8 " +
                  focus
                }
                disabled={health.state === "pending"}
                onClick={() => {
                  setHealth({ state: "pending", checkedAt: null, error: "" });
                  setHealthAttempt(healthAttempt + 1);
                }}
              >
                <Icon name="refresh" className="h-4 w-4" />
              </button>
            </div>
            {health.error && <Notice>{health.error}</Notice>}
          </Panel>
        </div>
        <Scan
          expanded
          className="order-1 sm:col-span-2 console:order-2 console:col-span-1"
        />
        <div
          data-testid="overview-analytics"
          className="order-3 grid min-w-0 gap-4 console:grid-rows-3 console:gap-3 short:gap-2"
        >
          <Panel compact>
            <SectionTitle compact icon="results">
              ผลการวิเคราะห์ล่าสุด
            </SectionTitle>
            <p className="text-sm font-bold [overflow-wrap:anywhere]">
              {result ? result.source.name : "ยังไม่มีผลการวิเคราะห์"}
            </p>
            <p className="mb-2 mt-1 text-sm leading-5 text-muted">
              {result
                ? `${fmt(result.labels.length)} ความคิดเห็น · ${result.model}`
                : "เลือกข้อมูลและเริ่มวิเคราะห์เพื่อดูสรุปความรู้สึก"}
            </p>
            {result ? (
              <Action compact href="/results">
                ดูผลการวิเคราะห์
              </Action>
            ) : (
              <Action compact />
            )}
          </Panel>
          <Panel compact className="flex flex-col console:row-span-2">
            <SectionTitle compact icon="overview">
              สัดส่วนความรู้สึก
            </SectionTitle>
            <SentimentGauge
              counts={counts}
              total={result?.labels.length ?? 0}
            />
          </Panel>
        </div>
      </div>
      <div
        className="mt-4 console:mt-3 short:mt-2"
        data-testid="training-strip"
      >
        <Reveal>
          <Panel compact>
            <div className="grid items-center gap-4 console:gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]">
              <div>
                <h2 className="flex items-center gap-2 text-base console:text-sm font-bold">
                  <Icon name="layers" className="h-4 w-4 text-aqua" />
                  ข้อมูลที่ใช้ฝึกโมเดล
                </h2>
                <p className="mt-2 console:mt-1 text-sm text-muted console:leading-5 [overflow-wrap:anywhere]">
                  {report?.dataset_source || "ยังไม่มีข้อมูลชุดฝึก"}
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-3">
                {Object.entries(labels).map(([key, label]) => (
                  <div key={key} className="border-l border-line pl-3">
                    <dt className="flex items-center gap-1.5 text-sm console:text-xs text-muted">
                      <i className={"h-2 w-2 rounded-sm " + colors[key]} />
                      {label}
                    </dt>
                    <dd className="mt-1 console:mt-0.5 text-xl console:text-lg console:leading-6 font-bold tabular-nums">
                      {report ? fmt(report.class_counts[key]) : "—"}
                    </dd>
                  </div>
                ))}
              </dl>
              <Link
                href="/training"
                className={
                  "inline-flex min-h-11 console:min-h-9 w-fit items-center gap-2 text-sm text-aqua " +
                  focus
                }
              >
                ดูผลการฝึก <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
          </Panel>
        </Reveal>
      </div>
    </>
  );
}
