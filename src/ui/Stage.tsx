// Centre: tool rail, the editing canvas (svgcanvas) and the view bar, plus the repeat and ceramic previews.
import { useEffect, useRef, useState } from "react";
import { MousePointer2, Square, Circle, Minus, PenTool, Pencil, Type, Hexagon, Star, Spline, ZoomIn, ZoomOut, Maximize, Grid2x2, Magnet, Ruler, X } from "lucide-react";
import { KashiEditor, type Tool } from "../editor/engine";
import { getEditor, getState, setEditor, setState, useStore } from "../state/store";
import { boot, documentChanged, refreshFromEditor } from "../state/actions";
import { HelpButton } from "./Help";
import { RepeatPreview } from "./RepeatPreview";
import { CeramicPreview } from "./CeramicPreview";

const TOOLS: { id: Tool; icon: typeof Square; label: string; key: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select and move", key: "V" },
  { id: "rect", icon: Square, label: "Rectangle", key: "R" },
  { id: "ellipse", icon: Circle, label: "Ellipse", key: "E" },
  { id: "polygon", icon: Hexagon, label: "Regular polygon", key: "G" },
  { id: "star", icon: Star, label: "Star", key: "S" },
  { id: "line", icon: Minus, label: "Line", key: "L" },
  { id: "path", icon: PenTool, label: "Pen: click for corners, drag for curves", key: "P" },
  { id: "fhpath", icon: Pencil, label: "Freehand", key: "F" },
  { id: "text", icon: Type, label: "Text", key: "T" },
];

export function Stage() {
  const host = useRef<HTMLDivElement>(null);
  const tool = useStore((s) => s.tool);
  const zoom = useStore((s) => s.zoom);
  const view = useStore((s) => s.view);
  const sel = useStore((s) => s.selection);
  const [, force] = useState(0);

  useEffect(() => {
    if (!host.current || getEditor()) return;
    const ed = new KashiEditor(host.current);
    setEditor(ed);
    (window as unknown as { kashi: KashiEditor }).kashi = ed; // for tests and power users
    ed.on((kind) => {
      refreshFromEditor();
      if (kind === "change" && getState().ready) documentChanged();
    });
    void boot();
    // wheel zoom (Ctrl or Cmd), space-drag pan, pinch zoom
    const el = host.current;
    const wheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      ed.setZoom(ed.zoom * Math.exp(-e.deltaY * 0.0022), { clientX: e.clientX, clientY: e.clientY });
    };
    let space = false, pan: { x: number; y: number; sl: number; st: number } | null = null;
    const kd = (e: KeyboardEvent) => { if (e.code === "Space" && !(e.target as HTMLElement).matches?.("input,textarea,select")) { space = true; el.classList.add("panning"); if (e.target === document.body) e.preventDefault(); } };
    const ku = (e: KeyboardEvent) => { if (e.code === "Space") { space = false; el.classList.remove("panning"); } };
    const md = (e: MouseEvent) => { if (space || e.button === 1) { e.preventDefault(); e.stopPropagation(); pan = { x: e.clientX, y: e.clientY, sl: el.scrollLeft, st: el.scrollTop }; } };
    const mm = (e: MouseEvent) => { if (pan) { e.stopPropagation(); el.scrollLeft = pan.sl - (e.clientX - pan.x); el.scrollTop = pan.st - (e.clientY - pan.y); } };
    const mu = () => { pan = null; };
    let pinch: { d: number; z: number } | null = null;
    const ts = (e: TouchEvent) => { if (e.touches.length === 2) { const [a, b] = [e.touches[0], e.touches[1]]; pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: ed.zoom }; } };
    const tm = (e: TouchEvent) => { if (pinch && e.touches.length === 2) { e.preventDefault(); const [a, b] = [e.touches[0], e.touches[1]]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); ed.setZoom(pinch.z * (d / pinch.d), { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 }); } };
    const te = () => { pinch = null; };
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("mousedown", md, true);
    window.addEventListener("mousemove", mm, true);
    window.addEventListener("mouseup", mu, true);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: false });
    el.addEventListener("touchend", te);
    const ro = new ResizeObserver(() => { if (ed.zoom) ed.setZoom(ed.zoom); });
    ro.observe(el);
    return () => { ro.disconnect(); };
  }, []);

  const ed = getEditor();
  const snap = ed?.snap;
  const toggle = (k: "grid" | "points" | "guides") => {
    if (!ed) return;
    ed.snap[k] = !ed.snap[k];
    if (k === "grid") { ed.canvas.setConfig({ gridSnapping: ed.snap.grid, snappingStep: ed.snap.gridStep }); ed.showGrid = ed.snap.grid; ed.drawOverlay(); }
    force((x) => x + 1);
  };

  return (
    <div className="stage-inner">
      <div className="tool-rail" role="toolbar" aria-label="Drawing tools" aria-orientation="vertical">
        {TOOLS.map((t) => (
          <button key={t.id} className={`rail-btn ${tool === t.id ? "on" : ""}`} onClick={() => ed?.setTool(t.id)} aria-pressed={tool === t.id} aria-label={t.label} data-tip={`${t.label} (${t.key})`}><t.icon size={18} /></button>
        ))}
        <span className="rail-sep" aria-hidden="true" />
        <button className={`rail-btn ${tool === "pathedit" ? "on" : ""}`} onClick={() => { if (!ed?.editNodes()) setState({ toast: "Select a shape or path to edit its nodes." }); }} disabled={!sel.count} aria-label="Edit nodes" data-tip="Edit nodes and curve handles of the selected path (or double-click a path)"><Spline size={18} /></button>
        <HelpButton topic="canvas" />
      </div>
      <div className="canvas-wrap">
        <div className="canvas-host" ref={host} data-testid="canvas-host" />
        {view === "repeat" && <RepeatPreview onClose={() => setState({ view: "flat" })} />}
        {view === "ceramic" && <CeramicPreview onClose={() => setState({ view: "flat" })} />}
        {tool === "pathedit" && (
          <div className="node-bar" role="toolbar" aria-label="Node editing">
            <span className="node-bar-title">Nodes</span>
            <button className="chip" onClick={() => ed?.addNode()} data-tip="Add a node after the selected node">Add node</button>
            <button className="chip" onClick={() => ed?.deleteNode()} data-tip="Delete the selected nodes">Delete node</button>
            <button className="chip" onClick={() => ed?.setSegment(true)} data-tip="Make the segment after the selected node a curve">Curve</button>
            <button className="chip" onClick={() => ed?.setSegment(false)} data-tip="Make the segment after the selected node straight">Straight</button>
            <button className="chip" onClick={() => ed?.smoothNodes()} data-tip="Link the two handles of a node so the curve stays smooth">Smooth</button>
            <button className="chip primary" onClick={() => ed?.setTool("select")}><X size={13} />Done</button>
          </div>
        )}
      </div>
      <div className="view-bar" role="toolbar" aria-label="View and snapping">
        <button className="tb-btn icon-only" onClick={() => ed?.setZoom(ed.zoom / 1.25)} aria-label="Zoom out" data-tip="Zoom out (Ctrl + wheel)"><ZoomOut size={16} /></button>
        <span className="zoom-label" aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button className="tb-btn icon-only" onClick={() => ed?.setZoom(ed.zoom * 1.25)} aria-label="Zoom in" data-tip="Zoom in (Ctrl + wheel)"><ZoomIn size={16} /></button>
        <button className="tb-btn icon-only" onClick={() => ed?.fit()} aria-label="Fit to view" data-tip="Fit the design in view (0)"><Maximize size={16} /></button>
        <span className="tb-sep" aria-hidden="true" />
        <button className={`tb-btn ${snap?.grid ? "on" : ""}`} onClick={() => toggle("grid")} aria-pressed={!!snap?.grid} data-tip="Show the grid and snap to it"><Grid2x2 size={15} /><span>Grid</span></button>
        <label className="grid-step" data-tip="Grid spacing in millimetres">
          <input type="number" min={0.5} max={100} step={0.5} value={snap?.gridStep ?? 5} onChange={(e) => { if (!ed) return; ed.snap.gridStep = Math.max(0.5, Number(e.target.value) || 5); ed.canvas.setConfig({ snappingStep: ed.snap.gridStep }); ed.drawOverlay(); force((x) => x + 1); }} aria-label="Grid spacing in mm" /> mm
        </label>
        <button className={`tb-btn ${snap?.points ? "on" : ""}`} onClick={() => toggle("points")} aria-pressed={!!snap?.points} data-tip="Snap to the tile, its centre and other objects"><Magnet size={15} /><span>Points</span></button>
        <button className={`tb-btn ${snap?.guides ? "on" : ""}`} onClick={() => toggle("guides")} aria-pressed={!!snap?.guides} data-tip="Snap to guides (add guides in Tools)"><Ruler size={15} /><span>Guides</span></button>
        <div className="segmented phone-only" role="group" aria-label="View">
          {(["flat", "repeat", "ceramic"] as const).map((v) => <button key={v} className={view === v ? "on" : ""} onClick={() => setState({ view: v })} aria-pressed={view === v}>{v === "flat" ? "Vector" : v === "repeat" ? "Repeat" : "Ceramic"}</button>)}
        </div>
        <span className="doc-size" data-tip="Document size">{ed ? `${fmtLen(ed.meta.w, ed.meta.units)} × ${fmtLen(ed.meta.h, ed.meta.units)}` : ""}</span>
      </div>
    </div>
  );
}

export const fmtLen = (mm: number, units: "mm" | "cm") => (units === "cm" ? `${(mm / 10).toFixed(mm % 10 ? 1 : 0)} cm` : `${Math.round(mm * 10) / 10} mm`);
