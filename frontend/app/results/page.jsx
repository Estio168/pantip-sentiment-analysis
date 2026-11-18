"use client";
import { useMemo, useState } from "react";
import { useConsole } from "../../components/Console";
import {
  Action,
  Icon,
  Panel,
  Reveal,
  SectionTitle,
  Title,
  field,
  primary,
  secondary,
  EmptyState,
  Metric,
} from "../../components/UI";
import { labels, colors, fmt } from "../../lib/api";
const entries = Object.entries(labels);
function CommentTable({ result }) {
  const [query, setQuery] = useState(""),
    [sentiment, setSentiment] = useState(""),
    [page, setPage] = useState(0);
  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("th");
    return result.comments
      .map((text, i) => ({ text, i, label: result.labels[i] }))
      .filter(
        (r) =>
          (!sentiment || r.label === sentiment) &&
          (!q || r.text.toLocaleLowerCase("th").includes(q)),
      );
  }, [query, sentiment, result]);
  const limit = 10,
    pages = Math.max(1, Math.ceil(rows.length / limit));
  return (
    <Panel>
      <SectionTitle icon="message">ความคิดเห็นทั้งหมด</SectionTitle>
      <div className="my-4 grid gap-4 sm:grid-cols-[1fr_minmax(180px,24%)]">
        <label className="grid gap-1 text-sm text-muted">
          ค้นหาข้อความ
          <input
            type="search"
            className={field}
            placeholder="พิมพ์คำที่ต้องการค้นหา"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label className="grid gap-1 text-sm text-muted">
          ความรู้สึก
          <select
            className={field}
            value={sentiment}
            onChange={(e) => {
              setSentiment(e.target.value);
              setPage(0);
            }}
          >
            <option value="">ทุกความรู้สึก</option>
            {entries.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-11 sm:w-16" />
            <col />
            <col className="w-[78px] sm:w-32" />
          </colgroup>
          <thead className="border-y border-line bg-ink/60 text-muted">
            <tr>
              <th className="p-2">ลำดับ</th>
              <th className="py-2">ความคิดเห็น</th>
              <th>ความรู้สึก</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(page * limit, (page + 1) * limit).map((r) => (
              <tr
                key={r.i}
                className="border-b border-line transition-colors hover:bg-elevated"
              >
                <td className="p-2 align-top text-muted tabular-nums">
                  {fmt(r.i + 1)}
                </td>
                <td className="whitespace-pre-wrap break-words py-2 pr-3 align-top leading-relaxed [overflow-wrap:anywhere]">
                  {r.text}
                </td>
                <td className="py-2 align-top">
                  <span className="inline-flex items-center gap-2">
                    <i className={"h-2 w-2 rounded-full " + colors[r.label]} />
                    {labels[r.label]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <p className="py-5 text-center text-muted">ไม่พบความคิดเห็นที่ตรงกับตัวกรอง</p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>
          {fmt(rows.length)} ความคิดเห็น · หน้า {page + 1} / {fmt(pages)}
        </span>
        <div className="flex gap-2">
          <button
            className={secondary}
            disabled={!page}
            onClick={() => setPage(page - 1)}
          >
            ก่อนหน้า
          </button>
          <button
            className={secondary}
            disabled={page + 1 >= pages}
            onClick={() => setPage(page + 1)}
          >
            ถัดไป
          </button>
        </div>
      </div>
    </Panel>
  );
}
export default function Results() {
  const { result } = useConsole();
  const counts = useMemo(() => {
    const c = { positive: 0, negative: 0, neutral: 0 };
    for (const k of result?.labels || []) c[k]++;
    return c;
  }, [result]);
  if (!result)
    return (
      <>
        <Title subtitle="ดูสัดส่วนความรู้สึก สำรวจความคิดเห็น และดาวน์โหลดผลวิเคราะห์">
          ผลการวิเคราะห์
        </Title>
        <EmptyState
          title="ยังไม่มีผลการวิเคราะห์"
          action={<Action>เริ่มวิเคราะห์ความคิดเห็น</Action>}
        >
          เลือกข้อมูลจากกระทู้ Pantip ไฟล์ CSV หรือข้อมูลสาธิต แล้วเริ่มวิเคราะห์เพื่อดูผลสรุปที่นี่
        </EmptyState>
      </>
    );
  const total = result.labels.length;
  let offset = 0;
  return (
    <div className="motion-safe:animate-appear">
      <Title subtitle={result.source.name} info={result.source.kind}>
        ผลการวิเคราะห์
      </Title>
      <div
        data-testid="results-metrics"
        className="mb-4 grid items-stretch gap-4 sm:grid-cols-3"
      >
        <Metric
          numeric
          icon="message"
          label="ความคิดเห็นที่วิเคราะห์"
          value={fmt(total)}
          detail="ประมวลผลครบทุกความคิดเห็น"
        />
        <Metric
          icon="model"
          label="โมเดลที่ใช้วิเคราะห์"
          value={result.model}
          detail="ผลจากโมเดลที่บันทึกไว้"
        />
        <Metric
          icon="source"
          label="แหล่งข้อมูล"
          value={result.source.kind}
          detail={result.source.note || "สำรวจความคิดเห็นในตารางด้านล่าง"}
        />
      </div>
      <div
        data-testid="results-analysis"
        className="grid items-stretch gap-4 lg:grid-cols-3"
      >
        <Panel className="flex h-full flex-col lg:col-span-2">
          <SectionTitle icon="results">สัดส่วนความรู้สึก</SectionTitle>
          <div className="mx-auto my-4 w-full max-w-[240px]">
            <svg
              role="img"
              aria-label="แผนภูมิสัดส่วนความรู้สึก"
              viewBox="0 0 120 120"
              className="w-full"
            >
              <circle
                cx="60"
                cy="60"
                r="46"
                fill="none"
                className="stroke-line"
                strokeWidth="12"
              />
              {entries.map(([key, label]) => {
                const start = offset;
                const percent = (counts[key] / total) * 100;
                offset += percent;
                return (
                  <circle
                    key={key}
                    cx="60"
                    cy="60"
                    r="46"
                    fill="none"
                    className={
                      {
                        positive: "stroke-pos",
                        negative: "stroke-neg",
                        neutral: "stroke-neu",
                      }[key]
                    }
                    strokeWidth="12"
                    pathLength="100"
                    strokeDasharray={`${percent} ${100 - percent}`}
                    strokeDashoffset={-start}
                    transform="rotate(-90 60 60)"
                  >
                    <title>
                      {label} {fmt(counts[key])} ความคิดเห็น ({percent.toFixed(1)}
                      %)
                    </title>
                  </circle>
                );
              })}
              <text
                x="60"
                y="58"
                textAnchor="middle"
                className="fill-primary text-[18px] font-bold"
              >
                {fmt(total)}
              </text>
              <text
                x="60"
                y="71"
                textAnchor="middle"
                className="fill-muted text-[7px]"
              >
                ความคิดเห็นทั้งหมด
              </text>
            </svg>
          </div>
          <div className="mt-auto grid grid-cols-3 gap-3 pt-4">
            {entries.map(([k, l]) => (
              <div key={k}>
                <span className="flex items-center gap-2 text-sm text-muted">
                  <i className={"h-2 w-2 rounded-sm " + colors[k]} />
                  {l}
                </span>
                <b className="mt-1 block text-xl tabular-nums">
                  {((100 * counts[k]) / total).toFixed(1)}%
                </b>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="flex h-full flex-col">
          <SectionTitle icon="model">{result.model}</SectionTitle>
          <dl className="my-4 grid flex-1 content-center divide-y divide-line">
            {entries.map(([k, l]) => (
              <div
                className="flex flex-wrap items-center justify-between gap-2 py-4 text-sm"
                key={k}
              >
                <dt className="flex items-center gap-2">
                  <i className={"h-2 w-2 rounded-sm " + colors[k]} />
                  {l}
                </dt>
                <dd className="text-xl font-bold tabular-nums">
                  {fmt(counts[k])}{" "}
                  <span className="text-sm font-normal text-muted">
                    ({((100 * counts[k]) / total).toFixed(1)}%)
                  </span>
                </dd>
              </div>
            ))}
          </dl>
          <a
            download
            href={"/api/jobs/" + result.id + "/csv"}
            className={primary + " mt-auto w-full"}
          >
            <Icon name="download" className="h-4 w-4" />
            ดาวน์โหลดผลทั้งหมด CSV
          </a>
        </Panel>
      </div>
      <div data-testid="results-comments" className="mt-4">
        <Reveal>
          <CommentTable result={result} />
        </Reveal>
      </div>
    </div>
  );
}
