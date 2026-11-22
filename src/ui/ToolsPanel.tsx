// Tools: symmetry designer, ornament brush, border, repeat to a panel, polygon settings, guides and text.
import { useState } from "react";
import { getEditor, setState, toast, useStore } from "../state/store";
import { HelpButton } from "./Help";
import { eslimiLeaf, leaf, petal, bud } from "../ornament/floral";
import { Path } from "../geometry/path";
import { paletteById, PALETTES } from "../color/palettes";
import { BORDER_MOTIFS } from "../generators/border";
import { FONTS } from "../generators/calligraphy";
import type { SvgNode } from "../ornament/node";

const MOTIFS = [
  { value: "eslimi", label: "Eslimi leaf" },
  { value: "leaf", label: "Serrated leaf" },
  { value: "petal", label: "Petal" },
  { value: "bud", label: "Bud" },
  { value: "dot", label: "Dot" },
];

function motifPaths(kind: string, size: number, fill: string, line: string): Path[][] {
  if (kind === "eslimi") return [[eslimiLeaf(size, size * 0.55, 0.42, 1)]];
  if (kind === "leaf") { const l = leaf(size, size * 0.4, { teeth: 4, bend: 0.1 }); return [[l.outline], [l.rib]]; }
  if (kind === "petal") return [[petal(size, size * 0.45, "point")]];
  if (kind === "bud") { const b = bud(size, size * 0.55); return [[b.body], b.sepals]; }
  void fill; void line;
  return [[Path.circle([0, -size * 0.3], size * 0.25)]];
}

export function ToolsPanel() {
  useStore((s) => s.selection);
  const ed = getEditor();
  const [symN, setSymN] = useState(8);
  const [mirror, setMirror] = useState(true);
  const [centre, setCentre] = useState<"tile" | "selection">("tile");
  const [motif, setMotif] = useState("eslimi");
  const [spacing, setSpacing] = useState(12);
  const [size, setSize] = useState(10);
  const [alt, setAlt] = useState(true);
  const [taper, setTaper] = useState(false);
  const [pal, setPal] = useState("safavid-haftrang");
  const [colourIdx, setColourIdx] = useState(0);
  const [bMotif, setBMotif] = useState("scroll");
  const [bDepth, setBDepth] = useState(20);
  const [cols, setCols] = useState(3), [rows, setRows] = useState(3), [arr, setArr] = useState<"translate" | "mirror" | "rotate">("translate");
  const [gx, setGx] = useState(0), [gy, setGy] = useState(0);
  const [text, setText] = useState("کاشی");
  const [font, setFont] = useState("Vazirmatn");
  const [tsize, setTsize] = useState(24);
  const [weight, setWeight] = useState(700);
  if (!ed) return null;
  const sel = ed.selected();
  const p = paletteById(pal);

  const applySymmetry = () => {
    if (!sel.length) { toast("Select the part to repeat first."); return; }
    let c: [number, number] | undefined;
    if (centre === "selection") { const b = ed.canvas.getStrokedBBox(sel); c = [b.x + b.width / 2, b.y + b.height / 2]; }
    ed.makeSymmetric(symN, mirror, c);
    toast("Symmetry group made. Double-click it and edit the first part: every copy follows.");
  };

  const applyBrush = () => {
    const fill = p.colors[colourIdx % p.colors.length];
    const n = ed.brushAlong((m) => {
      const nodes: SvgNode[] = [];
      const mat: [number, number, number, number, number, number] = [m.a, m.b, m.c, m.d, m.e, m.f];
      motifPaths(motif, size, fill, p.line).forEach((group, gi) => {
        for (const d of group) nodes.push({ tag: "path", attrs: { d: d.transform(mat).toString(), fill: motif === "leaf" && gi === 1 ? "none" : gi === 1 && motif === "bud" ? p.colors[3] ?? fill : fill, stroke: p.line, "stroke-width": Math.max(0.1, size * 0.02), "stroke-linejoin": "round", "data-name": MOTIFS.find((x) => x.value === motif)!.label } });
      });
      return nodes;
    }, spacing, alt, taper);
    toast(n ? `${n} motifs placed along the path. Each one is an editable path.` : "Select a path first (draw one with the pen).");
  };

  const applyBorder = () => {
    const t = ed.meta.tile;
    ed.insertGenerated("border", { width: t.w, height: t.h, band: bDepth, motif: bMotif, unit: 1.6, corner: "rosette" }, pal, [0, 0]);
    toast("Border added around the tile.");
  };

  const applyRepeat = () => {
    const layer = ed.layerGroup("ornament");
    if (!layer) return;
    const kids = [...layer.children].filter((c) => c.tagName !== "title");
    if (!kids.length) { toast("The ornament layer is empty."); return; }
    const t = ed.meta.tile;
    ed.canvas.selectOnly(kids);
    if (kids.length > 1 || kids[0].tagName !== "g") ed.group();
    const src = ed.selected()[0];
    if (!src) return;
    src.setAttribute("data-name", "Tile (edit me, copies follow)");
    const uses: SvgNode[] = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (!i && !j) continue;
      let tr = `translate(${i * t.w} ${j * t.h})`;
      if (arr === "mirror") tr += ` translate(${i % 2 ? t.w : 0} ${j % 2 ? t.h : 0}) scale(${i % 2 ? -1 : 1} ${j % 2 ? -1 : 1})`;
      if (arr === "rotate") tr += ` rotate(${[0, 90, 270, 180][(i % 2) + 2 * (j % 2)]} ${t.w / 2} ${t.h / 2})`;
      uses.push({ tag: "use", attrs: { href: `#${src.id}`, "xlink:href": `#${src.id}`, transform: tr, "data-name": `Tile copy ${i + 1},${j + 1}` } });
    }
    ed.insertNode({ tag: "g", attrs: { "data-name": `Repeat ${cols} × ${rows} (${arr})` }, children: uses });
    ed.setSize(cols * t.w, rows * t.h, t);
    toast(`Panel of ${cols} × ${rows} tiles. The copies are live: edit the first tile.`);
  };

  const insertText = async (outlines: boolean) => {
    const W = Math.max(40, tsize * text.length * 0.6), H = tsize * 1.8;
    const node: SvgNode = { tag: "text", attrs: { x: ed.meta.w / 2, y: ed.meta.h / 2, "font-family": `${font}, serif`, "font-size": tsize, "font-weight": weight, "text-anchor": "middle", "dominant-baseline": "central", fill: p.colors[0], "data-name": "Text" }, text };
    if (!outlines) { ed.insertNode(node); return; }
    try {
      const { textToPath } = await import("../text/outline");
      const r = await textToPath(text, font, weight, tsize);
      ed.insertNode({ tag: "path", attrs: { d: r.d, fill: p.colors[0], "data-name": `Text outlines: ${text}`, transform: `translate(${(ed.meta.w - r.width) / 2} ${(ed.meta.h + r.ascent * 0.6) / 2})` } });
    } catch (e) { toast((e as Error).message); }
    void W; void H;
  };

  return (
    <>
      <section className="panel-section">
        <h3 className="section-title">Symmetry designer<HelpButton topic="tools" /></h3>
        <p className="legend-note">Draw one part, select it, then make it symmetric. The copies are live: edit the first part and they all follow.</p>
        <div className="two-col">
          <label className="field">Rotations<input type="number" min={2} max={32} value={symN} onChange={(e) => setSymN(Math.max(2, Math.min(32, Number(e.target.value) || 2)))} /></label>
          <label className="field">Centre<select value={centre} onChange={(e) => setCentre(e.target.value as "tile" | "selection")}><option value="tile">Tile centre</option><option value="selection">Selection centre</option></select></label>
        </div>
        <div className="chips">{[4, 5, 6, 8, 10, 12, 16].map((n) => <button key={n} className={`chip ${symN === n ? "on" : ""}`} onClick={() => setSymN(n)}>{n}-fold</button>)}</div>
        <label className="toggle"><input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} />Add mirror copies (dihedral)</label>
        <div className="row-actions wrap">
          <button className="btn primary" disabled={!sel.length} onClick={applySymmetry}>Make symmetric</button>
          <button className="btn" onClick={() => { const n = ed.expandUses(); toast(n ? `${n} live copies turned into independent paths.` : "There are no live copies."); }} data-tip="Turn live copies into independent, separately editable paths">Expand copies</button>
        </div>
      </section>

      <section className="panel-section">
        <h3 className="section-title">Ornament brush</h3>
        <p className="legend-note">Draw a vine with the pen or freehand tool, select it, then place motifs along it.</p>
        <div className="two-col">
          <label className="field">Motif<select value={motif} onChange={(e) => setMotif(e.target.value)}>{MOTIFS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
          <label className="field">Colour<select value={colourIdx} onChange={(e) => setColourIdx(Number(e.target.value))}>{p.colors.map((c, i) => <option key={i} value={i}>{c}</option>)}</select></label>
          <label className="field">Spacing (mm)<input type="number" min={1} step={0.5} value={spacing} onChange={(e) => setSpacing(Math.max(1, Number(e.target.value)))} /></label>
          <label className="field">Size (mm)<input type="number" min={1} step={0.5} value={size} onChange={(e) => setSize(Math.max(1, Number(e.target.value)))} /></label>
        </div>
        <label className="toggle"><input type="checkbox" checked={alt} onChange={(e) => setAlt(e.target.checked)} />Alternate sides</label>
        <label className="toggle"><input type="checkbox" checked={taper} onChange={(e) => setTaper(e.target.checked)} />Smaller towards the ends</label>
        <div className="row-actions"><button className="btn primary" onClick={applyBrush} disabled={!sel.some((e) => e.tagName === "path" || e.tagName === "line")}>Place along path</button></div>
      </section>

      <section className="panel-section">
        <h3 className="section-title">Palette for tools</h3>
        <select value={pal} onChange={(e) => setPal(e.target.value)} aria-label="Palette for the brush, border and text">{PALETTES.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      </section>

      <section className="panel-section">
        <h3 className="section-title">Border around the tile</h3>
        <div className="two-col">
          <label className="field">Motif<select value={bMotif} onChange={(e) => setBMotif(e.target.value)}>{BORDER_MOTIFS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></label>
          <label className="field">Depth (mm)<input type="number" min={4} value={bDepth} onChange={(e) => setBDepth(Math.max(4, Number(e.target.value)))} /></label>
        </div>
        <button className="btn" onClick={applyBorder}>Add border</button>
      </section>

      <section className="panel-section">
        <h3 className="section-title">Repeat into a panel</h3>
        <p className="legend-note">Fills a larger panel with the tile. The copies are SVG references, so the file stays small and edits to the first tile repeat everywhere.</p>
        <div className="two-col">
          <label className="field">Across<input type="number" min={1} max={20} value={cols} onChange={(e) => setCols(Math.max(1, Math.min(20, Number(e.target.value))))} /></label>
          <label className="field">Down<input type="number" min={1} max={20} value={rows} onChange={(e) => setRows(Math.max(1, Math.min(20, Number(e.target.value))))} /></label>
        </div>
        <div className="segmented" role="group" aria-label="Arrangement">{(["translate", "mirror", "rotate"] as const).map((a) => <button key={a} className={arr === a ? "on" : ""} onClick={() => setArr(a)} disabled={a === "rotate" && Math.abs(ed.meta.tile.w - ed.meta.tile.h) > 1e-6}>{a === "translate" ? "Translate" : a === "mirror" ? "Mirror" : "Rotate"}</button>)}</div>
        <div className="row-actions"><button className="btn primary" onClick={applyRepeat}>Make panel</button><button className="btn" onClick={() => setState({ view: "repeat" })}>Preview repeat</button></div>
      </section>

      <section className="panel-section">
        <h3 className="section-title">Polygon and star tool</h3>
        <div className="two-col">
          <label className="field">Sides or points<input type="number" min={3} max={48} defaultValue={ed.polygonSides} onChange={(e) => { ed.polygonSides = Math.max(3, Math.min(48, Number(e.target.value) || 6)); }} /></label>
          <label className="field">Star inner radius<input type="number" min={0.1} max={0.95} step={0.05} defaultValue={ed.starRatio} onChange={(e) => { ed.starRatio = Math.max(0.1, Math.min(0.95, Number(e.target.value) || 0.5)); }} /></label>
        </div>
      </section>

      <section className="panel-section">
        <h3 className="section-title">Guides</h3>
        <div className="two-col">
          <label className="field">Vertical at x (mm)<input type="number" value={gx} onChange={(e) => setGx(Number(e.target.value))} /></label>
          <label className="field">Horizontal at y (mm)<input type="number" value={gy} onChange={(e) => setGy(Number(e.target.value))} /></label>
        </div>
        <div className="row-actions wrap">
          <button className="chip" onClick={() => ed.addGuide("x", gx)}>Add vertical</button>
          <button className="chip" onClick={() => ed.addGuide("y", gy)}>Add horizontal</button>
          <button className="chip" onClick={() => { ed.addGuide("x", ed.meta.tile.w / 2); ed.addGuide("y", ed.meta.tile.h / 2); }}>Tile centre lines</button>
          <button className="chip" onClick={() => ed.clearGuides()}>Clear guides</button>
        </div>
      </section>

      <section className="panel-section">
        <h3 className="section-title">Persian and Arabic text</h3>
        <p className="legend-note">Type your own text. Outlines are shaped with HarfBuzz, so letters join correctly. No inscription is supplied.</p>
        <label className="field">Text<input type="text" dir="rtl" lang="fa" value={text} onChange={(e) => setText(e.target.value)} className="fa-input" /></label>
        <div className="two-col">
          <label className="field">Font<select value={font} onChange={(e) => setFont(e.target.value)}>{FONTS.map((f) => <option key={f.value} value={f.value}>{f.value}</option>)}</select></label>
          <label className="field">Size (mm)<input type="number" min={2} value={tsize} onChange={(e) => setTsize(Math.max(2, Number(e.target.value)))} /></label>
          <label className="field">Weight<select value={weight} onChange={(e) => setWeight(Number(e.target.value))}><option value={400}>Regular</option><option value={700}>Bold</option></select></label>
        </div>
        <div className="row-actions wrap">
          <button className="btn" disabled={!text.trim()} onClick={() => void insertText(false)} data-tip="Live text: still editable, needs the font to display elsewhere">Insert as text</button>
          <button className="btn primary" disabled={!text.trim()} onClick={() => void insertText(true)} data-tip="Vector outlines: displays everywhere">Insert as outlines</button>
        </div>
      </section>
    </>
  );
}
