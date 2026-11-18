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
export default function Scan({
  working = false,
  expanded = false,
  className = "",
}) {
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
      className={
        "relative flex h-[340px] min-w-0 flex-col overflow-hidden rounded-card border border-[#305156] bg-ink sm:h-[440px] " +
        (expanded
          ? "console:h-auto console:min-h-[clamp(440px,calc(100dvh-180px),720px)] console:self-stretch "
          : "console:h-[clamp(560px,72dvh,720px)] ") +
        className
      }
      aria-label="ภาพสแกนสมองสามมิติ"
    >
      <div className="flex items-center justify-between gap-2 border-b border-line bg-panel px-4 py-3 console:py-2">
        <h2 className="flex items-center gap-2 text-xs font-bold tracking-[.08em] sm:text-sm">
          <Icon name="scan" className="h-4 w-4 text-aqua" />
          NEURAL SENTIMENT SCAN
        </h2>
        <span className="text-[10px] font-bold tracking-[.18em] text-aqua">
          3D
        </span>
      </div>
      <div
        data-testid="brain-viewport"
        data-mode={ready ? "3d" : "poster"}
        className="relative min-h-0 flex-1 overflow-hidden bg-black"
      >
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
      <div className="flex items-center justify-between gap-2 border-t border-line bg-panel px-4 py-2.5 console:py-1.5 text-xs text-muted">
        <span className="flex items-center gap-2">
          <i className="h-1.5 w-1.5 rounded-full bg-aqua" />
          {working ? "กำลังวิเคราะห์" : "โหมดภาพรวม"}
        </span>
        <span>{ready ? "มุมมองสามมิติ" : failed ? "ภาพสำรอง" : "ภาพสมอง"}</span>
      </div>
    </section>
  );
}
