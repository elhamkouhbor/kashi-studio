// Contextual help: one tooltip layer for every element with data-tip (hover, keyboard focus, long
// press on touch), the per-section "?" buttons and the help dialog.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CircleHelp, X } from "lucide-react";
import { HELP, HELP_ORDER, type HelpTopic } from "./helpText";

const TIP_ID = "kashi-tooltip";
export function TooltipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null);
  const target = useRef<HTMLElement | null>(null);
  useEffect(() => {
    let timer = 0, press = 0;
    const show = (el: HTMLElement) => {
      const text = el.getAttribute("data-tip"); if (!text) return;
      target.current = el;
      el.setAttribute("aria-describedby", TIP_ID);
      const r = el.getBoundingClientRect();
      const below = r.top < 70;
      setTip({ text, x: Math.min(window.innerWidth - 150, Math.max(150, r.left + r.width / 2)), y: below ? r.bottom + 6 : r.top - 6, below });
    };
    const hide = () => { clearTimeout(timer); target.current?.removeAttribute("aria-describedby"); target.current = null; setTip(null); };
    const tipTarget = (e: Event) => (e.target instanceof Element ? (e.target.closest("[data-tip]") as HTMLElement | null) : null);
    const over = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const el = tipTarget(e);
      if (el === target.current) return;
      clearTimeout(timer);
      if (!el) { hide(); return; }
      timer = window.setTimeout(() => show(el), target.current ? 80 : 450);
    };
    const focusIn = (e: FocusEvent) => { const el = tipTarget(e); if (el && (e.target as HTMLElement).matches?.(":focus-visible")) show(el); };
    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse") { hide(); return; }
      const el = tipTarget(e); clearTimeout(press);
      if (el) press = window.setTimeout(() => { show(el); timer = window.setTimeout(hide, 3500); }, 550);
    };
    const up = () => clearTimeout(press);
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") hide(); };
    const opts = { capture: true, passive: true } as const;
    document.addEventListener("pointerover", over, opts);
    document.addEventListener("focusin", focusIn, true); document.addEventListener("focusout", hide, true);
    document.addEventListener("pointerdown", down, opts); document.addEventListener("pointerup", up, opts);
    document.addEventListener("keydown", key); window.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("pointerover", over, opts);
      document.removeEventListener("focusin", focusIn, true); document.removeEventListener("focusout", hide, true);
      document.removeEventListener("pointerdown", down, opts); document.removeEventListener("pointerup", up, opts);
      document.removeEventListener("keydown", key); window.removeEventListener("scroll", hide, true);
    };
  }, []);
  if (!tip) return null;
  return <div id={TIP_ID} role="tooltip" className={`tooltip ${tip.below ? "below" : ""}`} style={{ left: tip.x, top: tip.y }}>{tip.text}</div>;
}

let openTopic: HelpTopic | null = null;
const subs = new Set<() => void>();
export function openHelp(t: HelpTopic = "start") { openTopic = t; subs.forEach((f) => f()); }
const closeHelp = () => { openTopic = null; subs.forEach((f) => f()); };

export function HelpButton({ topic, label }: { topic: HelpTopic; label?: string }) {
  return <button className="help-q" onClick={() => openHelp(topic)} aria-label={`Help: ${label ?? HELP[topic].title}`} data-tip={`Help: ${HELP[topic].title}`}><CircleHelp size={15} /></button>;
}

export function HelpDialog() {
  const topic = useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => openTopic);
  useEffect(() => {
    if (!topic) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") closeHelp(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [topic]);
  if (!topic) return null;
  const h = HELP[topic];
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeHelp(); }}>
      <div className="modal help" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <div className="modal-head"><h2 id="help-title">{h.title}</h2><button className="tb-btn icon-only" onClick={closeHelp} aria-label="Close help" autoFocus><X size={17} /></button></div>
        <p className="help-intro">{h.intro}</p>
        <ul className="help-list">{h.items.map(([b, t], i) => <li key={i}><b>{b}</b> {t}</li>)}</ul>
        {h.tip && <p className="help-tip">{h.tip}</p>}
        <div className="help-topics">{HELP_ORDER.map((k) => <button key={k} className={`chip ${k === topic ? "on" : ""}`} onClick={() => openHelp(k)}>{HELP[k].title}</button>)}</div>
      </div>
    </div>
  );
}
