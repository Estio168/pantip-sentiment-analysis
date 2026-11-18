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
  three,
} from "../../components/UI";
import { labels, colors, fmt } from "../../lib/api";
const entries = Object.entries(labels);
const fills = {
  positive: "fill-pos",
  negative: "fill-neg",
  neutral: "fill-neu",
};
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
      <div className="my-3 grid gap-3 sm:grid-cols-[1fr_minmax(180px,24%)]">
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
              <tr key={r.i} className="border-b border-line">
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
        <p className="py-5 text-center text-muted">
          ไม่พบความคิดเห็นที่ตรงกับตัวกรอง
        </p>
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
        <Title>ผลการวิเคราะห์</Title>
        <Panel className="mx-auto max-w-2xl">
          <SectionTitle icon="results">ยังไม่มีผลการวิเคราะห์</SectionTitle>
          <p className="my-5 text-muted">
            เลือกแหล่งความคิดเห็นและวิเคราะห์เพื่อดูผลที่นี่
          </p>
          <Action />
        </Panel>
      </>
    );
  const total = result.labels.length;
  let offset = 0;
  return (
    <div className="motion-safe:animate-appear">
      <Title info="ผลการวิเคราะห์">{result.source.name}</Title>
      <div className={three}>
        <Panel>
          <SectionTitle icon="source">ข้อมูลที่วิเคราะห์</SectionTitle>
          <p className="mt-4 text-sm text-muted">{result.source.kind}</p>
          <strong className="mt-2 block text-[2.25rem] leading-tight tabular-nums">
            {fmt(total)}
          </strong>
          <p className="mt-2 text-sm text-muted">ความคิดเห็น</p>
          {result.source.note && (
            <p className="mt-4 text-sm text-muted">{result.source.note}</p>
          )}
        </Panel>
        <Panel className="bg-[#0c2025]">
          <SectionTitle icon="results">สัดส่วนความรู้สึก</SectionTitle>
          <div className="mb-3 mt-3">
            <svg
              role="img"
              aria-label="แผนภูมิสัดส่วนความรู้สึก"
              viewBox="0 0 100 12"
              preserveAspectRatio="none"
              className="h-12 w-full overflow-hidden rounded-sm"
            >
              {entries.map(([k, l]) => {
                const x = offset,
                  w = (100 * counts[k]) / total;
                offset += w;
                return (
                  <rect
                    key={k}
                    className={fills[k]}
                    x={x}
                    width={w}
                    height="12"
                  >
                    <title>
                      {l} {counts[k]}
                    </title>
                  </rect>
                );
              })}
            </svg>
            <div className="mt-2 flex justify-between text-xs text-muted tabular-nums">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
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
        <Panel>
          <SectionTitle icon="model">{result.model}</SectionTitle>
          <div className="my-3 divide-y divide-line">
            {entries.map(([k, l]) => (
              <div
                className="flex items-center justify-between py-2 text-sm"
                key={k}
              >
                <span>{l}</span>
                <b className="tabular-nums">
                  {fmt(counts[k])}{" "}
                  <span className="font-normal text-muted">
                    ({((100 * counts[k]) / total).toFixed(1)}%)
                  </span>
                </b>
              </div>
            ))}
          </div>
          <a
            download
            href={"/api/jobs/" + result.id + "/csv"}
            className={primary}
          >
            <Icon name="download" className="h-4 w-4" />
            ดาวน์โหลดผลทั้งหมด CSV
          </a>
        </Panel>
      </div>
      <div className="mt-3">
        <Reveal>
          <CommentTable result={result} />
        </Reveal>
      </div>
    </div>
  );
}
