// Right panel: Design (generator settings, document and tile), Object (fill, stroke, arrange, align,
// boolean, recolour), Layers, Tools (symmetry, brush, border, repeat, guides, text) and Reference.
import { useEffect, useMemo, useRef, useState } from "react";
import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, ArrowDown, ArrowUp, BringToFront, Copy, Eye, EyeOff, FlipHorizontal2, FlipVertical2, Group, Lock, RotateCcw, RotateCw, SendToBack, Trash2, Ungroup, Unlock, ExternalLink, Plus, Wand2 } from "lucide-react";
import { getEditor, getState, setState, toast, useStore } from "../state/store";
import { openDesign } from "../state/actions";
import { GENERATORS } from "../generators";
import { FAMILIES, type ParamSpec, type Params } from "../generators/types";
import { PALETTES, paletteById, GLAZES } from "../color/palettes";
import { DESIGNS, designById } from "../library/designs";
import { referenceById, referenceImage } from "../library/references";
import { HelpButton } from "./Help";
import { fmtLen } from "./Stage";
import { ToolsPanel } from "./ToolsPanel";

const TABS = [
  { id: "design", label: "Design" },
  { id: "object", label: "Object" },
  { id: "layers", label: "Layers" },
  { id: "tools", label: "Tools" },
  { id: "reference", label: "Reference" },
] as const;

export function Inspector() {
  const tab = useStore((s) => s.tab);
  return (
    <div className="insp">
      <div className="insp-tabs" role="tablist" aria-label="Properties">
        {TABS.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setState({ tab: t.id })}>{t.label}</button>)}
      </div>
      <div className="insp-scroll" role="tabpanel">
        {tab === "design" && <DesignTab />}
        {tab === "object" && <ObjectTab />}
        {tab === "layers" && <LayersTab />}
        {tab === "tools" && <ToolsPanel />}
        {tab === "reference" && <ReferenceTab />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ Design

function mainGenerated(): Element | null {
  const ed = getEditor();
  if (!ed) return null;
  const sel = ed.selectionInfo().generator?.elem;
  if (sel) return sel;
  return ed.layerGroup("ornament")?.querySelector(":scope > g[data-kashi-gen]") ?? null;
}

function DesignTab() {
  useStore((s) => s.selection);
  useStore((s) => s.layers);
  const designId = useStore((s) => s.designId);
  const ed = getEditor();
  const el = mainGenerated();
  const genId = el?.getAttribute("data-kashi-gen") ?? null;
  const G = genId ? GENERATORS[genId] : null;
  const params: Params = useMemo(() => { try { return JSON.parse(el?.getAttribute("data-kashi-params") ?? "{}"); } catch { return {}; } }, [el, el?.getAttribute("data-kashi-params")]);
  const palette = el?.getAttribute("data-kashi-palette") ?? "safavid-haftrang";
  const timer = useRef(0);
  const design = designId ? designById(designId) : undefined;

  const update = (k: string, v: number | string | boolean, now = false) => {
    if (!el || !ed) return;
    const next = { ...params, [k]: v };
    el.setAttribute("data-kashi-params", JSON.stringify(next)); // reflect immediately in the controls
    clearTimeout(timer.current);
    const run = () => { el.setAttribute("data-kashi-params", JSON.stringify(params)); try { ed.regenerate(el, next); } catch (e) { toast(String((e as Error).message ?? e)); } };
    if (now) run(); else timer.current = window.setTimeout(run, 140);
    setState({});
  };

  return (
    <>
      {design && (
        <section className="panel-section">
          <h3 className="section-title">{design.title}<HelpButton topic="design" /></h3>
          <p className="fa design-fa" lang="fa" dir="rtl">{design.titleFa}</p>
          <p className="badges"><span className={`prov prov-${design.provenance}`}>{design.provenance === "reconstruction" ? "Reconstruction" : design.provenance === "adaptation" ? "Adaptation" : "Original design"}</span><span className="badge neutral">{FAMILIES[design.family].name} · {FAMILIES[design.family].fa}</span><span className="badge neutral">{design.period} style</span></p>
          {design.note && <p className="legend-note">{design.note}</p>}
          {design.refs?.length ? <p className="legend-note">Sources: {design.refs.map((r) => <button key={r} className="link-btn inline-link" onClick={() => setState({ referenceId: r, tab: "reference" })}>{referenceById(r)?.title ?? r}</button>)}</p> : null}
        </section>
      )}
      {G && el ? (
        <section className="panel-section">
          <h3 className="section-title"><Wand2 size={15} />{G.name} <span className="fa small" lang="fa">{G.nameFa}</span></h3>
          {G.params.map((s) => <ParamControl key={s.key} spec={s} value={params[s.key] ?? G.defaults[s.key]} onChange={(v, now) => update(s.key, v, now)} />)}
          {genId === "girih" && params.style === "interlace" && params.system === "decagonal" && Number(params.gap) > 0 && <p className="legend-note warn-note">Ten-fold girih with doubled lines has no consistent over-under weave, so it is drawn as strapwork without interlacing.</p>}
          <label className="field">Palette
            <select value={palette} onChange={(e) => ed?.regenerate(el, params, e.target.value)} data-tip="Historically inspired glaze colours">
              {PALETTES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <PaletteSwatches id={palette} />
          <p className="legend-note">{paletteById(palette).note}</p>
          <div className="row-actions wrap">
            <button className="btn" onClick={() => { ed?.canvas.selectOnly([el], true); setState({ tab: "object" }); }} data-tip="Select the whole ornament group">Select group</button>
            <button className="btn" onClick={() => ed?.detachGenerator(el)} data-tip="Keep the artwork but stop regenerating it (for heavy hand editing)">Make plain artwork</button>
          </div>
        </section>
      ) : (
        <section className="panel-section">
          <h3 className="section-title">Design<HelpButton topic="design" /></h3>
          <p className="legend-note">This document has no generated ornament selected. Pick a design in the library, add one below, or draw with the tools.</p>
        </section>
      )}
      <AddOrnament />
      {ed && <DocumentSetup />}
    </>
  );
}

function PaletteSwatches({ id }: { id: string }) {
  const p = paletteById(id);
  return <div className="swatches" aria-label="Palette colours">{[p.ground, ...p.colors, p.line].map((c, i) => <span key={i} className="sw" style={{ background: c }} data-tip={Object.values(GLAZES).find((g) => g.hex.toLowerCase() === c.toLowerCase())?.name ?? c} />)}</div>;
}

export function ParamControl({ spec, value, onChange }: { spec: ParamSpec; value: unknown; onChange: (v: number | string | boolean, now?: boolean) => void }) {
  if (spec.type === "range" || spec.type === "int") {
    const min = spec.min, max = spec.max, step = spec.type === "int" ? 1 : spec.step;
    const v = Number(value);
    return (
      <label className="field range-field">
        <span className="field-row"><span>{spec.label}</span><span className="value">{spec.type === "range" ? Math.round(v * 1000) / 1000 : v}{spec.type === "range" && spec.unit ? ` ${spec.unit}` : ""}</span></span>
        <span className="range-row">
          <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => onChange(Number(e.target.value))} onPointerUp={(e) => onChange(Number((e.target as HTMLInputElement).value), true)} aria-label={spec.label} data-tip={spec.label} />
          <input type="number" min={min} max={max} step={step} value={v} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)), true); }} aria-label={`${spec.label} value`} />
        </span>
      </label>
    );
  }
  if (spec.type === "select") return <label className="field">{spec.label}<select value={String(value)} onChange={(e) => onChange(e.target.value, true)} data-tip={spec.label}>{spec.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
  if (spec.type === "bool") return <label className="toggle field-toggle"><input type="checkbox" checked={value === true || value === "true"} onChange={(e) => onChange(e.target.checked, true)} />{spec.label}</label>;
  return <label className="field">{spec.label}<input type="text" dir={spec.rtl ? "rtl" : undefined} lang={spec.rtl ? "fa" : undefined} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} data-tip={spec.label} /></label>;
}

function AddOrnament() {
  const [gen, setGen] = useState("palmette");
  const [pal, setPal] = useState("safavid-haftrang");
  const ed = getEditor();
  return (
    <section className="panel-section">
      <h3 className="section-title"><Plus size={15} />Add ornament</h3>
      <p className="legend-note">Add a generated motif, tile or border to this document as a new editable group.</p>
      <label className="field">Generator<select value={gen} onChange={(e) => setGen(e.target.value)}>{Object.values(GENERATORS).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
      <label className="field">Palette<select value={pal} onChange={(e) => setPal(e.target.value)}>{PALETTES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <button className="btn primary" onClick={() => { if (!ed) return; const G = GENERATORS[gen]; const s = G.size(G.defaults); ed.insertGenerated(gen, {}, pal, [Math.max(0, (ed.meta.w - s.w) / 2), Math.max(0, (ed.meta.h - s.h) / 2)]); }}>Add to design</button>
    </section>
  );
}

function DocumentSetup() {
  const ed = getEditor()!;
  useStore((s) => s.layers);
  const [w, setW] = useState(ed.meta.w), [h, setH] = useState(ed.meta.h), [tw, setTw] = useState(ed.meta.tile.w), [th, setTh] = useState(ed.meta.tile.h);
  useEffect(() => { setW(ed.meta.w); setH(ed.meta.h); setTw(ed.meta.tile.w); setTh(ed.meta.tile.h); }, [ed.meta.w, ed.meta.h, ed.meta.tile.w, ed.meta.tile.h]);
  const u = ed.meta.units, k = u === "cm" ? 10 : 1;
  const num = (v: number, set: (n: number) => void, label: string) => <input type="number" min={1} step={u === "cm" ? 0.1 : 1} value={Math.round((v / k) * 1000) / 1000} onChange={(e) => set(Math.max(1, Number(e.target.value) * k))} aria-label={label} />;
  return (
    <section className="panel-section">
      <h3 className="section-title">Document and tile</h3>
      <p className="legend-note">Artwork is measured in millimetres. The tile is the repeat unit, starting at the top left corner.</p>
      <div className="two-col">
        <label className="field">Width ({u}){num(w, setW, "Document width")}</label>
        <label className="field">Height ({u}){num(h, setH, "Document height")}</label>
        <label className="field">Tile width ({u}){num(tw, setTw, "Tile width")}</label>
        <label className="field">Tile height ({u}){num(th, setTh, "Tile height")}</label>
      </div>
      <div className="row-actions wrap">
        <button className="btn" onClick={() => ed.setSize(w, h, { w: tw, h: th })} data-tip="Apply the sizes (artwork is not scaled)">Apply sizes</button>
        <div className="segmented" role="group" aria-label="Units">
          {(["mm", "cm"] as const).map((x) => <button key={x} className={u === x ? "on" : ""} onClick={() => { ed.meta.units = x; ed.emit("change"); }}>{x}</button>)}
        </div>
      </div>
      <p className="legend-note">Current: {fmtLen(ed.meta.w, u)} × {fmtLen(ed.meta.h, u)}, tile {fmtLen(ed.meta.tile.w, u)} × {fmtLen(ed.meta.tile.h, u)}.</p>
    </section>
  );
}

// ------------------------------------------------------------------ Object

function ObjectTab() {
  const s = useStore((x) => x.selection);
  const ed = getEditor();
  const [, force] = useState(0);
  useStore((x) => x.layers);
  if (!ed) return null;
  const sel = ed.selected();
  const colours = ed.colours(sel.length ? sel : undefined).slice(0, 24);
  const hex = (v?: string) => (v && /^#[0-9a-f]{6}$/i.test(v) ? v : v && /^#[0-9a-f]{3}$/i.test(v) ? "#" + v.slice(1).split("").map((c) => c + c).join("") : "#000000");
  return (
    <>
      <section className="panel-section">
        <h3 className="section-title">{s.count ? `${s.count} selected` : "Nothing selected"}<HelpButton topic="object" /></h3>
        {!s.count && <p className="legend-note">Click an object on the canvas. Double-click a group to work inside it. The colour list below then covers the whole ornament.</p>}
        {s.count > 0 && (
          <>
            {s.bbox && <p className="legend-note mono">x {r1(s.bbox.x)} · y {r1(s.bbox.y)} · {r1(s.bbox.width)} × {r1(s.bbox.height)} mm</p>}
            <div className="two-col">
              <label className="field">Fill<span className="color-row"><input type="color" value={hex(s.fill)} onChange={(e) => ed.setAttr("fill", e.target.value)} aria-label="Fill colour" /><button className="chip" onClick={() => ed.setAttr("fill", "none")}>None</button></span></label>
              <label className="field">Stroke<span className="color-row"><input type="color" value={hex(s.stroke)} onChange={(e) => ed.setAttr("stroke", e.target.value)} aria-label="Stroke colour" /><button className="chip" onClick={() => ed.setAttr("stroke", "none")}>None</button></span></label>
              <label className="field">Stroke width (mm)<input type="number" min={0} step={0.1} value={s.strokeWidth ?? 0} onChange={(e) => ed.setAttr("stroke-width", Math.max(0, Number(e.target.value)))} /></label>
              <label className="field">Joins<select value={s.strokeLinejoin ?? "miter"} onChange={(e) => ed.setAttr("stroke-linejoin", e.target.value)}><option value="miter">Mitre</option><option value="round">Round</option><option value="bevel">Bevel</option></select></label>
              <label className="field span2">Opacity<input type="range" min={0} max={1} step={0.05} value={s.opacity ?? 1} onChange={(e) => ed.setAttr("opacity", Number(e.target.value))} /></label>
            </div>
          </>
        )}
      </section>
      {s.count > 0 && (
        <section className="panel-section">
          <h3 className="section-title">Arrange</h3>
          <div className="icon-grid">
            <IconBtn icon={Copy} label="Duplicate (Ctrl+D)" onClick={() => ed.duplicate()} />
            <IconBtn icon={Group} label="Group (Ctrl+G)" onClick={() => ed.group()} />
            <IconBtn icon={Ungroup} label="Ungroup (Ctrl+Shift+G)" onClick={() => ed.ungroup()} />
            <IconBtn icon={Trash2} label="Delete (Del)" onClick={() => ed.remove()} />
            <IconBtn icon={BringToFront} label="Bring to front" onClick={() => ed.raise("Top")} />
            <IconBtn icon={ArrowUp} label="Bring forward" onClick={() => ed.raise("Up")} />
            <IconBtn icon={ArrowDown} label="Send backward" onClick={() => ed.raise("Down")} />
            <IconBtn icon={SendToBack} label="Send to back" onClick={() => ed.raise("Bottom")} />
            <IconBtn icon={FlipHorizontal2} label="Flip horizontally" onClick={() => ed.flip(true)} />
            <IconBtn icon={FlipVertical2} label="Flip vertically" onClick={() => ed.flip(false)} />
            <IconBtn icon={RotateCcw} label="Rotate 15° left" onClick={() => ed.rotate(-15)} />
            <IconBtn icon={RotateCw} label="Rotate 15° right" onClick={() => ed.rotate(15)} />
          </div>
          <h4 className="mini-title">Align {s.count > 1 ? "to each other" : "to the page"}</h4>
          <div className="icon-grid">
            <IconBtn icon={AlignStartVertical} label="Align left" onClick={() => ed.align("l")} />
            <IconBtn icon={AlignCenterVertical} label="Align centres horizontally" onClick={() => ed.align("c")} />
            <IconBtn icon={AlignEndVertical} label="Align right" onClick={() => ed.align("r")} />
            <IconBtn icon={AlignStartHorizontal} label="Align top" onClick={() => ed.align("t")} />
            <IconBtn icon={AlignCenterHorizontal} label="Align middles vertically" onClick={() => ed.align("m")} />
            <IconBtn icon={AlignEndHorizontal} label="Align bottom" onClick={() => ed.align("b")} />
          </div>
          <div className="row-actions wrap">
            <button className="chip" disabled={s.count < 3} onClick={() => ed.distribute("h")} data-tip="Equal gaps from left to right (3 or more objects)">Distribute horizontally</button>
            <button className="chip" disabled={s.count < 3} onClick={() => ed.distribute("v")} data-tip="Equal gaps from top to bottom (3 or more objects)">Distribute vertically</button>
          </div>
          <h4 className="mini-title">Combine shapes</h4>
          <div className="row-actions wrap">
            {(["unite", "subtract", "intersect", "exclude"] as const).map((op) => <button key={op} className="chip" disabled={s.count < 2} onClick={() => ed.boolean(op).catch((e) => toast(e.message))} data-tip={`${op[0].toUpperCase() + op.slice(1)} the selected shapes`}>{op[0].toUpperCase() + op.slice(1)}</button>)}
          </div>
          <div className="row-actions wrap">
            <button className="chip" onClick={() => { if (!ed.editNodes()) toast("Select a shape or path."); }}>Edit nodes</button>
            {s.tags.includes("text") && <button className="chip" onClick={() => void import("../text/outline").then((m) => m.convertSelectedText()).catch((e) => toast(e.message))} data-tip="Convert Persian or Arabic text to outlines with correct joining">Text to outlines</button>}
          </div>
        </section>
      )}
      <section className="panel-section">
        <h3 className="section-title">Colours used {s.count ? "in the selection" : "in the ornament"}</h3>
        <p className="legend-note">Pick a new colour to replace it everywhere {s.count ? "in the selection" : "in the design"}, as one step.</p>
        <ul className="colour-list">
          {colours.map((c) => (
            <li key={c.hex}>
              <label className="colour-item" data-tip={`Replace ${c.hex}`}>
                <input type="color" value={hex(c.hex)} onChange={(e) => { ed.replaceColour(c.hex, e.target.value, sel.length ? sel : undefined); force((x) => x + 1); }} aria-label={`Replace colour ${c.hex}`} />
                <span className="mono">{c.hex}</span><span className="muted">{c.count}</span>
              </label>
            </li>
          ))}
        </ul>
        <h4 className="mini-title">Glaze colours</h4>
        <div className="swatches big">
          {Object.values(GLAZES).map((gz) => <button key={gz.hex} className="sw" style={{ background: gz.hex }} onClick={() => s.count ? ed.setAttr("fill", gz.hex) : toast("Select something to colour first.")} aria-label={`Fill with ${gz.name}`} data-tip={`${gz.name} · ${gz.nameFa}`} />)}
        </div>
        <ColorLabImport />
      </section>
    </>
  );
}

function ColorLabImport() {
  const ed = getEditor();
  return (
    <label className="btn file-btn small-btn" data-tip="Load colours exported from Elham Color Lab (JSON, CSS or a list of hex values) and map them onto the design's colours">
      Use a Color Lab palette
      <input type="file" accept=".json,.css,.txt,.hex,.gpl,application/json,text/plain" onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = "";
        if (!f || !ed) return;
        const text = await f.text();
        const hexes = [...new Set((text.match(/#[0-9a-fA-F]{6}\b/g) ?? []).map((x) => x.toLowerCase()))];
        if (!hexes.length) { toast("No colours found in that file."); return; }
        const used = ed.colours().map((c) => c.hex);
        used.slice(0, hexes.length).forEach((from, i) => ed.replaceColour(from, hexes[i]));
        toast(`Mapped ${Math.min(used.length, hexes.length)} colours from the palette file.`);
      }} />
    </label>
  );
}

const r1 = (v: number) => Math.round(v * 10) / 10;
function IconBtn({ icon: I, label, onClick }: { icon: typeof Copy; label: string; onClick: () => void }) {
  return <button className="tb-btn icon-only boxed" onClick={onClick} aria-label={label} data-tip={label}><I size={16} /></button>;
}

// ------------------------------------------------------------------ Layers

function LayersTab() {
  const layers = useStore((s) => s.layers);
  const sel = useStore((s) => s.selection);
  const ed = getEditor();
  const [name, setName] = useState("");
  if (!ed) return null;
  return (
    <section className="panel-section">
      <h3 className="section-title">Layers<HelpButton topic="layers" /></h3>
      <ul className="layer-list">
        {layers.map((l) => (
          <li key={l.name} className={l.current ? "current" : ""}>
            <button className="layer-name" onClick={() => ed.selectLayer(l.name)} data-tip="Draw into this layer">{l.name}<span className="muted"> {l.count}</span></button>
            <button className="tb-btn icon-only" onClick={() => ed.setLayerVisible(l.name, !l.visible)} aria-label={l.visible ? `Hide ${l.name}` : `Show ${l.name}`} data-tip={l.visible ? "Hide (hidden layers are not exported)" : "Show"}>{l.visible ? <Eye size={15} /> : <EyeOff size={15} />}</button>
            <button className="tb-btn icon-only" onClick={() => ed.setLayerLocked(l.name, !l.locked)} aria-label={l.locked ? `Unlock ${l.name}` : `Lock ${l.name}`} data-tip={l.locked ? "Unlock" : "Lock (cannot be selected)"}>{l.locked ? <Lock size={15} /> : <Unlock size={15} />}</button>
            <button className="tb-btn icon-only" onClick={() => ed.moveLayer(l.name, 1)} aria-label={`Move ${l.name} up`} data-tip="Move up"><ArrowUp size={15} /></button>
            <button className="tb-btn icon-only" onClick={() => ed.moveLayer(l.name, -1)} aria-label={`Move ${l.name} down`} data-tip="Move down"><ArrowDown size={15} /></button>
          </li>
        ))}
      </ul>
      <div className="row-actions">
        <input type="text" value={name} placeholder="New layer name" onChange={(e) => setName(e.target.value)} aria-label="New layer name" />
        <button className="btn" disabled={!name.trim()} onClick={() => { ed.newLayer(name.trim()); setName(""); }}>Add layer</button>
      </div>
      {sel.count > 0 && (
        <label className="field">Move selection to layer
          <select value="" onChange={(e) => e.target.value && ed.moveSelectionToLayer(e.target.value)}>
            <option value="">Choose a layer</option>
            {layers.filter((l) => !l.locked).map((l) => <option key={l.name} value={l.name}>{l.name}</option>)}
          </select>
        </label>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ Reference

function ReferenceTab() {
  const id = useStore((s) => s.referenceId);
  const r = id ? referenceById(id) : undefined;
  const ed = getEditor();
  const related = useMemo(() => DESIGNS.filter((d) => d.refs?.includes(id ?? "")), [id]);
  const [busy, setBusy] = useState(false);
  if (!r) return (
    <section className="panel-section">
      <h3 className="section-title">Reference<HelpButton topic="reference" /></h3>
      <p className="legend-note">Choose a documented object or building in the References tab of the library, or trace your own photograph.</p>
      <TracingControls />
    </section>
  );
  const img = referenceImage(r);
  const place = async () => {
    if (!img || !ed) return;
    setBusy(true);
    try {
      const blob = await (await fetch(img)).blob();
      const data: string = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(blob); });
      placeTracing(data, r.title);
      ed.meta.referenceId = r.id;
    } finally { setBusy(false); }
  };
  return (
    <>
      <section className="panel-section ref-detail">
        <h3 className="section-title">{r.title}<HelpButton topic="reference" /></h3>
        {img && <img className="ref-img" src={img} alt={r.title} />}
        <dl className="facts">
          <dt>{r.kind === "site" ? "Building" : "Museum"}</dt><dd>{r.institution}</dd>
          {r.accession && <><dt>Accession</dt><dd className="mono">{r.accession}</dd></>}
          <dt>Origin</dt><dd>{r.origin}</dd>
          <dt>Date</dt><dd>{r.date}</dd>
          <dt>Period</dt><dd>{r.period}</dd>
          <dt>Technique</dt><dd>{r.technique}</dd>
          <dt>Elements</dt><dd>{r.elements.join(", ")}</dd>
          <dt>Geometry</dt><dd>{r.geometry}</dd>
          <dt>Symmetry</dt><dd>{r.symmetry}</dd>
          {r.colours.length > 0 && <><dt>Colours</dt><dd><span className="swatches">{r.colours.map((c) => <span key={c.hex} className="sw" style={{ background: c.hex }} data-tip={`${c.name} ${c.hex} (estimated from the photograph)`} />)}</span></dd></>}
          <dt>Image</dt><dd>{r.imageRights}. {r.imageCredit}</dd>
        </dl>
        <p className="legend-note"><b>Notes.</b> {r.notes}</p>
        {r.uncertainty && <p className="legend-note warn-note"><b>Uncertain.</b> {r.uncertainty}</p>}
        <p className="row-actions wrap">
          <a className="btn" href={r.sourceUrl} target="_blank" rel="noopener noreferrer">Source <ExternalLink size={13} /></a>
          {img && <button className="btn primary" disabled={busy} onClick={() => void place()} data-tip="Place the image in the locked Reference layer to trace over it">Place as tracing image</button>}
        </p>
      </section>
      {related.length > 0 && (
        <section className="panel-section">
          <h3 className="section-title">Vector designs from this source</h3>
          <ul className="related">{related.map((d) => <li key={d.id}><button className="link-btn inline-link" onClick={() => void openDesign(d)}>{d.title}</button> <span className={`prov prov-${d.provenance}`}>{d.provenance}</span></li>)}</ul>
        </section>
      )}
      <section className="panel-section"><TracingControls /></section>
    </>
  );
}

export function placeTracing(href: string, title: string) {
  const ed = getEditor();
  if (!ed) return;
  const img = new Image();
  img.onload = () => {
    const k = Math.min(ed.meta.w / img.width, ed.meta.h / img.height);
    const w = img.width * k, h = img.height * k;
    const layer = ed.layerGroup("reference");
    if (layer) for (const c of [...layer.querySelectorAll("image")]) c.remove();
    ed.setLayerVisible("Reference", true);
    ed.insertNode({ tag: "image", attrs: { href, x: (ed.meta.w - w) / 2, y: (ed.meta.h - h) / 2, width: w, height: h, opacity: 0.5, preserveAspectRatio: "xMidYMid meet", "data-name": `Tracing: ${title}` } }, [], "reference");
    // the tracing image floats above the artwork (semi-transparent, locked, clicks pass through)
    ed.raiseReferenceLayer();
    ed.canvas.clearSelection();
    setTimeout(() => ed.canvas.clearSelection(), 0);
    ed.selectLayer("ornament");
    setState({ tab: "reference" });
    toast("Tracing image placed in the locked Reference layer.");
  };
  img.src = href;
}

function TracingControls() {
  useStore((s) => s.layers);
  const ed = getEditor();
  const [, force] = useState(0);
  const im = ed?.layerGroup("reference")?.querySelector("image") as SVGImageElement | null;
  const get = (k: string, d: number) => Number(im?.getAttribute(`data-trace-${k}`) ?? d);
  const set = (k: string, v: number) => {
    if (!im || !ed) return;
    im.setAttribute(`data-trace-${k}`, String(v));
    const s = get("scale", 1), r = get("rotate", 0), x = get("x", 0), y = get("y", 0);
    const cx = Number(im.getAttribute("x")) + Number(im.getAttribute("width")) / 2, cy = Number(im.getAttribute("y")) + Number(im.getAttribute("height")) / 2;
    ed.changeAttrs([[im, { transform: `translate(${x} ${y}) rotate(${r} ${cx} ${cy}) translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`, opacity: String(get("opacity", 0.5)) }]], "Adjust tracing image");
    force((n) => n + 1);
  };
  return (
    <>
      <h3 className="section-title">Tracing image</h3>
      <label className="btn file-btn" data-tip="Your photograph stays in this browser. It is stored in the project, never uploaded.">
        Use my own photograph
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; if (f.size > 15e6) { toast("Please use an image under 15 MB."); return; } const fr = new FileReader(); fr.onload = () => placeTracing(String(fr.result), f.name); fr.readAsDataURL(f); }} />
      </label>
      {im ? (
        <div className="trace-grid">
          {([["opacity", "Opacity", 0, 1, 0.05, 0.5], ["scale", "Scale", 0.2, 4, 0.01, 1], ["rotate", "Rotation (°)", -180, 180, 0.5, 0], ["x", "Move x (mm)", -ed!.meta.w, ed!.meta.w, 0.5, 0], ["y", "Move y (mm)", -ed!.meta.h, ed!.meta.h, 0.5, 0]] as const).map(([k, label, min, max, step, d]) => (
            <label key={k} className="field">{label}<span className="range-row"><input type="range" min={min} max={max} step={step} value={get(k, d)} onChange={(e) => set(k, Number(e.target.value))} /><span className="value mono">{get(k, d)}</span></span></label>
          ))}
          <p className="legend-note">The Reference layer is locked so the image cannot move by accident. Hide it in Layers. It is not exported unless you ask for it.</p>
          <button className="btn danger" onClick={() => { if (!ed || !im) return; ed.setLayerLocked("Reference", false); ed.canvas.selectOnly([im]); ed.remove(); ed.setLayerLocked("Reference", true); }}>Remove tracing image</button>
        </div>
      ) : <p className="legend-note">No tracing image placed.</p>}
    </>
  );
}

export const _getState = getState;
