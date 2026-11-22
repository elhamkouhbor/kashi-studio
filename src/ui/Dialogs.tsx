// Dialogs: export, projects, new design and the built-in confirmation.
import { useEffect, useState } from "react";
import { X, Copy, Trash2, FolderOpen, Download, Upload } from "lucide-react";
import { getEditor, getState, setState, useStore } from "../state/store";
import { duplicateProject, exportPng, exportProjectFile, exportSvgFile, importFile, listProjects, newDocument, openProject, removeProject, saveProject } from "../state/actions";
import type { Project } from "../storage/db";
import { HelpButton } from "./Help";
import { fmtLen } from "./Stage";

function Modal({ title, onClose, children, wide, topic }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean; topic?: Parameters<typeof HelpButton>[0]["topic"] }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h2>{title}</h2><span className="grow" />{topic && <HelpButton topic={topic} />}<button className="tb-btn icon-only" onClick={onClose} aria-label="Close" autoFocus><X size={17} /></button></div>
        {children}
      </div>
    </div>
  );
}

export function Dialogs() {
  const dialog = useStore((s) => s.dialog);
  const confirm = useStore((s) => s.confirm);
  const close = () => setState({ dialog: null });
  return (
    <>
      {dialog === "export" && <ExportDialog onClose={close} />}
      {dialog === "projects" && <ProjectsDialog onClose={close} />}
      {dialog === "new" && <NewDialog onClose={close} />}
      {confirm && (
        <Modal title={confirm.title} onClose={() => { confirm.resolve(false); setState({ confirm: null }); }}>
          <p className="help-intro">{confirm.body}</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => { confirm.resolve(false); setState({ confirm: null }); }}>Cancel</button>
            <button className="btn primary" data-testid="confirm-ok" onClick={() => { confirm.resolve(true); setState({ confirm: null }); }}>{confirm.ok}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function ExportDialog({ onClose }: { onClose: () => void }) {
  const ed = getEditor()!;
  const hasSel = ed.selected().length > 0;
  const multiTile = Math.abs(ed.meta.tile.w - ed.meta.w) > 1e-6 || Math.abs(ed.meta.tile.h - ed.meta.h) > 1e-6;
  const hasUses = !!ed.content().querySelector("use");
  const [scope, setScope] = useState<"document" | "tile" | "elements">(hasSel ? "elements" : "document");
  const [units, setUnits] = useState(ed.meta.units);
  const [expand, setExpand] = useState(false);
  const [guides, setGuides] = useState(false);
  const [edge, setEdge] = useState(false);
  const [dpi, setDpi] = useState(300);
  const w = scope === "tile" ? ed.meta.tile.w : ed.meta.w, h = scope === "tile" ? ed.meta.tile.h : ed.meta.h;
  return (
    <Modal title="Export" onClose={onClose} topic="export">
      <fieldset className="radio-set">
        <legend>What to export</legend>
        <label><input type="radio" checked={scope === "document"} onChange={() => setScope("document")} />Whole design or panel <span className="muted">{fmtLen(ed.meta.w, units)} × {fmtLen(ed.meta.h, units)}</span></label>
        <label><input type="radio" checked={scope === "tile"} onChange={() => setScope("tile")} />One tile (seamless repeat unit) <span className="muted">{fmtLen(ed.meta.tile.w, units)} × {fmtLen(ed.meta.tile.h, units)}{multiTile ? "" : ", same as the design"}</span></label>
        <label><input type="radio" checked={scope === "elements"} disabled={!hasSel} onChange={() => setScope("elements")} />Selection only (a motif, a border, a medallion) {!hasSel && <span className="muted">select something first</span>}</label>
      </fieldset>
      <div className="two-col">
        <label className="field">Units<select value={units} onChange={(e) => setUnits(e.target.value as "mm" | "cm")}><option value="mm">Millimetres</option><option value="cm">Centimetres</option></select></label>
        <label className="field">PNG resolution<select value={dpi} onChange={(e) => setDpi(Number(e.target.value))}><option value={96}>96 dpi (screen)</option><option value={150}>150 dpi</option><option value={300}>300 dpi (print)</option><option value={600}>600 dpi</option></select></label>
      </div>
      <label className="toggle"><input type="checkbox" checked={expand} onChange={(e) => setExpand(e.target.checked)} />Expand symmetry and repeat copies into independent paths {hasUses ? "" : <span className="muted">(none in this design)</span>}</label>
      <label className="toggle"><input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />Include construction lines as a layer</label>
      <label className="toggle"><input type="checkbox" checked={edge} onChange={(e) => setEdge(e.target.checked)} />Include the tile boundary as a layer</label>
      <p className="legend-note">SVG: real vector paths and named layers, {units === "cm" ? "centimetre" : "millimetre"} width and height with a millimetre viewBox, so it prints at the true size. PNG: {Math.round((w / 25.4) * dpi)} × {Math.round((h / 25.4) * dpi)} pixels.</p>
      <div className="modal-actions">
        <button className="btn" onClick={() => void exportPng(dpi, scope === "elements" ? "document" : scope)}><Download size={15} />PNG</button>
        <button className="btn primary" data-testid="export-svg" onClick={() => { exportSvgFile({ scope, units, expandUses: expand, includeConstruction: guides, includeTileEdge: edge }); onClose(); }}><Download size={15} />SVG</button>
      </div>
      <h3 className="mini-title">Project file</h3>
      <p className="legend-note">A .kashi.json file holds the whole editable project, to move it to another browser or keep a backup.</p>
      <div className="row-actions"><button className="btn" onClick={exportProjectFile}><Download size={15} />Download project file</button></div>
    </Modal>
  );
}

function ProjectsDialog({ onClose }: { onClose: () => void }) {
  const [list, setList] = useState<Project[] | null>(null);
  const current = useStore((s) => s.projectId);
  const storage = useStore((s) => s.storage);
  const refresh = () => listProjects().then(setList);
  useEffect(() => { void refresh(); }, []);
  return (
    <Modal title="Projects" onClose={onClose} wide topic="projects">
      <p className="legend-note">Projects are stored in this browser only{storage === "memory" ? ". This browser blocks storage, so projects last until the tab is closed: download a project file to keep your work" : ""}.</p>
      <div className="row-actions wrap">
        <button className="btn primary" onClick={() => void saveProject().then(refresh)}>Save current</button>
        <button className="btn" onClick={() => void saveProject(true).then(refresh)}>Save as a copy</button>
        <label className="btn file-btn"><Upload size={15} />Import project file<input type="file" accept=".json,application/json" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importFile(f, "open").then(onClose); }} /></label>
      </div>
      {list === null ? <p className="legend-note">Loading…</p> : !list.length ? <p className="legend-note empty">No saved projects yet. Your current work is autosaved and will be here when you come back.</p> : (
        <ul className="project-list">
          {list.map((p) => (
            <li key={p.id} className={p.id === current ? "current" : ""}>
              {p.thumb ? <img src={p.thumb} alt="" /> : <span className="noimg" />}
              <span className="p-text"><span className="p-name">{p.name}</span><span className="muted">{new Date(p.updatedAt).toLocaleString()} · {Math.round(p.meta.w)} × {Math.round(p.meta.h)} mm</span></span>
              <button className="tb-btn icon-only" onClick={() => void openProject(p.id)} aria-label={`Open ${p.name}`} data-tip="Open"><FolderOpen size={16} /></button>
              <button className="tb-btn icon-only" onClick={() => void duplicateProject(p.id).then(refresh)} aria-label={`Duplicate ${p.name}`} data-tip="Duplicate"><Copy size={16} /></button>
              <button className="tb-btn icon-only" onClick={() => void removeProject(p.id).then(refresh)} aria-label={`Delete ${p.name}`} data-tip="Delete"><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function NewDialog({ onClose }: { onClose: () => void }) {
  const [units, setUnits] = useState<"mm" | "cm">(getEditor()?.meta.units ?? "mm");
  const [w, setW] = useState(150), [h, setH] = useState(150);
  const k = units === "cm" ? 10 : 1;
  const presets: [string, number, number][] = [["Square tile 10 cm", 100, 100], ["Square tile 15 cm", 150, 150], ["Square tile 20 cm", 200, 200], ["Rectangular tile 10 × 20 cm", 100, 200], ["Border tile 30 × 10 cm", 300, 100], ["Wall panel 60 × 90 cm", 600, 900]];
  return (
    <Modal title="New design" onClose={onClose}>
      <div className="chips">{presets.map(([n, a, b]) => <button key={n} className={`chip ${w === a && h === b ? "on" : ""}`} onClick={() => { setW(a); setH(b); }}>{n}</button>)}</div>
      <div className="two-col">
        <label className="field">Width ({units})<input type="number" min={1} value={Math.round((w / k) * 100) / 100} onChange={(e) => setW(Math.max(1, Number(e.target.value) * k))} /></label>
        <label className="field">Height ({units})<input type="number" min={1} value={Math.round((h / k) * 100) / 100} onChange={(e) => setH(Math.max(1, Number(e.target.value) * k))} /></label>
        <label className="field">Units<select value={units} onChange={(e) => setUnits(e.target.value as "mm" | "cm")}><option value="mm">Millimetres</option><option value="cm">Centimetres</option></select></label>
      </div>
      <div className="modal-actions"><button className="btn" onClick={onClose}>Cancel</button><button className="btn primary" onClick={() => void newDocument(w, h, units)}>Create</button></div>
    </Modal>
  );
}

export const _gs = getState;
