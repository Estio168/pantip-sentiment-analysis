"use client";
import Link from "next/link";
import { useConsole } from "../components/Console";
import {
  Title,
  SectionTitle,
  Panel,
  Icon,
  Action,
  Reveal,
  three,
  focus,
} from "../components/UI";
import Scan from "../components/Scan";
import { fmt, labels, colors } from "../lib/api";
export default function Overview() {
  const { source, result, report, modelError } = useConsole();
  return (
    <>
      <Title>ภาพรวมระบบ</Title>
      <div className={three}>
        <div className="flex min-w-0 flex-col gap-3 xl:self-start">
          <Panel>
            <SectionTitle icon="source">แหล่งความคิดเห็น</SectionTitle>
            <h3 className="mt-3 break-words text-base font-bold">
              {source ? source.name : "ยังไม่ได้เลือกข้อมูล"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {source ? source.kind : "กระทู้ Pantip · ไฟล์ CSV · ข้อมูลสาธิต"}
            </p>
            <Link
              href="/analyzer"
              className={
                "mt-1 inline-flex min-h-11 items-center gap-2 text-sm xl:min-h-9 font-bold text-aqua " +
                focus
              }
            >
              เลือกแหล่งข้อมูล <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </Panel>
          <Panel>
            <SectionTitle icon="message">
              ความคิดเห็นพร้อมวิเคราะห์
            </SectionTitle>
            <div className="mt-2 flex items-baseline gap-3">
              <strong className="text-[2rem] leading-tight tabular-nums">
                {fmt(source?.total ?? 0)}
              </strong>
              <span className="text-sm text-muted">ข้อความ</span>
            </div>
          </Panel>
        </div>
        <Scan />
        <div className="flex min-w-0 flex-col gap-3 xl:self-start">
          <Panel>
            <SectionTitle icon="model">โมเดลที่ใช้งาน</SectionTitle>
            <p className="mt-3 text-2xl font-bold">
              {report?.selected_model || "กำลังตรวจสอบ"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {modelError || "TF-IDF · PyThaiNLP"}
            </p>
            {report && (
              <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-line pt-3 text-sm text-muted">
                <span>Macro F1 ชุดทดสอบ</span>
                <b className="text-aqua tabular-nums">
                  {report.held_out.macro_f1.toFixed(3)}
                </b>
              </div>
            )}
          </Panel>
          <Panel>
            <SectionTitle icon="results">ผลการวิเคราะห์ล่าสุด</SectionTitle>
            <p className="mt-3 break-words font-bold">
              {result ? result.source.name : "ยังไม่มีผลการวิเคราะห์"}
            </p>
            <p className="mb-2 mt-1 text-sm leading-5 text-muted">
              {result
                ? fmt(result.labels.length) + " ความคิดเห็น"
                : "เลือกข้อมูลและเริ่มวิเคราะห์เพื่อดูสัดส่วนความรู้สึก"}
            </p>
            <Action />
          </Panel>
        </div>
      </div>
      <div className="mt-3">
        <Reveal>
          <section className="grid items-center gap-3 rounded-md border-y border-line bg-[#0b151a] px-4 py-2.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]">
            <div className="min-w-0">
              <SectionTitle icon="layers">ข้อมูลที่ใช้ฝึกโมเดล</SectionTitle>
              <p className="mt-0.5 text-sm text-muted [overflow-wrap:anywhere]">
                {report?.dataset_source || "กำลังโหลด"}
              </p>
            </div>
            <dl className="grid grid-cols-3 gap-3">
              {Object.entries(labels).map(([key, label]) => (
                <div key={key} className="border-l border-line pl-3">
                  <dt className="flex items-center gap-1.5 text-sm text-muted">
                    <i className={"h-2 w-2 rounded-sm " + colors[key]} />{label}
                  </dt>
                  <dd className="text-lg font-bold leading-tight tabular-nums">
                    {report ? fmt(report.class_counts[key]) : "—"}
                  </dd>
                </div>
              ))}
            </dl>
            <Link href="/training" className={"inline-flex min-h-11 w-fit items-center gap-2 text-sm text-aqua xl:min-h-9 " + focus}>
              ดูผลการฝึก <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </section>
        </Reveal>
      </div>
    </>
  );
}
