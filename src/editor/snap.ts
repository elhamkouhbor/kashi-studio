// Snapping to guides, the tile and other objects. svgcanvas snaps to its grid itself; this layer adds
// point and guide snapping by adjusting the pointer position before svgcanvas sees it, so moves and new
// shapes land exactly on the targets and the result is one ordinary edit.
import type { KashiEditor } from "./engine";

export interface SnapOptions { grid: boolean; gridStep: number; points: boolean; guides: boolean; tolerancePx: number }

interface Targets { xs: number[]; ys: number[]; pts: [number, number][] }

function targets(ed: KashiEditor, exclude: Set<Element>): Targets {
  const { w, h } = ed.meta.tile;
  const xs: number[] = [], ys: number[] = [], pts: [number, number][] = [];
  if (ed.snap.guides) { xs.push(...ed.meta.guides.x); ys.push(...ed.meta.guides.y); }
  if (ed.snap.points) {
    for (const x of [0, w / 2, w, ed.meta.w]) xs.push(x);
    for (const y of [0, h / 2, h, ed.meta.h]) ys.push(y);
    for (const x of [0, w / 2, w]) for (const y of [0, h / 2, h]) pts.push([x, y]);
    const layer = ed.layerGroup("ornament");
    const kids = layer ? [...layer.children].filter((c) => c.tagName !== "title" && !exclude.has(c)).slice(0, 400) : [];
    for (const k of kids) {
      try {
        const b = ed.canvas.getStrokedBBox([k]);
        if (!b) continue;
        xs.push(b.x, b.x + b.width / 2, b.x + b.width);
        ys.push(b.y, b.y + b.height / 2, b.y + b.height);
        pts.push([b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height], [b.x + b.width / 2, b.y + b.height / 2]);
      } catch { /* hidden or empty */ }
    }
  }
  if (ed.snap.guides) for (const x of ed.meta.guides.x) for (const y of ed.meta.guides.y) pts.push([x, y]);
  return { xs, ys, pts };
}

const nearest = (v: number, list: number[], tol: number) => {
  let best = 0, bd = tol;
  for (const t of list) { const d = t - v; if (Math.abs(d) < bd) { bd = Math.abs(d); best = d; } }
  return bd < tol ? best : 0;
};

/** Snap a single canvas point (for drawing tools). */
export function snapPoint(ed: KashiEditor, p: [number, number], exclude = new Set<Element>()): [number, number] {
  if (!ed.snap.points && !ed.snap.guides) return p;
  const tol = ed.snap.tolerancePx / ed.zoom;
  const T = targets(ed, exclude);
  let best: [number, number] | null = null, bd = tol;
  for (const q of T.pts) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = q; } }
  if (best) return [best[0], best[1]];
  return [p[0] + nearest(p[0], T.xs, tol), p[1] + nearest(p[1], T.ys, tol)];
}

export function installSnapping(ed: KashiEditor): () => void {
  let drag: { start: [number, number]; box: { x: number; y: number; width: number; height: number } | null; T: Targets | null } | null = null;
  const redispatch = (e: MouseEvent, x: number, y: number) => {
    const [cx, cy] = ed.canvasToClient(x, y);
    if (Math.abs(cx - e.clientX) < 0.01 && Math.abs(cy - e.clientY) < 0.01) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    const ev = new MouseEvent(e.type, { bubbles: true, cancelable: true, clientX: cx, clientY: cy, screenX: e.screenX, screenY: e.screenY, button: e.button, buttons: e.buttons, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, altKey: e.altKey, metaKey: e.metaKey, detail: e.detail, view: window });
    (e.target as Element).dispatchEvent(ev);
  };
  const handler = (e: MouseEvent) => {
    if (!e.isTrusted || ed.customTool) return;
    if (!ed.snap.points && !ed.snap.guides) return;
    const mode = ed.canvas.getMode();
    const p = ed.clientToCanvas(e.clientX, e.clientY);
    if (mode === "select") {
      if (e.type === "mousedown") { drag = { start: p, box: null, T: null }; return; }
      if (!drag || !(e.buttons & 1) && e.type === "mousemove") { if (e.type !== "mouseup") drag = null; return; }
      const sel = ed.selected();
      if (!sel.length) return;
      if (!drag.box) {
        try { drag.box = ed.canvas.getStrokedBBox(sel); } catch { drag.box = null; }
        if (!drag.box) return;
        drag.T = targets(ed, new Set(sel));
      }
      const tol = ed.snap.tolerancePx / ed.zoom;
      const dx = p[0] - drag.start[0], dy = p[1] - drag.start[1];
      const b = drag.box, T = drag.T!;
      let sx = 0, sy = 0, bx = tol, by = tol;
      for (const v of [b.x, b.x + b.width / 2, b.x + b.width]) { const d = nearest(v + dx, T.xs, tol); if (d && Math.abs(d) < bx) { bx = Math.abs(d); sx = d; } }
      for (const v of [b.y, b.y + b.height / 2, b.y + b.height]) { const d = nearest(v + dy, T.ys, tol); if (d && Math.abs(d) < by) { by = Math.abs(d); sy = d; } }
      if (e.type === "mouseup") drag = null;
      if (sx || sy) redispatch(e, p[0] + sx, p[1] + sy);
      return;
    }
    if (["rect", "ellipse", "line", "path", "text"].includes(mode)) {
      const q = snapPoint(ed, p);
      if (q[0] !== p[0] || q[1] !== p[1]) redispatch(e, q[0], q[1]);
    }
  };
  const opts = { capture: true } as const;
  ed.inner.addEventListener("mousedown", handler, opts);
  ed.inner.addEventListener("mousemove", handler, opts);
  ed.inner.addEventListener("mouseup", handler, opts);
  return () => {
    ed.inner.removeEventListener("mousedown", handler, opts);
    ed.inner.removeEventListener("mousemove", handler, opts);
    ed.inner.removeEventListener("mouseup", handler, opts);
  };
}
