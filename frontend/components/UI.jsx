"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const paths = {
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
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-aqua px-4 py-2 xl:min-h-9 xl:py-1.5 text-sm font-bold text-ink transition hover:bg-[#a2fff2] disabled:cursor-not-allowed disabled:opacity-40 " +
  focus;
export const secondary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-sm transition xl:min-h-9 xl:py-1.5 hover:border-aqua hover:text-aqua disabled:opacity-40 " +
  focus;
export const field =
  "min-h-11 min-w-0 xl:min-h-9 xl:py-1.5 rounded-md border border-line bg-ink px-3 py-2 text-sm text-white " +
  focus;
export const three =
  "grid min-w-0 items-stretch gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,2.4fr)_minmax(0,1fr)]";
export function Title({ children, info }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-line pb-2">
      <h1 className="min-w-0 text-[clamp(1.5rem,2vw,1.875rem)] font-bold leading-snug [overflow-wrap:anywhere]">
        {children}
      </h1>
      {info && <span className="text-sm text-muted">{info}</span>}
    </div>
  );
}
export function Panel({ children, className = "" }) {
  return (
    <section
      className={
        "min-w-0 rounded-md border border-line bg-panel p-3.5 sm:p-4 [overflow-wrap:anywhere] " + className
      }
    >
      {children}
    </section>
  );
}
export function SectionTitle({ icon, children }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-bold">
      <Icon name={icon} className="h-4 w-4 text-aqua" />
      {children}
    </h2>
  );
}
export function Action({
  href = "/analyzer",
  children = "วิเคราะห์ความคิดเห็น",
}) {
  return (
    <Link className={primary} href={href}>
      {children}
      <Icon name="arrow" className="h-4 w-4" />
    </Link>
  );
}
export function Notice({ children }) {
  return (
    <p
      role="alert"
      className="my-3 rounded border border-neg/50 bg-neg/10 p-3 text-sm text-[#ffd0cb]"
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
        "transition-[opacity,transform] duration-300 ease-out motion-reduce:transform-none motion-reduce:opacity-100 " +
        (visible ? "translate-y-0 opacity-100" : "translate-y-2.5 opacity-0")
      }
    >
      {children}
    </div>
  );
}
