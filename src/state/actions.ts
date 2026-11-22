// Project actions: open designs, new documents, save, open, duplicate, import and export, autosave.
import { documentFor, documentSvg, defaultMeta, type DocMeta } from "../editor/document";
import { designById, type Design } from "../library/designs";
import { sanitizeSvg, svgSizeMm, ImportError } from "../io/sanitize";
import { exportSvg, fileName, type ExportOptions } from "../export/svg";
import { deleteProject as dbDelete, getKv, getProject, listProjects, newId, projectFile, putProject, readProjectFile, setKv, storageMode, type Project, type WorkingCopy } from "../storage/db";
import { confirmAction, getEditor, getState, setState, toast } from "./store";

const AUTOSAVE_MS = 700;
let autosaveTimer = 0;

export function refreshFromEditor() {
  const ed = getEditor();
  if (!ed) return;
  setState({ selection: ed.selectionInfo(), layers: ed.layers(), tool: ed.tool(), zoom: ed.zoom, canUndo: ed.canUndo(), canRedo: ed.canRedo() });
}

/** Called on every document change: mark dirty and schedule the autosave of the working copy. */
export function documentChanged() {
  if (!getState().dirty) setState({ dirty: true });
  clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(() => void autosave(), AUTOSAVE_MS);
}

export async function autosave() {
  clearTimeout(autosaveTimer);
  const ed = getEditor();
  if (!ed) return;
  const s = getState();
  const wc: WorkingCopy = { projectId: s.projectId, name: s.name, svg: ed.svgString(), meta: ed.meta, savedAt: new Date().toISOString(), dirty: s.dirty };
  try { await setKv("current", wc); setState({ autosavedAt: wc.savedAt }); } catch { /* storage full or blocked */ }
}

/** Start: restore the working copy (nothing is lost on refresh) or open the first design. */
export async function boot() {
  const ed = getEditor();
  if (!ed) return;
  setState({ storage: await storageMode() });
  const wc = await getKv<WorkingCopy>("current").catch(() => undefined);
  if (wc && typeof wc.svg === "string" && wc.meta) {
    try {
      ed.load(wc.svg, wc.meta);
      setState({ projectId: wc.projectId, name: wc.name, dirty: wc.dirty, designId: wc.meta.designId, referenceId: wc.meta.referenceId, ready: true });
      refreshFromEditor();
      return;
    } catch { /* fall through to a fresh design */ }
  }
  openDesignNow(designById("girih-decagonal-54-interlace") ?? (await import("../library/designs")).DESIGNS[0]);
  setState({ ready: true, dirty: false });
}

async function guardDiscard(): Promise<boolean> {
  if (!getState().dirty) return true;
  return confirmAction("Discard unsaved changes?", "The current design has changes that are not saved as a project. They are kept in the autosave only until you open something else.", "Discard and continue");
}

function openDesignNow(d: Design, paletteOverride?: string) {
  const ed = getEditor()!;
  const { svg, meta } = documentFor(d.gen, d.params, paletteOverride ?? d.palette);
  meta.designId = d.id;
  meta.referenceId = d.refs?.[0];
  ed.load(svg, meta);
  setState({ projectId: null, name: d.title, dirty: false, designId: d.id, referenceId: d.refs?.[0], tab: "design" });
  refreshFromEditor();
  void autosave();
}

export async function openDesign(d: Design, paletteOverride?: string) {
  if (!(await guardDiscard())) return;
  openDesignNow(d, paletteOverride);
  if (window.matchMedia?.("(max-width: 760px)").matches) setState({ pane: "stage" });
}

export async function newDocument(w: number, h: number, units: "mm" | "cm") {
  if (!(await guardDiscard())) return;
  const meta: DocMeta = { ...defaultMeta(w, h), units };
  getEditor()!.load(documentSvg(meta, []), meta);
  setState({ projectId: null, name: "Untitled design", dirty: false, designId: undefined, referenceId: undefined, dialog: null });
  refreshFromEditor();
  void autosave();
}

async function thumbnail(svg: string, size = 220): Promise<string | undefined> {
  try {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const img = new Image();
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("img")); img.src = url; });
    const k = size / Math.max(img.width || size, img.height || size);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round((img.width || size) * k)); c.height = Math.max(1, Math.round((img.height || size) * k));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    return c.toDataURL("image/webp", 0.8);
  } catch { return undefined; }
}

export async function saveProject(asCopy = false): Promise<string | null> {
  const ed = getEditor();
  if (!ed) return null;
  const s = getState();
  const svg = ed.svgString();
  const now = new Date().toISOString();
  const id = asCopy || !s.projectId ? newId() : s.projectId;
  const existing = s.projectId && !asCopy ? await getProject(s.projectId) : undefined;
  const flat = exportSvg(svg, { scope: "document", units: "mm", includeConstruction: false, includeReference: false, includeTileEdge: false, expandUses: false });
  const p: Project = { id, name: asCopy ? `${s.name} (copy)` : s.name, svg, meta: { ...ed.meta, designId: s.designId, referenceId: s.referenceId }, thumb: await thumbnail(flat), createdAt: existing?.createdAt ?? now, updatedAt: now, designId: s.designId };
  try {
    await putProject(p);
  } catch {
    toast("Could not save in this browser. Storage may be full.");
    return null;
  }
  setState({ projectId: id, name: p.name, dirty: false, savedAt: now });
  await autosave();
  toast(asCopy ? "Saved as a new project" : "Saved in this browser");
  return id;
}

export async function openProject(id: string) {
  if (!(await guardDiscard())) return;
  const p = await getProject(id);
  if (!p) { toast("That project could not be found."); return; }
  const { svg } = sanitizeSvg(p.svg);
  getEditor()!.load(svg, p.meta);
  setState({ projectId: p.id, name: p.name, dirty: false, savedAt: p.updatedAt, designId: p.meta.designId, referenceId: p.meta.referenceId, dialog: null });
  refreshFromEditor();
  void autosave();
}

export async function duplicateProject(id: string) {
  const p = await getProject(id);
  if (!p) return;
  const now = new Date().toISOString();
  await putProject({ ...p, id: newId(), name: `${p.name} (copy)`, createdAt: now, updatedAt: now });
  toast("Project duplicated");
}
export async function removeProject(id: string) {
  const p = await getProject(id);
  if (!p) return;
  if (!(await confirmAction("Delete this project?", `"${p.name}" will be removed from this browser. This cannot be undone.`, "Delete"))) return;
  await dbDelete(id);
  if (getState().projectId === id) setState({ projectId: null, dirty: true });
  toast("Project deleted");
}
export { listProjects };

export function download(name: string, data: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(data);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function exportProjectFile() {
  const ed = getEditor()!;
  const s = getState();
  download(fileName(s.name, "kashi.json"), new Blob([projectFile({ name: s.name, svg: ed.svgString(), meta: ed.meta, designId: s.designId })], { type: "application/json" }));
}

export async function importFile(file: File, mode: "open" | "insert") {
  const text = await file.text();
  try {
    if (/\.json$/i.test(file.name) || text.trimStart().startsWith("{")) {
      if (!(await guardDiscard())) return;
      const r = readProjectFile(text);
      const { svg } = sanitizeSvg(r.svg);
      getEditor()!.load(svg, r.meta);
      setState({ projectId: null, name: r.name, dirty: true, designId: r.designId, referenceId: r.meta.referenceId });
      refreshFromEditor();
      toast("Project imported. Save it to keep it in this browser.");
      return;
    }
    const { svg, removed } = sanitizeSvg(text);
    const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
    const root = doc.documentElement;
    if (root.tagName !== "svg" || doc.querySelector("parsererror")) throw new ImportError("This file is not a readable SVG.");
    const size = svgSizeMm(root);
    const vb = (root.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
    const ox = vb.length === 4 ? vb[0] : 0, oy = vb.length === 4 ? vb[1] : 0;
    const inner = [...root.childNodes].map((n) => new XMLSerializer().serializeToString(n)).join("");
    const group = `<g data-name="${(file.name.replace(/[<>"&]/g, "") || "Imported SVG").slice(0, 60)}" transform="scale(${size.scale}) translate(${-ox} ${-oy})">${inner}</g>`;
    const ed = getEditor()!;
    if (mode === "open") {
      if (!(await guardDiscard())) return;
      const meta = defaultMeta(Math.round(size.w * 1000) / 1000, Math.round(size.h * 1000) / 1000);
      const full = documentSvg(meta, []).replace(/(<g class="layer" data-kashi-layer="ornament">\s*<title>Ornament<\/title>)/, `$1${group}`);
      ed.load(full, meta);
      setState({ projectId: null, name: file.name.replace(/\.svg$/i, ""), dirty: true, designId: undefined, referenceId: undefined });
    } else {
      ed.insertNode({ tag: "g", attrs: { "data-name": "Imported SVG" }, children: [] });
      const g = ed.selected()[0];
      if (g) { g.outerHTML = group; }
      ed.normaliseLayers();
    }
    refreshFromEditor();
    toast(removed.length ? `Imported. Removed for safety: ${[...new Set(removed)].slice(0, 4).join(", ")}` : "SVG imported");
  } catch (e) {
    toast(e instanceof Error ? e.message : "This file could not be imported.");
  }
}

export function exportSvgFile(o: Partial<ExportOptions> & { scope: ExportOptions["scope"] }) {
  const ed = getEditor()!;
  const s = getState();
  let ids: string[] | undefined, box: ExportOptions["box"];
  if (o.scope === "elements") {
    const sel = ed.selected();
    if (!sel.length) { toast("Select something to export first."); return; }
    ids = sel.map((e) => e.id);
    const b = ed.canvas.getStrokedBBox(sel);
    box = { x: b.x, y: b.y, width: b.width, height: b.height };
  }
  const out = exportSvg(ed.svgString(), { units: ed.meta.units, includeConstruction: false, includeReference: false, includeTileEdge: false, expandUses: false, title: s.name, ...o, ids, box, tile: ed.meta.tile });
  download(fileName(s.name + (o.scope === "tile" ? "-tile" : o.scope === "elements" ? "-selection" : ""), "svg"), new Blob([out], { type: "image/svg+xml" }));
  return out;
}

export async function exportPng(dpi: number, scope: ExportOptions["scope"]) {
  const ed = getEditor()!;
  const s = getState();
  const svg = exportSvg(ed.svgString(), { scope, units: "mm", includeConstruction: false, includeReference: false, includeTileEdge: false, expandUses: true, tile: ed.meta.tile });
  const wmm = scope === "tile" ? ed.meta.tile.w : ed.meta.w, hmm = scope === "tile" ? ed.meta.tile.h : ed.meta.h;
  const px = (mm: number) => Math.max(1, Math.round((mm / 25.4) * dpi));
  const W = px(wmm), H = px(hmm);
  if (W * H > 64e6) { toast("That size is too large for PNG. Lower the resolution."); return; }
  const sized = svg.replace(/width="[^"]+"/, `width="${W}"`).replace(/height="[^"]+"/, `height="${H}"`);
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("render")); img.src = url; });
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  c.getContext("2d")!.drawImage(img, 0, 0, W, H);
  URL.revokeObjectURL(url);
  const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
  download(fileName(s.name, "png"), blob);
}
