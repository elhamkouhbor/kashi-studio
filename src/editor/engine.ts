// The editor: SVG-Edit's svgcanvas engine (selection, transforms, pen and node editing, layers, undo,
// import and export) wrapped with the operations Kashi Studio adds: generated ornament groups that can
// be regenerated, layer locking, distribution, booleans, symmetry, the ornament brush, recolouring,
// guides and snapping. Nothing here renders interface; React talks to this class.
import SvgCanvas from "@svgedit/svgcanvas/svgcanvas.js";
import { BatchCommand, ChangeElementCommand, InsertElementCommand, MoveElementCommand, RemoveElementCommand } from "@svgedit/svgcanvas/core/history.js";
import { generate, newUid, type DocMeta, defaultMeta, LAYERS, type LayerKey } from "./document";
import { serialize, type SvgNode } from "../ornament/node";
import type { Params } from "../generators/types";
import { installSnapping, snapPoint, type SnapOptions } from "./snap";

const SVGNS = "http://www.w3.org/2000/svg";
const XLINK = "http://www.w3.org/1999/xlink";

export type Tool = "select" | "rect" | "ellipse" | "line" | "path" | "fhpath" | "text" | "zoom" | "polygon" | "star";
export interface SelectionInfo {
  count: number;
  tags: string[];
  generator?: { id: string; params: Params; palette: string; elem: SVGGElement };
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeLinejoin?: string;
  opacity?: number;
  bbox?: { x: number; y: number; width: number; height: number };
  inLockedLayer?: boolean;
  isPath: boolean;
  isGroup: boolean;
  symmetry?: { n: number; mirror: boolean };
}
export interface LayerInfo { name: string; key?: LayerKey; visible: boolean; locked: boolean; current: boolean; count: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Canvas = any;

export class KashiEditor {
  canvas: Canvas;
  host: HTMLElement;
  inner: HTMLDivElement;
  meta: DocMeta = defaultMeta();
  zoom = 1;
  snap: SnapOptions = { grid: false, gridStep: 5, points: true, guides: true, tolerancePx: 7 };
  showGrid = false;
  private listeners = new Set<(kind: "selection" | "change" | "zoom" | "mode") => void>();
  private overlay!: SVGGElement;
  private polyStart: [number, number] | null = null;
  private polyEl: SVGPathElement | null = null;
  polygonSides = 6;
  starRatio = 0.5;
  private uninstallSnap: () => void = () => undefined;

  constructor(host: HTMLElement) {
    this.host = host;
    this.inner = document.createElement("div");
    this.inner.className = "kc-inner";
    host.appendChild(this.inner);
    const hidden = document.createElement("input");
    hidden.id = "kashi-text-input";
    hidden.setAttribute("aria-hidden", "true");
    hidden.tabIndex = -1;
    hidden.style.cssText = "position:absolute;width:0;height:0;opacity:0;pointer-events:none";
    host.appendChild(hidden);
    this.canvas = new SvgCanvas(this.inner, {
      initFill: { color: "1D3C86", opacity: 1 },
      initStroke: { color: "22201F", opacity: 1, width: 0.5 },
      text: { stroke_width: 0, font_size: 12, font_family: "Vazirmatn, 'Noto Naskh Arabic', serif" },
      initOpacity: 1,
      dimensions: [200, 200],
      baseUnit: "px",
      gridSnapping: false,
      snappingStep: 5,
      showRulers: false,
      imgPath: "",
      selectNew: true,
    });
    this.canvas.textActions?.setInputElem?.(hidden);
    // svgcanvas can be asked to node-edit a non-path (e.g. a double-click that lands on another shape
    // right after drawing); that throws inside the engine, so only real paths enter node editing
    const pa = this.canvas.pathActions;
    const toEdit = pa.toEditMode.bind(pa);
    pa.toEditMode = (el: Element) => (el?.tagName === "path" ? toEdit(el) : undefined);
    hidden.addEventListener("input", () => this.canvas.setTextContent(hidden.value));
    hidden.addEventListener("keyup", () => this.canvas.setTextContent(hidden.value));
    for (const ev of ["selected", "changed", "elementChanged"]) this.canvas.bind(ev, () => this.emit(ev === "selected" ? "selection" : "change"));
    this.canvas.bind("zoomed", () => this.emit("zoom"));
    this.canvas.bind("contextset", () => this.emit("selection"));
    this.overlay = document.createElementNS(SVGNS, "g");
    this.overlay.id = "kashi-overlay";
    this.overlay.setAttribute("pointer-events", "none");
    this.canvas.getSvgRoot().appendChild(this.overlay);
    this.uninstallSnap = installSnapping(this);
    this.installPolygonTool();
    // selection guard: elements in locked layers cannot be selected
    this.canvas.bind("selected", () => {
      const sel = this.selected();
      const locked = sel.filter((e) => this.layerOf(e)?.getAttribute("data-locked") === "1");
      if (locked.length && locked.length === sel.length) this.canvas.clearSelection();
    });
  }

  destroy() { this.uninstallSnap(); }

  on(fn: (kind: "selection" | "change" | "zoom" | "mode") => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(kind: "selection" | "change" | "zoom" | "mode") { for (const l of this.listeners) l(kind); this.drawOverlay(); }

  // ------------------------------------------------------------------ document

  load(svg: string, meta?: DocMeta) {
    this.canvas.clearSelection();
    const ok = this.canvas.setSvgString(svg, true);
    if (!ok) throw new Error("This SVG could not be opened.");
    this.canvas.undoMgr.resetUndoStack();
    const root = this.canvas.getSvgContent() as SVGSVGElement;
    const w = Number(root.getAttribute("width")) || 200, h = Number(root.getAttribute("height")) || 200;
    this.meta = meta ? { ...meta } : defaultMeta(w, h);
    this.normaliseLayers();
    this.assignIds();
    this.selectLayer("ornament");
    this.fit();
    this.emit("change");
  }

  /** Current document SVG as svgcanvas serialises it (layers, defs and ids included). */
  svgString(): string { return this.canvas.getSvgString(); }

  content(): SVGSVGElement { return this.canvas.getSvgContent(); }

  setSize(w: number, h: number, tile?: { w: number; h: number }) {
    this.canvas.setResolution(w, h);
    this.meta = { ...this.meta, w, h, tile: tile ?? this.meta.tile };
    this.syncTileEdge();
    this.fit();
    this.emit("change");
  }

  syncTileEdge() {
    const layer = this.layerGroup("tile");
    if (!layer) return;
    let r = layer.querySelector("rect");
    if (!r) { r = document.createElementNS(SVGNS, "rect"); r.id = this.canvas.getNextId(); layer.appendChild(r); }
    for (const [k, v] of Object.entries({ x: 0, y: 0, width: this.meta.tile.w, height: this.meta.tile.h, fill: "none", stroke: "#c0392b", "stroke-width": 0.3, "stroke-dasharray": "3 2" })) r.setAttribute(k, String(v));
  }

  /** Make sure the four Kashi layers exist and carry their keys (also for imported files). */
  normaliseLayers() {
    const drawing = this.canvas.getCurrentDrawing();
    drawing.identifyLayers();
    const root = this.content();
    const groups = [...root.querySelectorAll(":scope > g.layer")] as SVGGElement[];
    for (const g of groups) {
      if (g.getAttribute("data-kashi-layer")) continue;
      const title = g.querySelector(":scope > title")?.textContent ?? "";
      const key = (Object.keys(LAYERS) as LayerKey[]).find((k) => LAYERS[k] === title);
      if (key) g.setAttribute("data-kashi-layer", key);
    }
    for (const key of Object.keys(LAYERS) as LayerKey[]) {
      if (this.layerGroup(key)) continue;
      const g = document.createElementNS(SVGNS, "g");
      g.setAttribute("class", "layer");
      g.setAttribute("data-kashi-layer", key);
      const t = document.createElementNS(SVGNS, "title");
      t.textContent = LAYERS[key];
      g.appendChild(t);
      if (key === "reference") { g.setAttribute("data-locked", "1"); g.setAttribute("style", "pointer-events:none"); root.insertBefore(g, root.querySelector(":scope > g.layer")); }
      else if (key === "construction") { g.setAttribute("display", "none"); const orn = this.layerGroup("ornament"); root.insertBefore(g, orn ?? null); }
      else if (key === "tile") { g.setAttribute("display", "none"); root.appendChild(g); }
      else {
        // imported artwork: everything that is not in a Kashi layer stays where it is, a new ornament layer goes on top
        const tile = this.layerGroup("tile");
        root.insertBefore(g, tile ?? null);
      }
    }
    drawing.identifyLayers();
    this.syncTileEdge();
  }

  private assignIds() {
    for (const el of this.content().querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon,g,text,use,image")) {
      if (!el.id) el.id = this.canvas.getNextId();
    }
  }

  layerGroup(key: LayerKey): SVGGElement | null {
    return this.content().querySelector(`:scope > g.layer[data-kashi-layer="${key}"]`);
  }
  layerOf(el: Element | null): SVGGElement | null {
    let n: Element | null = el;
    while (n && n.parentElement && !(n.parentElement as Element).matches?.("svg#svgcontent, svg")) {
      if (n.classList?.contains("layer")) return n as SVGGElement;
      n = n.parentElement;
    }
    return n?.classList?.contains("layer") ? (n as SVGGElement) : null;
  }

  // ------------------------------------------------------------------ view

  fit() {
    const r = this.host.getBoundingClientRect();
    const vw = Math.max(200, r.width), vh = Math.max(200, r.height);
    const z = Math.max(0.05, Math.min((vw * 0.86) / this.meta.w, (vh * 0.86) / this.meta.h));
    this.setZoom(z);
    this.host.scrollLeft = (this.host.scrollWidth - this.host.clientWidth) / 2;
    this.host.scrollTop = (this.host.scrollHeight - this.host.clientHeight) / 2;
  }

  setZoom(z: number, anchor?: { clientX: number; clientY: number }) {
    z = Math.max(0.02, Math.min(80, z));
    const r = this.host.getBoundingClientRect();
    // keep the canvas point under the anchor fixed
    const before = anchor ? this.clientToCanvas(anchor.clientX, anchor.clientY) : null;
    this.canvas.setZoom(z);
    this.zoom = z;
    const w = Math.max(r.width, this.meta.w * z + r.width), h = Math.max(r.height, this.meta.h * z + r.height);
    this.canvas.updateCanvas(w, h);
    this.inner.style.width = `${w}px`;
    this.inner.style.height = `${h}px`;
    this.canvas.pathActions?.zoomChange?.();
    if (before && anchor) {
      const after = this.canvasToClient(before[0], before[1]);
      this.host.scrollLeft += after[0] - anchor.clientX;
      this.host.scrollTop += after[1] - anchor.clientY;
    }
    for (const s of this.selected()) this.canvas.selectorManager?.requestSelector?.(s)?.resize?.();
    this.emit("zoom");
  }

  clientToCanvas(x: number, y: number): [number, number] {
    const m = this.content().getScreenCTM();
    if (!m) return [x, y];
    const p = new DOMPoint(x, y).matrixTransform(m.inverse());
    return [p.x, p.y];
  }
  canvasToClient(x: number, y: number): [number, number] {
    const m = this.content().getScreenCTM();
    if (!m) return [x, y];
    const p = new DOMPoint(x, y).matrixTransform(m);
    return [p.x, p.y];
  }

  setTool(t: Tool) {
    if (t === "polygon" || t === "star") { this.canvas.setMode("select"); this.canvas.clearSelection(); this.customTool = t; }
    else { this.customTool = null; this.canvas.setMode(t); }
    this.host.dataset.tool = t;
    this.emit("mode");
  }
  customTool: "polygon" | "star" | null = null;
  tool(): Tool { return (this.customTool ?? this.canvas.getMode()) as Tool; }

  // ------------------------------------------------------------------ overlay (not part of the document)

  drawOverlay() {
    const root = this.content();
    const o = this.overlay;
    o.setAttribute("transform", `translate(${root.getAttribute("x") ?? 0},${root.getAttribute("y") ?? 0}) scale(${this.zoom})`);
    const parts: string[] = [];
    const z = this.zoom, W = this.meta.w, H = this.meta.h;
    if (this.showGrid && this.snap.gridStep > 0 && W / this.snap.gridStep < 400) {
      let d = "";
      for (let x = 0; x <= W + 1e-6; x += this.snap.gridStep) d += `M${x} 0V${H}`;
      for (let y = 0; y <= H + 1e-6; y += this.snap.gridStep) d += `M0 ${y}H${W}`;
      parts.push(`<path d="${d}" fill="none" stroke="#4f46e5" stroke-opacity=".18" stroke-width="${1 / z}"/>`);
    }
    // tile boundary when the document holds more than one tile
    const t = this.meta.tile;
    if (Math.abs(t.w - W) > 1e-6 || Math.abs(t.h - H) > 1e-6) parts.push(`<rect x="0" y="0" width="${t.w}" height="${t.h}" fill="none" stroke="#c0392b" stroke-width="${1.2 / z}" stroke-dasharray="${6 / z} ${4 / z}"/>`);
    for (const x of this.meta.guides.x) parts.push(`<line x1="${x}" x2="${x}" y1="${-H}" y2="${2 * H}" stroke="#06b6d4" stroke-width="${1 / z}"/>`);
    for (const y of this.meta.guides.y) parts.push(`<line y1="${y}" y2="${y}" x1="${-W}" x2="${2 * W}" stroke="#06b6d4" stroke-width="${1 / z}"/>`);
    // symmetry guides for a selected symmetry group
    const sym = this.selected()[0]?.closest?.("[data-kashi-sym]") as SVGGElement | null;
    if (sym) {
      const [n, mirror, cx, cy] = (sym.getAttribute("data-kashi-sym") ?? "").split(",").map(Number);
      const R = Math.max(W, H);
      let d = "";
      for (let k = 0; k < (mirror ? 2 * n : n); k++) { const a = (k / (mirror ? 2 * n : n)) * Math.PI * 2; d += `M${cx} ${cy}L${cx + Math.cos(a) * R} ${cy + Math.sin(a) * R}`; }
      parts.push(`<path d="${d}" stroke="#c0392b" stroke-opacity=".55" stroke-width="${1 / z}" stroke-dasharray="${5 / z} ${4 / z}" fill="none"/>`);
    }
    o.innerHTML = parts.join("");
  }

  addGuide(axis: "x" | "y", v: number) { this.meta.guides[axis].push(v); this.emit("change"); }
  clearGuides() { this.meta.guides = { x: [], y: [] }; this.emit("change"); }

  // ------------------------------------------------------------------ selection

  selected(): SVGElement[] { return (this.canvas.getSelectedElements() as (SVGElement | null)[]).filter((e): e is SVGElement => !!e); }

  selectionInfo(): SelectionInfo {
    const sel = this.selected();
    const first = sel[0];
    const info: SelectionInfo = { count: sel.length, tags: sel.map((e) => e.tagName), isPath: first?.tagName === "path", isGroup: first?.tagName === "g" };
    if (!first) return info;
    const genEl = (first.closest?.("[data-kashi-gen]") ?? null) as SVGGElement | null;
    if (genEl && sel.length === 1) {
      try { info.generator = { id: genEl.getAttribute("data-kashi-gen")!, params: JSON.parse(genEl.getAttribute("data-kashi-params") ?? "{}"), palette: genEl.getAttribute("data-kashi-palette") ?? "", elem: genEl }; } catch { /* broken params */ }
    }
    const symEl = first.closest?.("[data-kashi-sym]");
    if (symEl) { const [n, m] = (symEl.getAttribute("data-kashi-sym") ?? "").split(","); info.symmetry = { n: Number(n), mirror: m === "1" }; }
    const style = (k: string) => first.getAttribute(k) ?? undefined;
    info.fill = style("fill");
    info.stroke = style("stroke");
    info.strokeWidth = first.getAttribute("stroke-width") ? Number(first.getAttribute("stroke-width")) : undefined;
    info.strokeLinejoin = style("stroke-linejoin");
    info.opacity = first.getAttribute("opacity") ? Number(first.getAttribute("opacity")) : 1;
    const bb = this.canvas.getStrokedBBox?.(sel);
    if (bb) info.bbox = { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
    info.inLockedLayer = this.layerOf(first)?.getAttribute("data-locked") === "1";
    return info;
  }

  selectAll() { this.canvas.selectAllInCurrentLayer(); }

  // ------------------------------------------------------------------ attributes and arrangement

  setAttr(attr: string, value: string | number) {
    const sel = this.selected();
    if (!sel.length) return;
    // set on the leaves when a group is selected, so colours really change
    if (attr === "fill" || attr === "stroke") {
      const targets = sel.flatMap((e) => (e.tagName === "g" ? [...e.querySelectorAll("path,rect,circle,ellipse,polygon,polyline,text")] : [e])) as SVGElement[];
      this.changeAttrs(targets.map((t) => [t, { [attr]: String(value) }]), `Change ${attr}`);
      return;
    }
    this.canvas.changeSelectedAttribute(attr, value);
    this.emit("change");
  }

  /** Change attributes on many elements as one undo step. */
  changeAttrs(list: [Element, Record<string, string | null>][], label = "Change") {
    if (!list.length) return;
    const batch = new BatchCommand(label);
    for (const [el, attrs] of list) {
      const old: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(attrs)) {
        old[k] = el.getAttribute(k);
        if (v === null) el.removeAttribute(k); else el.setAttribute(k, v);
      }
      batch.addSubCommand(new ChangeElementCommand(el, old));
    }
    this.canvas.addCommandToHistory(batch);
    this.emit("change");
  }

  duplicate() { this.canvas.cloneSelectedElements(this.snap.gridStep || 5, this.snap.gridStep || 5); this.emit("change"); }
  remove() { this.canvas.deleteSelectedElements(); this.emit("change"); }
  group() { this.canvas.groupSelectedElements(); this.emit("change"); }
  ungroup() { this.canvas.ungroupSelectedElement(); this.emit("change"); }
  raise(dir: "Up" | "Down" | "Top" | "Bottom") {
    if (dir === "Top") this.canvas.moveToTopSelectedElement();
    else if (dir === "Bottom") this.canvas.moveToBottomSelectedElement();
    else this.canvas.moveUpDownSelected(dir);
    this.emit("change");
  }
  flip(h: boolean) { this.canvas.flipSelectedElements?.(h ? -1 : 1, h ? 1 : -1); this.emit("change"); }
  rotate(deg: number) {
    const cur = this.canvas.getRotationAngle?.() ?? 0;
    this.canvas.setRotationAngle(((cur + deg + 540) % 360) - 180);
    this.emit("change");
  }
  align(type: "l" | "c" | "r" | "t" | "m" | "b", relativeTo: "selected" | "page" = "selected") {
    this.canvas.alignSelectedElements(type, relativeTo === "page" ? "page" : this.selected().length > 1 ? "selected" : "page");
    this.emit("change");
  }

  /** Distribute selected elements so the gaps between them are equal (horizontal or vertical). */
  distribute(axis: "h" | "v") {
    const sel = this.selected();
    if (sel.length < 3) return;
    const boxes = sel.map((el) => ({ el, b: this.canvas.getStrokedBBox([el]) as DOMRect }));
    const pos = (b: DOMRect) => (axis === "h" ? b.x : b.y), size = (b: DOMRect) => (axis === "h" ? b.width : b.height);
    boxes.sort((a, b) => pos(a.b) - pos(b.b));
    const first = boxes[0].b, last = boxes[boxes.length - 1].b;
    const total = boxes.reduce((s, x) => s + size(x.b), 0);
    const gap = (pos(last) + size(last) - pos(first) - total) / (boxes.length - 1);
    const batch = new BatchCommand("Distribute");
    let cursor = pos(first);
    for (const { el, b } of boxes) {
      const d = cursor - pos(b);
      cursor += size(b) + gap;
      if (Math.abs(d) < 1e-9) continue;
      batch.addSubCommand(this.translateElement(el, axis === "h" ? d : 0, axis === "v" ? d : 0));
    }
    if (!batch.isEmpty()) this.canvas.addCommandToHistory(batch);
    this.emit("change");
  }

  /** Translate one element by prepending a translate to its transform (undoable sub command). */
  translateElement(el: Element, dx: number, dy: number) {
    const old = { transform: el.getAttribute("transform") };
    const t = `translate(${dx} ${dy})` + (old.transform ? ` ${old.transform}` : "");
    el.setAttribute("transform", t);
    const cmd = new ChangeElementCommand(el, old);
    const re = this.canvas.recalculateDimensions?.(el);
    if (re) { const b = new BatchCommand("Move"); b.addSubCommand(cmd); b.addSubCommand(re); return b; }
    return cmd;
  }

  // ------------------------------------------------------------------ layers

  layers(): LayerInfo[] {
    const cur = this.canvas.getCurrentDrawing().getCurrentLayer?.();
    return ([...this.content().querySelectorAll(":scope > g.layer")] as SVGGElement[]).map((g) => ({
      name: g.querySelector(":scope > title")?.textContent ?? "Layer",
      key: (g.getAttribute("data-kashi-layer") ?? undefined) as LayerKey | undefined,
      visible: g.getAttribute("display") !== "none",
      locked: g.getAttribute("data-locked") === "1",
      current: g === cur,
      count: g.children.length - 1,
    })).reverse();
  }
  private layerByName(name: string) { return ([...this.content().querySelectorAll(":scope > g.layer")] as SVGGElement[]).find((g) => g.querySelector(":scope > title")?.textContent === name) ?? null; }
  selectLayer(keyOrName: LayerKey | string) {
    const g = (LAYERS as Record<string, string>)[keyOrName] ? this.layerGroup(keyOrName as LayerKey) : this.layerByName(keyOrName);
    const name = g?.querySelector(":scope > title")?.textContent;
    if (name) this.canvas.setCurrentLayer(name);
    this.emit("change");
  }
  setLayerVisible(name: string, visible: boolean) {
    const g = this.layerByName(name);
    if (!g) return;
    this.changeAttrs([[g, { display: visible ? null : "none" }]], "Layer visibility");
  }
  setLayerLocked(name: string, locked: boolean) {
    const g = this.layerByName(name);
    if (!g) return;
    if (locked) this.canvas.clearSelection();
    this.changeAttrs([[g, { "data-locked": locked ? "1" : null, style: locked ? "pointer-events:none" : null }]], "Layer lock");
  }
  /** Put the (locked, click-through) reference layer on top so a tracing image shows over the artwork. */
  raiseReferenceLayer() {
    const ref = this.layerGroup("reference");
    if (!ref) return;
    const root = this.content();
    const before = ref.nextSibling;
    root.appendChild(ref);
    this.canvas.addCommandToHistory(new MoveElementCommand(ref, before, root));
    this.canvas.getCurrentDrawing().identifyLayers();
    this.emit("change");
  }
  newLayer(name: string) { this.canvas.createLayer(name); this.emit("change"); }
  renameLayer(oldName: string, name: string) { this.canvas.setCurrentLayer(oldName); this.canvas.renameCurrentLayer(name); this.emit("change"); }
  deleteLayer(name: string) { this.canvas.setCurrentLayer(name); this.canvas.deleteCurrentLayer(); this.emit("change"); }
  moveLayer(name: string, dir: -1 | 1) {
    const d = this.canvas.getCurrentDrawing();
    this.canvas.setCurrentLayer(name);
    const n = d.getNumLayers(), idx = this.canvas.indexCurrentLayer();
    const next = idx + dir;
    if (next < 0 || next >= n) return;
    this.canvas.setCurrentLayerPosition(next);
    this.emit("change");
  }
  moveSelectionToLayer(name: string) { this.canvas.moveSelectedToLayer(name); this.emit("change"); }

  // ------------------------------------------------------------------ inserting and generating

  private parseNode(markup: string): Element {
    const doc = new DOMParser().parseFromString(`<svg xmlns="${SVGNS}" xmlns:xlink="${XLINK}">${markup}</svg>`, "image/svg+xml");
    const el = doc.documentElement.firstElementChild;
    if (!el || doc.querySelector("parsererror")) throw new Error("Generated markup could not be parsed");
    return document.importNode(el, true);
  }

  private addDefs(defs: SvgNode[], batch: BatchCommand) {
    if (!defs.length) return;
    const defsEl = this.canvas.findDefs() as SVGDefsElement;
    for (const d of defs) {
      const el = this.parseNode(serialize(d, -1));
      const existing = el.id ? this.content().querySelector(`[id="${el.id}"]`) : null;
      if (existing) { batch.addSubCommand(new RemoveElementCommand(existing, existing.nextSibling, existing.parentNode)); existing.remove(); }
      defsEl.appendChild(el);
      batch.addSubCommand(new InsertElementCommand(el));
    }
  }

  private idsIn(el: Element) {
    if (!el.id) el.id = this.canvas.getNextId();
    for (const c of el.querySelectorAll("*")) if (!c.id && c.tagName !== "title") c.id = this.canvas.getNextId();
  }

  /** Insert a node tree into a layer as one undo step and select it. */
  insertNode(node: SvgNode, defs: SvgNode[] = [], layer: LayerKey = "ornament", at?: [number, number]): Element {
    const batch = new BatchCommand("Insert ornament");
    this.addDefs(defs, batch);
    const el = this.parseNode(serialize(node, -1));
    if (at) el.setAttribute("transform", `translate(${at[0]} ${at[1]})` + (el.getAttribute("transform") ? " " + el.getAttribute("transform") : ""));
    this.idsIn(el);
    const target = this.layerGroup(layer) ?? this.layerGroup("ornament")!;
    target.appendChild(el);
    batch.addSubCommand(new InsertElementCommand(el));
    this.canvas.addCommandToHistory(batch);
    this.selectLayer(layer);
    this.canvas.selectOnly([el], true);
    this.emit("change");
    return el;
  }

  /** Insert generated ornament. Construction lines go to the construction layer. */
  insertGenerated(genId: string, params: Params, paletteId: string, at?: [number, number]) {
    const part = generate(genId, params, paletteId);
    if (part.guides) this.replaceGuides(part.guides);
    return this.insertNode(part.node, part.defs, "ornament", at);
  }

  private replaceGuides(guides: SvgNode) {
    const layer = this.layerGroup("construction");
    if (!layer) return;
    const batch = new BatchCommand("Construction lines");
    for (const c of [...layer.children]) if (c.tagName !== "title") { batch.addSubCommand(new RemoveElementCommand(c, c.nextSibling, layer)); c.remove(); }
    const el = this.parseNode(serialize(guides, -1));
    this.idsIn(el);
    layer.appendChild(el);
    batch.addSubCommand(new InsertElementCommand(el));
    this.canvas.addCommandToHistory(batch);
  }

  /** Rebuild a generated group with new parameters or palette, keeping its place and transform. */
  regenerate(groupEl: Element, params: Params, paletteId?: string) {
    const genId = groupEl.getAttribute("data-kashi-gen")!;
    const uid = groupEl.getAttribute("data-kashi-uid") ?? newUid("g");
    const pal = paletteId ?? groupEl.getAttribute("data-kashi-palette") ?? "safavid-haftrang";
    const part = generate(genId, params, pal, uid);
    const batch = new BatchCommand("Regenerate ornament");
    this.addDefs(part.defs, batch);
    const el = this.parseNode(serialize(part.node, -1));
    const tr = groupEl.getAttribute("transform");
    if (tr) el.setAttribute("transform", tr);
    el.id = groupEl.id;
    this.idsIn(el);
    const parent = groupEl.parentNode!, next = groupEl.nextSibling;
    this.canvas.clearSelection();
    batch.addSubCommand(new RemoveElementCommand(groupEl, next, parent));
    groupEl.remove();
    parent.insertBefore(el, next);
    batch.addSubCommand(new InsertElementCommand(el));
    if (part.guides) this.replaceGuides(part.guides);
    this.canvas.addCommandToHistory(batch);
    this.canvas.selectOnly([el], true);
    // a document made from this design follows its size
    const isOnlyArt = this.layerGroup("ornament")?.querySelectorAll(":scope > g[data-kashi-gen]").length === 1;
    if (isOnlyArt && !tr && (Math.abs(part.size.w - this.meta.w) > 1e-6 || Math.abs(part.size.h - this.meta.h) > 1e-6)) {
      this.canvas.setResolution(part.size.w, part.size.h);
      this.meta = { ...this.meta, w: part.size.w, h: part.size.h, tile: { w: part.size.w, h: part.size.h } };
      this.syncTileEdge();
      this.fit();
    }
    this.emit("change");
    return el;
  }

  /** Turn a generated group into plain artwork (it no longer regenerates). */
  detachGenerator(groupEl: Element) {
    this.changeAttrs([[groupEl, { "data-kashi-gen": null, "data-kashi-params": null, "data-kashi-palette": null }]], "Convert to plain artwork");
  }

  // ------------------------------------------------------------------ recolouring

  /** All fill and stroke colours used inside the selection (or the whole ornament layer). */
  colours(scope?: Element[]): { hex: string; count: number }[] {
    const roots = scope?.length ? scope : [this.layerGroup("ornament")!];
    const m = new Map<string, number>();
    for (const r of roots) for (const el of [r, ...r.querySelectorAll("*")]) for (const a of ["fill", "stroke"]) {
      const v = el.getAttribute(a)?.toLowerCase();
      if (!v || v === "none" || v.startsWith("url(")) continue;
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()].map(([hex, count]) => ({ hex, count })).sort((a, b) => b.count - a.count);
  }

  /** Replace one colour by another everywhere in the scope, as one undo step. */
  replaceColour(from: string, to: string, scope?: Element[]) {
    const roots = scope?.length ? scope : [this.layerGroup("ornament")!];
    const list: [Element, Record<string, string>][] = [];
    for (const r of roots) for (const el of [r, ...r.querySelectorAll("*")]) {
      const ch: Record<string, string> = {};
      for (const a of ["fill", "stroke"]) if (el.getAttribute(a)?.toLowerCase() === from.toLowerCase()) ch[a] = to;
      if (Object.keys(ch).length) list.push([el, ch]);
    }
    this.changeAttrs(list, "Recolour");
  }

  // ------------------------------------------------------------------ symmetry, brush, booleans

  /**
   * Symmetry designer: the selection becomes the source part of a symmetry group; rotated (and mirrored)
   * copies are live <use> references, so editing the source updates every copy. Expand on export.
   */
  makeSymmetric(n: number, mirror: boolean, centre?: [number, number]) {
    const sel = this.selected();
    if (!sel.length) return;
    const c = centre ?? [this.meta.tile.w / 2, this.meta.tile.h / 2];
    this.canvas.groupSelectedElements();
    const src = this.selected()[0] as SVGGElement;
    if (!src) return;
    src.setAttribute("data-name", "Symmetry source (edit me)");
    const batch = new BatchCommand("Make symmetric");
    const parent = src.parentNode!, next = src.nextSibling;
    const group = document.createElementNS(SVGNS, "g");
    group.id = this.canvas.getNextId();
    group.setAttribute("data-name", `Symmetry ${n}${mirror ? " with mirrors" : ""}`);
    group.setAttribute("data-kashi-sym", `${n},${mirror ? 1 : 0},${c[0]},${c[1]}`);
    batch.addSubCommand(new RemoveElementCommand(src, next, parent));
    parent.insertBefore(group, next);
    group.appendChild(src);
    for (let k = 0; k < n; k++) {
      const a = (360 * k) / n;
      for (const m of mirror ? [false, true] : [false]) {
        if (k === 0 && !m) continue;
        const u = document.createElementNS(SVGNS, "use");
        u.id = this.canvas.getNextId();
        u.setAttribute("href", `#${src.id}`);
        u.setAttributeNS(XLINK, "xlink:href", `#${src.id}`);
        u.setAttribute("transform", `rotate(${a} ${c[0]} ${c[1]})` + (m ? ` translate(${2 * c[0]} 0) scale(-1 1)` : ""));
        u.setAttribute("data-name", `Copy ${k + 1}${m ? " mirrored" : ""}`);
        group.appendChild(u);
      }
    }
    batch.addSubCommand(new InsertElementCommand(group));
    this.canvas.addCommandToHistory(batch);
    this.canvas.selectOnly([group], true);
    this.emit("change");
  }

  /** Replace live symmetry copies (<use>) with real, independent paths. */
  expandUses(scope?: Element) {
    const root = scope ?? this.content();
    const uses = [...root.querySelectorAll("use")];
    if (!uses.length) return 0;
    const batch = new BatchCommand("Expand copies");
    for (const u of uses) {
      const ref = (u.getAttribute("href") ?? u.getAttributeNS(XLINK, "href") ?? "").replace(/^#/, "");
      const src = ref ? this.content().querySelector(`[id="${ref}"]`) : null;
      if (!src) continue;
      const g = document.createElementNS(SVGNS, "g");
      g.id = this.canvas.getNextId();
      const t = [u.getAttribute("transform"), (u.getAttribute("x") || u.getAttribute("y")) ? `translate(${u.getAttribute("x") ?? 0} ${u.getAttribute("y") ?? 0})` : ""].filter(Boolean).join(" ");
      if (t) g.setAttribute("transform", t);
      g.setAttribute("data-name", u.getAttribute("data-name") ?? "Copy");
      const clone = src.cloneNode(true) as Element;
      for (const e of [clone, ...clone.querySelectorAll("[id]")]) e.id = this.canvas.getNextId();
      g.appendChild(clone);
      const parent = u.parentNode!, next = u.nextSibling;
      batch.addSubCommand(new RemoveElementCommand(u, next, parent));
      u.remove();
      parent.insertBefore(g, next);
      batch.addSubCommand(new InsertElementCommand(g));
    }
    this.canvas.addCommandToHistory(batch);
    this.emit("change");
    return uses.length;
  }

  /** Ornament brush: place motif paths along the selected path. Returns the number placed. */
  brushAlong(make: (m: DOMMatrix, i: number) => SvgNode[], spacing: number, alternate: boolean, scaleEnds = false): number {
    const p = this.selected().find((e) => e.tagName === "path" || e.tagName === "line" || e.tagName === "polyline") as SVGGeometryElement | undefined;
    if (!p) return 0;
    const L = p.getTotalLength();
    const ctm = (p.getCTM() && this.content().getCTM()) ? this.content().getCTM()!.inverse().multiply(p.getCTM()!) : new DOMMatrix();
    const nodes: SvgNode[] = [];
    let i = 0;
    for (let s = spacing / 2; s <= L - spacing / 2 + 1e-6; s += spacing, i++) {
      const a = p.getPointAtLength(s), b = p.getPointAtLength(Math.min(L, s + 0.5));
      const pa = new DOMPoint(a.x, a.y).matrixTransform(ctm), pb = new DOMPoint(b.x, b.y).matrixTransform(ctm);
      const ang = Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180 / Math.PI;
      let m = new DOMMatrix().translate(pa.x, pa.y).rotate(ang - 90);
      if (alternate && i % 2) m = m.scale(-1, 1);
      if (scaleEnds) { const t = s / L; const f = 0.55 + 0.45 * Math.sin(Math.PI * t); m = m.scale(f, f); }
      nodes.push(...make(m, i));
    }
    if (!nodes.length) return 0;
    this.insertNode({ tag: "g", attrs: { "data-name": "Brushed motifs" }, children: nodes }, [], (this.layerOf(p)?.getAttribute("data-kashi-layer") as LayerKey) ?? "ornament");
    return i;
  }

  /** Boolean operation on the selected shapes (Paper.js, loaded on demand). */
  async boolean(op: "unite" | "subtract" | "intersect" | "exclude") {
    const sel = this.selected();
    if (sel.length < 2) throw new Error("Select at least two shapes.");
    const { booleanPathData } = await import("./booleans");
    // shapes become paths in document coordinates
    const datas: string[] = [];
    for (const el of sel) {
      let e: Element = el;
      if (e.tagName !== "path") e = this.canvas.convertToPath(e) ?? e;
      if (e.tagName !== "path") throw new Error("Booleans work on shapes and paths, not on groups or text. Ungroup first.");
      const m = (e as SVGGraphicsElement).getCTM && this.content().getCTM() ? this.content().getCTM()!.inverse().multiply((e as SVGGraphicsElement).getCTM()!) : null;
      datas.push(booleanTransform(e.getAttribute("d") ?? "", m));
    }
    const d = booleanPathData(datas, op);
    const first = this.selected()[0];
    const out = document.createElementNS(SVGNS, "path");
    out.id = this.canvas.getNextId();
    for (const a of ["fill", "stroke", "stroke-width", "stroke-linejoin", "opacity", "fill-rule"]) { const v = first.getAttribute(a); if (v) out.setAttribute(a, v); }
    out.setAttribute("fill-rule", "evenodd");
    out.setAttribute("d", d);
    const batch = new BatchCommand(`Boolean ${op}`);
    const parent = first.parentNode!, next = first.nextSibling;
    for (const el of this.selected()) { batch.addSubCommand(new RemoveElementCommand(el, el.nextSibling, el.parentNode)); el.remove(); }
    parent.insertBefore(out, next && next.parentNode === parent ? next : null);
    batch.addSubCommand(new InsertElementCommand(out));
    this.canvas.addCommandToHistory(batch);
    this.canvas.selectOnly([out], true);
    this.emit("change");
  }

  // ------------------------------------------------------------------ nodes

  editNodes() {
    const el = this.selected()[0];
    if (!el) return false;
    let p: Element = el;
    if (p.tagName !== "path") { const c = this.canvas.convertToPath(p); if (c) p = c; }
    if (p.tagName !== "path") return false;
    this.canvas.selectOnly([p]);
    this.canvas.pathActions.toEditMode(p);
    this.emit("mode");
    return true;
  }
  addNode() { this.canvas.pathActions.clonePathNode(); this.emit("change"); }
  deleteNode() { this.canvas.pathActions.deletePathNode(); this.emit("change"); }
  setSegment(curve: boolean) { this.canvas.pathActions.setSegType(curve ? 6 : 4); this.emit("change"); }
  smoothNodes() { this.canvas.pathActions.linkControlPoints?.(true); this.emit("change"); }

  // ------------------------------------------------------------------ history

  undo() { if (this.canvas.undoMgr.getUndoStackSize()) { this.canvas.undoMgr.undo(); this.emit("change"); } }
  redo() { if (this.canvas.undoMgr.getRedoStackSize()) { this.canvas.undoMgr.redo(); this.emit("change"); } }
  canUndo() { return this.canvas.undoMgr.getUndoStackSize() > 0; }
  canRedo() { return this.canvas.undoMgr.getRedoStackSize() > 0; }

  // ------------------------------------------------------------------ polygon and star tool

  private installPolygonTool() {
    const down = (e: MouseEvent) => {
      if (!this.customTool || e.button !== 0) return;
      e.stopPropagation(); e.preventDefault();
      this.polyStart = snapPoint(this, this.clientToCanvas(e.clientX, e.clientY));
      const p = document.createElementNS(SVGNS, "path");
      p.id = this.canvas.getNextId();
      const fill = this.canvas.getColor?.("fill");
      p.setAttribute("fill", fill && fill !== "none" ? (fill.startsWith("#") ? fill : `#${fill}`) : "#1d3c86");
      p.setAttribute("stroke", "#22201f");
      p.setAttribute("stroke-width", "0.5");
      this.polyEl = p;
      (this.canvas.getCurrentDrawing().getCurrentLayer() as SVGGElement).appendChild(p);
    };
    const move = (e: MouseEvent) => {
      if (!this.polyStart || !this.polyEl) return;
      e.stopPropagation();
      const [x, y] = snapPoint(this, this.clientToCanvas(e.clientX, e.clientY));
      const [cx, cy] = this.polyStart;
      const r = Math.hypot(x - cx, y - cy), a0 = Math.atan2(y - cy, x - cx);
      const n = this.polygonSides, star = this.customTool === "star";
      const pts: string[] = [];
      const steps = star ? 2 * n : n;
      for (let k = 0; k < steps; k++) {
        const rr = star && k % 2 ? r * this.starRatio : r;
        const a = a0 + (k * 2 * Math.PI) / steps;
        pts.push(`${(cx + rr * Math.cos(a)).toFixed(3)} ${(cy + rr * Math.sin(a)).toFixed(3)}`);
      }
      this.polyEl.setAttribute("d", `M${pts.join("L")}Z`);
    };
    const up = (e: MouseEvent) => {
      if (!this.polyStart || !this.polyEl) return;
      e.stopPropagation();
      const el = this.polyEl;
      this.polyStart = null; this.polyEl = null;
      if (!el.getAttribute("d")) { el.remove(); return; }
      this.canvas.addCommandToHistory(new InsertElementCommand(el));
      this.canvas.selectOnly([el], true);
      this.emit("change");
    };
    this.inner.addEventListener("mousedown", down, true);
    window.addEventListener("mousemove", move, true);
    window.addEventListener("mouseup", up, true);
  }
}

/** Bake a DOMMatrix into path data through Paper-independent parsing (absolute commands only). */
function booleanTransform(d: string, m: DOMMatrix | null): string {
  if (!m || m.isIdentity) return d;
  return `__M${m.a},${m.b},${m.c},${m.d},${m.e},${m.f}__${d}`;
}
