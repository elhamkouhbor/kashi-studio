// Girih and moarraq tiles from the geometry engine: filled pieces, strapwork bands and the over/under
// interlace, each in its own named group. The tile is made of whole periods so it repeats seamlessly.
import { buildGirih, girihSize, type GirihParams } from "../geometry/girih/pattern";
import { SYSTEMS } from "../geometry/girih/systems";
import { Path } from "../geometry/path";
import { g, path, rect, type SvgNode } from "../ornament/node";
import { bool, num, str, type Generator, type Params } from "./types";

const systemOptions = Object.values(SYSTEMS).map((s) => ({ value: s.key, label: `${s.name} (${s.key})` }));

const toGeo = (p: Params): GirihParams => ({
  system: str(p, "system"), angle: num(p, "angle"), gap: num(p, "gap"), width: num(p, "width"),
  cols: num(p, "cols"), rows: num(p, "rows"), centred: bool(p, "centred"),
  angles: p.angle2 !== undefined && Number(p.angle2) > 0 ? { [`regular-${SYSTEMS[str(p, "system")].fold === 10 ? 10 : 12}`]: num(p, "angle2") } : undefined,
});

export const girihGenerator: Generator = {
  id: "girih",
  family: "girih",
  name: "Star and girih generator",
  nameFa: "سازندهٔ گره و ستاره",
  params: [
    { key: "system", label: "Tiling", type: "select", options: systemOptions },
    { key: "angle", label: "Contact angle", type: "range", min: 20, max: 85, step: 0.5, unit: "°" },
    { key: "gap", label: "Doubled lines", type: "range", min: 0, max: 0.4, step: 0.01 },
    { key: "style", label: "Style", type: "select", options: [
      { value: "moarraq", label: "Mosaic pieces (moarraq)" },
      { value: "strap", label: "Pieces with strapwork" },
      { value: "interlace", label: "Interlaced strapwork" },
      { value: "lines", label: "Lines only" },
    ] },
    { key: "band", label: "Band width", type: "range", min: 0.2, max: 12, step: 0.1, unit: "mm" },
    { key: "width", label: "Tile width", type: "range", min: 20, max: 1200, step: 1, unit: "mm" },
    { key: "cols", label: "Repeats across", type: "int", min: 1, max: 8 },
    { key: "rows", label: "Repeats down", type: "int", min: 1, max: 8 },
    { key: "centred", label: "Star at the centre", type: "bool" },
    { key: "shift", label: "Colour order", type: "int", min: 0, max: 7 },
  ],
  defaults: { system: "decagonal", angle: 54, gap: 0, style: "strap", band: 2.4, width: 200, cols: 1, rows: 1, centred: false, shift: 0 },
  size: (p) => { const s = girihSize(toGeo(p)); return { w: s.w, h: s.h }; },
  build(p, ctx) {
    const geo = buildGirih(toGeo(p), { pieces: str(p, "style") !== "lines", overReach: (num(p, "band") * 1.56) / 2 + 0.3, bandExtra: num(p, "band") * 0.35 });
    const pal = ctx.palette;
    const fills = [pal.ground, ...pal.colors];
    // a construction without a consistent over/under weave is drawn as plain strapwork
    const style = str(p, "style") === "interlace" && !geo.weaveConsistent ? "strap" : str(p, "style");
    const bw = num(p, "band"), shift = num(p, "shift") || 0;
    const parts: SvgNode[] = [rect(0, 0, geo.w, geo.h, { fill: style === "lines" ? "#ffffff" : pal.ground, "data-name": "Ground" })];
    if (style !== "lines") {
      const byClass = new Map<number, SvgNode[]>();
      for (const pc of geo.pieces) {
        const col = fills[(pc.cls + shift) % fills.length];
        if (!byClass.has(pc.cls)) byClass.set(pc.cls, []);
        byClass.get(pc.cls)!.push(path(Path.poly(pc.pts), { fill: col, ...(style === "moarraq" ? { stroke: pal.line, "stroke-width": Math.max(0.15, bw * 0.25), "stroke-linejoin": "round" } : {}) }));
      }
      const groups = [...byClass.entries()].sort((a, b) => a[0] - b[0]).map(([cls, nodes]) => g(`Pieces ${String.fromCharCode(65 + (cls % 26))} (${nodes[0].children ? "" : nodes.length})`.replace(" ()", ""), nodes, { "data-kashi-class": cls }));
      parts.push(g("Mosaic pieces", groups));
    }
    if (style !== "moarraq") {
      const d = geo.strands.map((r) => Path.poly(r, false).toString()).join("");
      const edgeW = style === "lines" ? 0 : Math.max(0.3, bw * 0.28);
      const lineCol = style === "lines" ? "#1d1d1d" : pal.line;
      const bandCol = style === "lines" ? "#1d1d1d" : pal.colors[0];
      const straps: SvgNode[] = [];
      if (edgeW) straps.push(path(d, { fill: "none", stroke: lineCol, "stroke-width": bw + 2 * edgeW, "stroke-linejoin": "miter", "stroke-miterlimit": 8, "data-name": "Strap outline" }));
      straps.push(path(d, { fill: "none", stroke: bandCol, "stroke-width": style === "lines" ? Math.max(0.2, bw * 0.4) : bw, "stroke-linejoin": "miter", "stroke-miterlimit": 8, "data-name": "Strap band" }));
      if (style === "interlace") {
        const od = geo.overs.map((r) => Path.poly(r, false).toString()).join("");
        const ob = geo.oversBand.map((r) => Path.poly(r, false).toString()).join("");
        straps.push(g("Over crossings", [
          path(od, { fill: "none", stroke: lineCol, "stroke-width": bw + 2 * edgeW, "stroke-linecap": "butt", "data-name": "Over outline" }),
          path(ob, { fill: "none", stroke: bandCol, "stroke-width": bw, "stroke-linecap": "butt", "data-name": "Over band" }),
        ]));
      }
      parts.push(g("Strapwork", straps, { "clip-path": `url(#${ctx.uid}-clip)` }));
    }
    const guides = g("Construction tiling", geo.tiles.map((t) => path(Path.poly(t.pts), { fill: "none", stroke: "#c0392b", "stroke-width": 0.35, "stroke-dasharray": "2 1.5" })));
    const defs: SvgNode[] = [{ tag: "clipPath", attrs: { id: `${ctx.uid}-clip` }, children: [rect(0, 0, geo.w, geo.h)] }];
    return {
      art: g("Girih", parts),
      guides,
      defs,
      info: { interlaceFallback: str(p, "style") === "interlace" && !geo.weaveConsistent, pieces: geo.pieces.length, shapes: geo.classes, crossings: geo.crossings, weaveRepeats: geo.weaveSeamless, fold: SYSTEMS[str(p, "system")].fold },
    };
  },
};
