// Application shell: top bar, design library (left), canvas stage (centre), inspector (right).
// On phones one pane is shown at a time with a bottom tab bar.
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Box, CircleHelp, Download, FilePlus2, FolderOpen, Grid3x3, Info, LayoutGrid, Library as LibraryIcon, Monitor, Moon, Redo2, Save, SlidersHorizontal, Square, Sun, Undo2, Upload } from "lucide-react";
import { LogoFull } from "./Logo";
import { openHelp } from "./Help";
import { applyTheme, readTheme, type ThemeChoice } from "./theme";
import { setState, useStore, getEditor } from "../state/store";
import { saveProject, importFile, autosave } from "../state/actions";
import { BRAND } from "../app/brand";
import { navigate } from "../App";
import { Library } from "./Library";
import { Stage } from "./Stage";
import { Inspector } from "./Inspector";
import { Dialogs } from "./Dialogs";

export function Workspace() {
  const name = useStore((s) => s.name);
  const dirty = useStore((s) => s.dirty);
  const canUndo = useStore((s) => s.canUndo);
  const canRedo = useStore((s) => s.canRedo);
  const pane = useStore((s) => s.pane);
  const view = useStore((s) => s.view);
  const msg = useStore((s) => s.toast);
  const ready = useStore((s) => s.ready);
  const [theme, setTheme] = useState<ThemeChoice>(readTheme);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "s") { e.preventDefault(); void saveProject(e.shiftKey); return; }
      if (typing) return;
      const ed = getEditor();
      if (!ed) return;
      if (e.ctrlKey || e.metaKey) {
        if (k === "z" && !e.shiftKey) { e.preventDefault(); ed.undo(); }
        else if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); ed.redo(); }
        else if (k === "d") { e.preventDefault(); ed.duplicate(); }
        else if (k === "g") { e.preventDefault(); if (e.shiftKey) ed.ungroup(); else ed.group(); }
        else if (k === "a") { e.preventDefault(); ed.selectAll(); }
        return;
      }
      if (k === "delete" || k === "backspace") { if (ed.selected().length) { e.preventDefault(); ed.remove(); } return; }
      if (k === "escape") { ed.canvas.clearSelection(); ed.setTool("select"); return; }
      const tools: Record<string, Parameters<typeof ed.setTool>[0]> = { v: "select", r: "rect", e: "ellipse", l: "line", p: "path", f: "fhpath", t: "text", g: "polygon", s: "star" };
      if (tools[k]) { ed.setTool(tools[k]); return; }
      if (k === "0") ed.fit();
      if (k === "arrowleft" || k === "arrowright" || k === "arrowup" || k === "arrowdown") {
        if (!ed.selected().length) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        ed.canvas.moveSelectedElements(k === "arrowleft" ? -step : k === "arrowright" ? step : 0, k === "arrowup" ? -step : k === "arrowdown" ? step : 0, true);
        ed.emit("change");
      }
    };
    window.addEventListener("keydown", onKey);
    const flush = () => { void autosave(); };
    const warn = () => { void autosave(); };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", warn);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("pagehide", flush); window.removeEventListener("beforeunload", warn); };
  }, []);

  const cycleTheme = () => { const next: ThemeChoice = theme === "system" ? "light" : theme === "light" ? "dark" : "system"; applyTheme(next); setTheme(next); };
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <div className="app-shell ks-shell" data-pane={pane} data-ready={ready ? "1" : "0"}>
      <header className="topbar">
        <a className="brand-btn" href={import.meta.env.BASE_URL} aria-label="Kashi Studio home"><LogoFull /></a>
        <a className="by-line hide-mobile" href={BRAND.portfolio} rel="noopener" data-tip="Elham Kouhbor's portfolio and other design tools">by Elham Kouhbor<ArrowUpRight size={12} aria-hidden="true" /></a>
        <span className="tb-sep hide-mobile" aria-hidden="true" />
        <input className="project-title" value={name} onChange={(e) => setState({ name: e.target.value, dirty: true })} aria-label="Design name" data-tip="Design name. Click to rename." spellCheck={false} />
        <span className={`save-state ${dirty ? "dirty" : ""}`} data-tip={dirty ? "Changes are autosaved in this browser. Save to keep a named project." : "Saved"} aria-live="polite">{dirty ? "Unsaved" : "Saved"}</span>
        <div className="top-actions">
          <button className={`tb-btn lib-toggle ${pane === "library" ? "on" : ""}`} onClick={() => setState({ pane: pane === "library" ? "stage" : "library" })} aria-pressed={pane === "library"} data-tip="Show or hide the design library"><LibraryIcon size={16} /><span>Library</span></button>
          <button className="tb-btn icon-only" onClick={() => setState({ dialog: "new" })} aria-label="New design" data-tip="New empty design with your own tile size"><FilePlus2 size={17} /></button>
          <button className="tb-btn icon-only" onClick={() => setState({ dialog: "projects" })} aria-label="Projects" data-tip="Open, duplicate or delete saved projects"><FolderOpen size={17} /></button>
          <button className="tb-btn icon-only" onClick={() => void saveProject()} aria-label="Save" data-tip="Save as a project in this browser (Ctrl+S)"><Save size={17} /></button>
          <label className="tb-btn icon-only file-chip" data-tip="Import an SVG file or a Kashi project file (.kashi.json)">
            <Upload size={17} aria-hidden="true" /><span className="sr-only">Import</span>
            <input ref={fileRef} type="file" accept=".svg,image/svg+xml,.json,application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importFile(f, "open"); e.target.value = ""; }} />
          </label>
          <span className="tb-sep" aria-hidden="true" />
          <div className="undo-redo">
            <button className="tb-btn icon-only" onClick={() => getEditor()?.undo()} disabled={!canUndo} aria-label="Undo" data-tip="Undo (Ctrl+Z)"><Undo2 size={17} /></button>
            <button className="tb-btn icon-only" onClick={() => getEditor()?.redo()} disabled={!canRedo} aria-label="Redo" data-tip="Redo (Ctrl+Shift+Z)"><Redo2 size={17} /></button>
          </div>
          <span className="tb-sep hide-mobile" aria-hidden="true" />
          <div className="segmented view-seg" role="group" aria-label="View">
            <button className={view === "flat" ? "on" : ""} onClick={() => setState({ view: "flat" })} aria-pressed={view === "flat"} data-tip="Flat vector view for editing"><Square size={14} /><span>Vector</span></button>
            <button className={view === "repeat" ? "on" : ""} onClick={() => setState({ view: "repeat" })} aria-pressed={view === "repeat"} data-tip="Repeat preview: the tile repeated, with a seam check"><Grid3x3 size={14} /><span>Repeat</span></button>
            <button className={view === "ceramic" ? "on" : ""} onClick={() => setState({ view: "ceramic" })} aria-pressed={view === "ceramic"} data-tip="Ceramic preview: glazed tiles on a wall"><Box size={14} /><span>Ceramic</span></button>
          </div>
        </div>
        <div className="top-right">
          <button className="btn primary export-btn" onClick={() => setState({ dialog: "export" })} data-tip="Export SVG or PNG"><Download size={16} /><span>Export</span></button>
          <button className="tb-btn icon-only hide-mobile" onClick={() => navigate("/about")} aria-label="About" data-tip="Sources, method and licences"><Info size={17} /></button>
          <button className="tb-btn icon-only hide-mobile" onClick={() => openHelp("start")} aria-label="Help" data-tip="Help"><CircleHelp size={17} /></button>
          <button className="tb-btn icon-only" onClick={cycleTheme} aria-label={`Theme: ${theme}`} data-tip={`Theme: ${theme}. Click to change.`}><ThemeIcon size={17} /></button>
        </div>
      </header>
      <aside className="ks-library" aria-label="Design library"><Library /></aside>
      <main className="stage" aria-label="Canvas"><Stage /></main>
      <aside className="ks-inspector" aria-label="Properties"><Inspector /></aside>
      <nav className="mobile-tabs" aria-label="Panels">
        <button className={pane === "library" ? "on" : ""} onClick={() => setState({ pane: "library" })}><LayoutGrid size={18} /><span>Library</span></button>
        <button className={pane === "stage" ? "on" : ""} onClick={() => setState({ pane: "stage" })}><Square size={18} /><span>Canvas</span></button>
        <button className={pane === "inspector" ? "on" : ""} onClick={() => setState({ pane: "inspector" })}><SlidersHorizontal size={18} /><span>Properties</span></button>
      </nav>
      <Dialogs />
      <div className="toast" role="status" aria-live="polite">{msg}</div>
    </div>
  );
}
