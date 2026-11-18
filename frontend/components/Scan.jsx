"use client";
import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useState } from "react";
import { Icon } from "./UI";
const Scene = dynamic(() => import("./BrainScene"), { ssr: false });
class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onLost();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export default function Scan({ working = false }) {
  const [motion, setMotion] = useState(false),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setMotion(!mq.matches);
      if (mq.matches) setReady(false);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const onReady = useCallback(() => setReady(true), []),
    onLost = useCallback(() => {
      setReady(false);
      setFailed(true);
    }, []);
  return (
    <section
      className="relative flex min-h-[clamp(240px,64vw,360px)] flex-col overflow-hidden rounded-md border border-[#305156] bg-[#071318] xl:h-[clamp(320px,52dvh,400px)] xl:min-h-0 xl:self-start"
      aria-label="ภาพสแกนสมองสามมิติ"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line bg-[#101e23] px-3 py-1.5">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Icon name="scan" className="h-4 w-4 text-aqua" />
          ภาพสแกนสมอง
        </h2>
        <span className="text-[10px] font-bold tracking-[.18em] text-aqua">
          NEURAL SCAN
        </span>
      </div>
      <div
        data-testid="brain-viewport"
        data-mode={ready ? "3d" : "poster"}
        className="relative min-h-0 flex-1 overflow-hidden bg-scan bg-[size:32px_32px]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,88,97,.25),transparent_68%)]"
        />
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 aspect-square h-[82%] max-w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#4e8990]/25 before:absolute before:inset-[7%] before:rounded-full before:border before:border-dashed before:border-[#4e8990]/25"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-[3%] top-1/2 border-t border-aqua/10"
        />
        <div
          aria-hidden="true"
          className="absolute inset-y-[3%] left-1/2 border-l border-aqua/10"
        />
        {!ready && (
          <img
            alt="ภาพสมองสามมิติ"
            src="/brain-poster.png"
            className="absolute inset-0 h-full w-full object-contain mix-blend-screen"
          />
        )}
        {motion && !failed && (
          <div className="absolute inset-0">
            <Boundary onLost={onLost}>
              <Scene onReady={onReady} onLost={onLost} />
            </Boundary>
          </div>
        )}
        {[
          "left-3 top-3 border-l border-t",
          "right-3 top-3 border-r border-t",
          "left-3 bottom-3 border-l border-b",
          "right-3 bottom-3 border-r border-b",
        ].map((c) => (
          <i
            key={c}
            aria-hidden="true"
            className={
              "pointer-events-none absolute h-4 w-4 border-aqua/80 " + c
            }
          />
        ))}
        <div
          aria-hidden="true"
          className="absolute bottom-5 left-6 flex gap-1 text-[10px] font-bold tracking-[.13em] text-muted"
        >
          <span className="text-aqua">Y</span> ↑
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line bg-[#0c191e] px-3 py-1.5 text-xs text-muted">
        <span className="flex items-center gap-2">
          <i className="h-1.5 w-1.5 rounded-full bg-aqua" />
          {working ? "กำลังวิเคราะห์" : "โหมดภาพรวม"}
        </span>
        <span>{ready ? "มุมมองสามมิติ" : failed ? "ภาพสำรอง" : "ภาพสมอง"}</span>
      </div>
    </section>
  );
}
