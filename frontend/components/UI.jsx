"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const paths = {
  refresh:
    "M20 7v5h-5 M4 17v-5h5 M6.1 7a7 7 0 0 1 11.55-2.4L20 7 M4 17l2.35 2.4A7 7 0 0 0 17.9 17",
  overview: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  analyzer: "M3 12h4l3-7 4 14 3-7h4",
  results: "M4 20h16 M7 16v-4 M12 16V5 M17 16V9",
  training: "M8 4h8 M10 4v6L4 20h16l-6-10V4 M7 15h10",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  source: "M3 7h7l2 2h9v10H3z M3 7V5h7l2 2",
  model: "M7 7h10v10H7z M9 3v4m5-4v4m-5 10v4m5-4v4M3 9h4m-4 5h4m10-5h4m-4 5h4",
  arrow: "M4 12h15m-6-6 6 6-6 6",
  scan: "M3 9V3h6m6 0h6v6m0 6v6h-6m-6 0H3v-6 M6 12h12",
  file: "M5 3h9l5 5v13H5z M14 3v6h5 M8 13h8m-8 4h6",
  download: "M12 3v12m-5-5 5 5 5-5 M4 16v5h16v-5",
  check: "m4 12 5 5L20 6",
  close: "m5 5 14 14m0-14L5 19",
  link: "m9 15 6-6m-6 1 3-3a4 4 0 0 1 6 6l-3 3m0-2-3 3a4 4 0 0 1-6-6l3-3",
  layers: "m3 8 9-5 9 5-9 5z M3 12l9 5 9-5 M3 16l9 5 9-5",
  message: "M3 4h18v13H9l-6 4z",
  signal: "M3 17v3m5-8v8m5-13v13m5-18v18",
};
export function Icon({ name, className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={"shrink-0 " + className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  );
}
export const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-aqua";
export const primary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-aqua px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-hover disabled:cursor-not-allowed disabled:opacity-40 " +
  focus;
export const secondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-panel px-4 py-2.5 text-sm transition hover:border-aqua hover:text-aqua disabled:opacity-40 " +
  focus;
export const field =
  "min-h-11 min-w-0 rounded-md border border-line bg-ink px-3 py-2 text-sm text-primary " +
  focus;
export const three =
  "grid min-w-0 items-start gap-4 console:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)_minmax(0,1fr)]";
export function Title({ children, info, subtitle }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 [overflow-wrap:anywhere]">
        <h1 className="text-[26px] font-bold leading-snug sm:text-title">
          {children}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-muted">{subtitle}</p>
        )}
      </div>
      {info && (
        <span className="rounded-md border border-line bg-panel px-3 py-1.5 text-sm text-muted">
          {info}
        </span>
      )}
    </div>
  );
}
export function Panel({ children, className = "", compact = false }) {
  return (
    <section
      className={
        "min-w-0 rounded-card border border-line bg-panel p-4 shadow-panel [overflow-wrap:anywhere] " +
        (compact ? "console:p-3 short:p-2.5 " : "sm:p-5 ") +
        className
      }
    >
      {children}
    </section>
  );
}
export function SectionTitle({ icon, children, compact = false }) {
  return (
    <h2
      className={
        "mb-3 flex items-center gap-2 border-b border-line pb-3 text-base font-bold " +
        (compact
          ? "console:mb-1.5 short:mb-1 console:pb-1 console:text-sm console:leading-5"
          : "")
      }
    >
      <Icon name={icon} className="h-4 w-4 text-aqua" />
      {children}
    </h2>
  );
}
export function Action({
  href = "/analyzer",
  children = "วิเคราะห์ความคิดเห็น",
  compact = false,
}) {
  return (
    <Link
      className={
        primary +
        (compact ? " console:min-h-9 console:px-3 console:py-1.5" : "")
      }
      href={href}
    >
      {children}
      <Icon name="arrow" className="h-4 w-4" />
    </Link>
  );
}
export function Notice({ children }) {
  return (
    <p
      role="alert"
      className="my-4 rounded-lg border border-neg/50 bg-neg/10 p-4 text-sm text-[#ffd0cb]"
    >
      {children}
    </p>
  );
}
export function Reveal({ children }) {
  const ref = useRef(null);
  const [visible, set] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (
      !window.IntersectionObserver ||
      matchMedia("(prefers-reduced-motion: reduce)").matches ||
      el.getBoundingClientRect().top < innerHeight
    )
      return;
    set(false);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          set(true);
          io.disconnect();
        }
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      data-reveal={visible ? "shown" : "waiting"}
      onFocusCapture={() => set(true)}
      className={
        "min-w-0 transition-[opacity,transform] duration-300 ease-out motion-reduce:transform-none motion-reduce:opacity-100 " +
        (visible ? "translate-y-0 opacity-100" : "translate-y-2.5 opacity-0")
      }
    >
      {children}
    </div>
  );
}

export function Metric({ icon, label, value, detail, numeric = false }) {
  return (
    <Panel className="h-full">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <span>{label}</span>
        <Icon name={icon} className="h-4 w-4 text-aqua" />
      </div>
      <p
        className={
          "mt-3 min-h-10 break-words font-bold leading-10 tabular-nums " +
          (numeric ? "text-[32px]" : "text-2xl")
        }
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-muted [overflow-wrap:anywhere]">
        {detail}
      </p>
    </Panel>
  );
}
export function EmptyState({ icon = "results", title, children, action }) {
  return (
    <Panel className="mx-auto max-w-[560px] text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-aqua/10 text-aqua">
        <Icon name={icon} className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mb-6 mt-2 text-sm leading-relaxed text-muted">{children}</p>
      {action}
    </Panel>
  );
}

export function Status({ state = "idle", children, compact = false }) {
  const tones = {
    ready: "border-aqua/30 bg-aqua/5 text-aqua",
    error: "border-neg/30 bg-neg/5 text-neg",
    pending: "border-neu/30 bg-neu/5 text-neu",
    idle: "border-line bg-ink/50 text-muted",
  };
  return (
    <span
      className={
        "inline-flex items-center gap-2 rounded-sm border px-2 py-1 text-xs " +
        (compact ? "console:py-0.5 " : "") +
        tones[state]
      }
    >
      <i
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
      />
      {children}
    </span>
  );
}
