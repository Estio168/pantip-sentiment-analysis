"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
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
          "relative flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm transition-colors hover:bg-aqua/5 hover:text-aqua motion-reduce:transition-none " +
          focus +
          " " +
          (mobile ? "justify-start " : "justify-center ") +
          (i === index ? "font-bold text-aqua" : "text-muted")
        }
      >
        <Icon name={icon} className="h-4 w-4" />
        {title}
      </Link>
    ));
  }
  return (
    <header className="sticky top-0 z-40 bg-ink px-4 pt-2">
      <div
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) {
            setOpen(false);
            toggle.current.focus();
          }
        }}
        className="relative mx-auto flex w-fit max-w-full items-center justify-center rounded-[22px] border border-line bg-[#10161a] p-1.5 md:px-3"
      >
        <nav
          aria-label="เมนูหลัก"
          className="hidden w-fit items-center gap-1 md:flex"
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
            "absolute left-1/2 top-[calc(100%+8px)] w-64 max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-xl border border-line bg-[#10161a] p-2 shadow-xl md:hidden"
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
  const [modelLoading, setModelLoading] = useState(true);
  const refreshModel = useCallback(async () => {
    setModelLoading(true);
    setModelError("");
    try {
      setReport(await api("/model"));
    } catch (e) {
      setModelError(e.message);
    } finally {
      setModelLoading(false);
    }
  }, []);
  useEffect(() => {
    refreshModel();
  }, [refreshModel]);
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
        modelLoading,
        refreshModel,
        begin,
        finish,
      }}
    >
      <a
        href="#main-content"
        className="sr-only z-50 rounded bg-aqua p-3 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-2"
      >
        ข้ามไปเนื้อหาหลัก
      </a>
      <Header />
      <main
        id="main-content"
        className="mx-auto w-full max-w-dashboard px-4 pb-3 pt-3 sm:px-6"
      >
        <div className="min-w-0">{children}</div>
      </main>
    </Context.Provider>
  );
}
