"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "../lib/api";
import { Icon, focus } from "./UI";
const Context = createContext(null);
export const useConsole = () => useContext(Context);
const pages = [
  ["/", "ภาพรวม", "overview"],
  ["/analyzer", "วิเคราะห์ความคิดเห็น", "analyzer"],
  ["/results", "ผลการวิเคราะห์", "results"],
  ["/training", "ฝึกโมเดล", "training"],
];
function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef(null);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  const index = Math.max(
    0,
    pages.findIndex(
      ([url]) => url === (path === "/processing" ? "/analyzer" : path),
    ),
  );
  function links(mobile) {
    return pages.map(([href, title, icon], i) => (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        aria-current={i === index ? "page" : undefined}
        className={
          "relative flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-sm transition-colors hover:bg-aqua/5 hover:text-aqua md:min-h-10 motion-reduce:transition-none " +
          focus +
          " " +
          (mobile ? "justify-start " : "justify-center ") +
          (i === index ? "bg-aqua/[.07] font-bold text-aqua shadow-[inset_0_-2px_0_currentColor]" : "text-muted")
        }
      >
        <Icon name={icon} className="h-4 w-4 md:h-3.5 md:w-3.5" />
        {title}
      </Link>
    ));
  }
  return (
    <header className="sticky top-0 z-40 bg-ink/90 py-1.5 backdrop-blur-xl md:py-[5px]">
      <div
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            setOpen(false);
            toggle.current.focus();
          }
        }}
        className="relative mx-auto flex w-fit max-w-[94%] justify-center rounded-xl border border-line bg-[#101b20]/95 p-1 shadow-lg md:p-0.5"
      >
        <nav
          aria-label="เมนูหลัก"
          className="hidden w-fit items-center gap-0.5 rounded-lg md:flex"
        >
          {links(false)}
        </nav>
        <button
          ref={toggle}
          aria-controls="mobile-nav"
          aria-expanded={open}
          aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
          onClick={() => setOpen(!open)}
          className={
            "flex min-h-11 items-center gap-2 rounded-md px-4 text-sm font-bold text-aqua md:hidden " +
            focus
          }
        >
          <Icon name={open ? "close" : "menu"} /> เมนู
        </button>
        <nav
          id="mobile-nav"
          aria-label="เมนูมือถือ"
          hidden={!open}
          className={
            (open ? "grid " : "hidden ") +
            "absolute left-1/2 top-[calc(100%+6px)] w-56 max-w-[94vw] -translate-x-1/2 rounded-lg border border-line bg-panel p-2 shadow-xl md:hidden"
          }
        >
          {links(true)}
        </nav>
      </div>
    </header>
  );
}
export function ConsoleProvider({ children }) {
  const [source, setSource] = useState(null),
    [result, setResult] = useState(null),
    [job, setJob] = useState(null),
    [report, setReport] = useState(null),
    [modelError, setModelError] = useState("");
  const router = useRouter(),
    pending = useRef(null);
  useEffect(() => {
    api("/model")
      .then(setReport)
      .catch((e) => setModelError(e.message));
  }, []);
  function begin() {
    if (!source?.total) return;
    if (pending.current?.source.id !== source.id) {
      pending.current = { id: crypto.randomUUID(), source };
      setJob(pending.current);
    }
    router.push("/processing");
  }
  function finish() {
    pending.current = null;
    setJob(null);
  }
  return (
    <Context.Provider
      value={{
        source,
        setSource,
        result,
        setResult,
        job,
        report,
        setReport,
        modelError,
        begin,
        finish,
      }}
    >
      <Header />
      <main className="px-4 pb-4 pt-2 sm:px-6">
        <div className="mx-auto w-full max-w-screen-xl">{children}</div>
      </main>
    </Context.Provider>
  );
}
