import { labels, colors, fmt } from "../lib/api";
const strokes = {
  positive: "stroke-pos",
  negative: "stroke-neg",
  neutral: "stroke-neu",
};
const arc = "M 24 120 A 96 96 0 0 1 216 120";

export default function SentimentGauge({ counts, total }) {
  let offset = 0;
  return (
    <>
      <svg
        role="img"
        aria-label={
          total
            ? `สัดส่วนความรู้สึกจาก ${fmt(total)} ความคิดเห็น`
            : "ยังไม่มีผลวิเคราะห์ความรู้สึก"
        }
        viewBox="0 0 240 144"
        className="mx-auto my-auto w-full max-w-[280px] shrink-0"
      >
        <path d={arc} fill="none" className="stroke-line" strokeWidth="20" />
        {total > 0 &&
          Object.entries(labels).map(([key, label]) => {
            const percent = (counts[key] / total) * 100;
            const start = offset;
            offset += percent;
            return (
              <path
                key={key}
                data-sentiment={key}
                d={arc}
                fill="none"
                className={strokes[key]}
                strokeWidth="20"
                pathLength="100"
                strokeDasharray={`${percent} ${100 - percent}`}
                strokeDashoffset={-start}
              >
                <title>
                  {label} {fmt(counts[key])} ความคิดเห็น ({percent.toFixed(1)}%)
                </title>
              </path>
            );
          })}
        <text
          x="120"
          y="92"
          textAnchor="middle"
          className="fill-primary text-[28px] font-bold"
        >
          {total ? fmt(total) : "—"}
        </text>
        <text
          x="120"
          y="114"
          textAnchor="middle"
          className="fill-muted text-[11px]"
        >
          {total ? "ความคิดเห็นทั้งหมด" : "รอผลการวิเคราะห์"}
        </text>
      </svg>
      <dl className="mt-auto space-y-2 pt-2">
        {Object.entries(labels).map(([key, label]) => (
          <div
            key={key}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <dt className="flex items-center gap-2 text-muted">
              <i className={"h-2 w-2 rounded-sm " + colors[key]} />
              {label}
            </dt>
            <dd className="tabular-nums">
              {total
                ? `${fmt(counts[key])} · ${((counts[key] / total) * 100).toFixed(1)}%`
                : "—"}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
