// Architectural compositions: arched panels and a mihrab-inspired layout that combine the other systems
// (a border, a girih or eslimi field, spandrels and an inscription band left empty for the user's text).
// These are layouts, not a separate tile-making technique. The arch is a pointed four-centred profile,
// drawn with cubic Béziers that approximate the compass construction.
import { Path } from "../geometry/path";
import { type Pt, D2R, matMul, rotateM, translate } from "../geometry/vec";
import { eslimiLeaf, petal } from "../ornament/floral";
import { g, path, rect, withTransform, type SvgNode } from "../ornament/node";
import { bool, num, str, type Generator, type BuildContext } from "./types";
import { girihGenerator } from "./girih";
import { eslimiTile, khataiTile } from "./floral";
import { borderGenerator } from "./border";

/** Pointed arch from (x0, ySpring) to (x1, ySpring) with the given rise; shoulder controls fullness. */
export function archPath(x0: number, x1: number, ySpring: number, rise: number, shoulder = 0.55, base?: number): Path {
  const xm = (x0 + x1) / 2, span = x1 - x0, apex: Pt = [xm, ySpring - rise];
  const p = new Path();
  if (base !== undefined) p.M([x0, base]).L([x0, ySpring]); else p.M([x0, ySpring]);
  p.C([x0, ySpring - rise * shoulder], [xm - span * 0.2, apex[1] + rise * 0.18], apex);
  p.C([xm + span * 0.2, apex[1] + rise * 0.18], [x1, ySpring - rise * shoulder], [x1, ySpring]);
  if (base !== undefined) p.L([x1, base]).Z();
  return p;
}

function fieldArt(kind: string, w: number, h: number, ctx: BuildContext): { node: SvgNode; defs: SvgNode[] } {
  if (kind === "plain") return { node: rect(0, 0, w, h, { fill: ctx.palette.colors[0], "data-name": "Plain field" }), defs: [] };
  // repeat a generated tile across the field by translated copies (kept as editable groups)
  const gen = kind === "girih" ? girihGenerator : kind === "khatai" ? khataiTile : eslimiTile;
  const unit = Math.min(w, h) / (kind === "girih" ? 2 : 2.5);
  const params = kind === "girih" ? { ...gen.defaults, width: unit, style: "interlace", band: unit * 0.018 } : { ...gen.defaults, size: unit };
  const { w: tw, h: th } = gen.size(params);
  const r = gen.build(params, { ...ctx, uid: ctx.uid + "-f" });
  const copies: SvgNode[] = [];
  for (let y = 0; y < h; y += th) for (let x = 0; x < w; x += tw) copies.push(withTransform({ ...r.art, attrs: { ...r.art.attrs, "data-name": "Field tile" } }, translate(x, y)));
  return { node: g("Field", copies), defs: r.defs ?? [] };
}

export const archGenerator: Generator = {
  id: "arch",
  family: "architectural",
  name: "Arched panel and mihrab layout",
  nameFa: "طاق‌نما و محراب",
  params: [
    { key: "layout", label: "Layout", type: "select", options: [{ value: "arch", label: "Arched panel (taq-nama)" }, { value: "mihrab", label: "Mihrab-inspired niche" }] },
    { key: "width", label: "Panel width", type: "range", min: 200, max: 3000, step: 5, unit: "mm" },
    { key: "height", label: "Panel height", type: "range", min: 300, max: 4500, step: 5, unit: "mm" },
    { key: "rise", label: "Arch rise", type: "range", min: 0.3, max: 0.9, step: 0.01 },
    { key: "field", label: "Niche field", type: "select", options: [{ value: "girih", label: "Girih" }, { value: "eslimi", label: "Eslimi" }, { value: "khatai", label: "Khatai flowers" }, { value: "plain", label: "Plain" }] },
    { key: "border", label: "Border band", type: "bool" },
    { key: "inscription", label: "Inscription band (empty)", type: "bool" },
  ],
  defaults: { layout: "mihrab", width: 900, height: 1400, rise: 0.62, field: "girih", border: true, inscription: true },
  size: (p) => ({ w: num(p, "width"), h: num(p, "height") }),
  build(p, ctx) {
    const W = num(p, "width"), H = num(p, "height"), pal = ctx.palette;
    const B = bool(p, "border") ? Math.round(W * 0.07) : 0;
    const mihrab = str(p, "layout") === "mihrab";
    const insc = bool(p, "inscription") ? Math.round(W * 0.09) : 0;
    const parts: SvgNode[] = [rect(0, 0, W, H, { fill: pal.ground, "data-name": "Ground" })];
    const defs: SvgNode[] = [];
    if (B) {
      const r = borderGenerator.build({ ...borderGenerator.defaults, width: W, height: H, band: B, motif: "scroll", unit: 1.6 }, { ...ctx, uid: ctx.uid + "-b" });
      parts.push(r.art);
    }
    // inner area
    const x0 = B, y0 = B, x1 = W - B, y1 = H - B;
    if (insc) {
      parts.push(g("Inscription band (empty)", [rect(x0, y0, x1 - x0, insc, { fill: pal.colors[0] === pal.ground ? pal.colors[1] : pal.ground, stroke: pal.line, "stroke-width": W * 0.003, "data-name": "Inscription ground" })]));
    }
    const top = y0 + insc;
    const margin = mihrab ? (x1 - x0) * 0.1 : (x1 - x0) * 0.06;
    const nx0 = x0 + margin, nx1 = x1 - margin;
    const span = nx1 - nx0, rise = span * num(p, "rise");
    const spring = top + (mihrab ? (x1 - x0) * 0.08 : (x1 - x0) * 0.04) + rise;
    const nb = y1 - (mihrab ? (x1 - x0) * 0.04 : 0);
    const niche = archPath(nx0, nx1, spring, rise, 0.55, nb);
    // spandrel ground and ornaments
    parts.push(path(new Path().append(Path.poly([[x0, top], [x1, top], [x1, nb], [x0, nb]])), { fill: pal.colors[2] ?? pal.ground, "data-name": "Spandrel ground" }));
    const sp: SvgNode[] = [];
    for (const side of [-1, 1]) {
      const cx = side < 0 ? (x0 + nx0) / 2 + span * 0.1 : (x1 + nx1) / 2 - span * 0.1, cy = top + rise * 0.45;
      const L = Math.min(rise * 0.5, (x1 - x0) * 0.16);
      const m = matMul(translate(cx, cy + L * 0.5), rotateM(side * 20 * D2R));
      const d = new Path().append(eslimiLeaf(L, L * 0.55, 0.45, -1).transform(matMul(m, rotateM(-18 * D2R)))).append(eslimiLeaf(L, L * 0.55, 0.45, 1).transform(matMul(m, rotateM(18 * D2R))));
      sp.push(path(d, { fill: pal.colors[0], stroke: pal.line, "stroke-width": W * 0.002 }));
      sp.push(path(petal(L * 0.5, L * 0.24, "point").transform(m), { fill: pal.colors[1] ?? pal.colors[0], stroke: pal.line, "stroke-width": W * 0.002 }));
    }
    parts.push(g("Spandrels", sp));
    // niche field clipped by the arch
    const fw = nx1 - nx0, fh = nb - (spring - rise);
    const f = fieldArt(str(p, "field"), fw, fh, ctx);
    defs.push(...f.defs, { tag: "clipPath", attrs: { id: `${ctx.uid}-niche` }, children: [path(niche)] });
    parts.push(g("Niche", [withTransform(f.node, translate(nx0, spring - rise))], { "clip-path": `url(#${ctx.uid}-niche)` }));
    parts.push(path(niche, { fill: "none", stroke: pal.line, "stroke-width": W * 0.006, "data-name": "Arch outline" }));
    if (mihrab) {
      // colonettes: narrow twisted bands either side of the niche
      const cw = (x1 - x0) * 0.025;
      const cols: SvgNode[] = [];
      for (const x of [nx0 - cw * 1.6, nx1 + cw * 0.6]) {
        cols.push(rect(x, spring - rise * 0.1, cw, nb - spring + rise * 0.1, { fill: pal.colors[1] ?? pal.colors[0], stroke: pal.line, "stroke-width": W * 0.002 }));
        const tw = new Path();
        for (let y = spring; y < nb - cw; y += cw * 1.4) tw.M([x, y]).L([x + cw, y + cw * 0.9]);
        cols.push(path(tw, { fill: "none", stroke: pal.line, "stroke-width": W * 0.002 }));
      }
      parts.push(g("Colonettes", cols));
      // hood: a second arch line outside the niche
      parts.push(path(archPath(nx0 - (x1 - x0) * 0.04, nx1 + (x1 - x0) * 0.04, spring, rise * 1.08), { fill: "none", stroke: pal.colors[0], "stroke-width": W * 0.008, "data-name": "Hood moulding" }));
    }
    const guides = g("Arch construction", [path(new Path().M([nx0, spring]).L([nx1, spring]).M([(nx0 + nx1) / 2, spring - rise]).L([(nx0 + nx1) / 2, nb]), { fill: "none", stroke: "#c0392b", "stroke-width": W * 0.0015, "stroke-dasharray": "6 4" })]);
    return { art: g(mihrab ? "Mihrab layout" : "Arched panel", parts), defs, guides };
  },
};

/** Repeating architectural band (a frieze): one border side as a long strip. */
export const bandGenerator: Generator = {
  id: "band",
  family: "architectural",
  name: "Architectural band (frieze)",
  nameFa: "کتیبه و نوار",
  params: [
    { key: "length", label: "Length", type: "range", min: 100, max: 6000, step: 5, unit: "mm" },
    { key: "depth", label: "Depth", type: "range", min: 20, max: 600, step: 1, unit: "mm" },
    { key: "motif", label: "Motif", type: "select", options: [{ value: "scroll", label: "Eslimi scroll" }, { value: "flowers", label: "Flowers and buds" }, { value: "guilloche", label: "Guilloche" }, { value: "lattice", label: "Octagon lattice" }, { value: "girih", label: "Girih strip" }] },
    { key: "rules", label: "Edge rules", type: "bool" },
  ],
  defaults: { length: 1200, depth: 120, motif: "scroll", rules: true },
  size: (p) => ({ w: num(p, "length"), h: num(p, "depth") }),
  build(p, ctx) {
    const L = num(p, "length"), D = num(p, "depth"), pal = ctx.palette, motif = str(p, "motif");
    const parts: SvgNode[] = [rect(0, 0, L, D, { fill: pal.ground, "data-name": "Ground" })];
    const defs: SvgNode[] = [];
    if (motif === "girih") {
      const gp = { ...girihGenerator.defaults, system: "4.8.8", angle: 67.5, style: "interlace", width: D, band: D * 0.02 };
      const r = girihGenerator.build(gp, { ...ctx, uid: ctx.uid + "-g" });
      defs.push(...(r.defs ?? []));
      const { w } = girihGenerator.size(gp);
      const copies: SvgNode[] = [];
      for (let x = 0; x < L; x += w) copies.push(withTransform(r.art, translate(x, 0)));
      defs.push({ tag: "clipPath", attrs: { id: `${ctx.uid}-band` }, children: [rect(0, 0, L, D)] });
      parts.push(g("Girih strip", copies, { "clip-path": `url(#${ctx.uid}-band)` }));
    } else {
      const { borderUnit } = BORDER;
      const n = Math.max(1, Math.round(L / (D * 1.8))), u = L / n;
      const units: SvgNode[] = [];
      for (let i = 0; i < n; i++) {
        const shapes = borderUnit(motif, u, D, pal);
        for (const s of shapes) units.push(path(s.d.transform(translate(i * u, 0)), { fill: s.fill ?? "none", stroke: s.stroke, "stroke-width": s.stroke ? s.sw : undefined, "stroke-linecap": s.stroke ? "round" : undefined, "data-name": s.name }));
      }
      parts.push(g("Band motifs", units));
    }
    if (bool(p, "rules")) parts.push(path(new Path().M([0, D * 0.02]).L([L, D * 0.02]).M([0, D * 0.98]).L([L, D * 0.98]), { fill: "none", stroke: pal.line, "stroke-width": D * 0.04, "data-name": "Edge rules" }));
    return { art: g("Band", parts), defs };
  },
};

import * as BORDER from "./border";
