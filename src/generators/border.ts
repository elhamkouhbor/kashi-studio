// Borders (hashiye) with corner blocks (lachak). Each side holds a whole number of motif units, stretched
// slightly to fit exactly, so the band meets the corner blocks without a break. Every unit is mirror
// symmetric, so the pattern also joins cleanly where one unit meets the next.
import { Path, smoothThrough } from "../geometry/path";
import { type Pt, D2R, TAU, matMul, rotateM, translate, scaleM, polar, type Mat } from "../geometry/vec";
import { eslimiLeaf, petal } from "../ornament/floral";
import { lobed as lobedPath } from "./floral";
import { g, rect, path, type SvgNode } from "../ornament/node";
import { type Shape, xf, toNodes } from "../ornament/shapes";
import { bool, num, str, type Generator } from "./types";
import type { Palette } from "../color/palettes";

const col = (pal: Palette, i: number) => pal.colors[i % pal.colors.length];

export const BORDER_MOTIFS = [
  { value: "scroll", label: "Running scroll with leaves (eslimi)" },
  { value: "flowers", label: "Alternating flowers and buds (khatai)" },
  { value: "guilloche", label: "Interlaced guilloche" },
  { value: "chevron", label: "Chevron" },
  { value: "sawtooth", label: "Reciprocal triangles (dandane)" },
  { value: "beads", label: "Beads and lozenges" },
  { value: "lattice", label: "Small octagon and cross lattice" },
  { value: "cartouche", label: "Linked cartouches" },
] as const;

/** One unit of band, w long and h high, in a frame with the band along x from 0 to w, y from 0 to h. */
export function borderUnit(kind: string, w: number, h: number, pal: Palette): Shape[] {
  const out: Shape[] = [];
  const line = pal.line, sw = h * 0.025;
  const cy = h / 2;
  switch (kind) {
    case "scroll": {
      // an S wave: up for the first half, down for the second, leaves on the outside of each crest
      const pts: Pt[] = [];
      for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push([t * w, cy - Math.sin(t * TAU) * h * 0.22]); }
      out.push({ d: smoothThrough(pts), stroke: col(pal, 3), sw: h * 0.05, name: "Stem", layer: "Stem" });
      for (const [t, up] of [[0.25, 1], [0.75, -1]] as const) {
        const base: Pt = [t * w, cy - up * h * 0.22];
        const m = matMul(translate(base[0], base[1]), up > 0 ? rotateM(0) : rotateM(Math.PI));
        const L = h * 0.42;
        out.push({ d: eslimiLeaf(L, L * 0.5, 0.45, 1).transform(matMul(m, rotateM(28 * D2R))), fill: col(pal, 0), stroke: line, sw, name: "Leaf", layer: "Leaves" });
        out.push({ d: eslimiLeaf(L, L * 0.5, 0.45, -1).transform(matMul(m, rotateM(-28 * D2R))), fill: col(pal, 0), stroke: line, sw, name: "Leaf", layer: "Leaves" });
        out.push({ d: petal(L * 0.62, L * 0.32, "point").transform(m), fill: col(pal, 2), stroke: line, sw, name: "Bud", layer: "Leaves" });
      }
      break;
    }
    case "flowers": {
      const r = h * 0.3;
      const ros = new Path();
      for (let k = 0; k < 8; k++) ros.append(petal(r, r * 0.55, "round").transform(matMul(translate(w * 0.25, cy), rotateM((k / 8) * TAU))));
      out.push({ d: ros, fill: col(pal, 0), stroke: line, sw, name: "Flower", layer: "Flowers" });
      out.push({ d: Path.circle([w * 0.25, cy], r * 0.3), fill: col(pal, 2), stroke: line, sw, name: "Flower centre", layer: "Flowers" });
      const b = petal(h * 0.5, h * 0.3, "point").transform(matMul(translate(w * 0.75, cy + h * 0.25), rotateM(0)));
      out.push({ d: b, fill: col(pal, 2), stroke: line, sw, name: "Bud", layer: "Buds" });
      for (const s of [-1, 1]) out.push({ d: eslimiLeaf(h * 0.32, h * 0.18, 0.4, s as 1 | -1).transform(matMul(translate(w * 0.75, cy + h * 0.28), rotateM(s * 55 * D2R))), fill: col(pal, 3), stroke: line, sw, name: "Leaf", layer: "Buds" });
      break;
    }
    case "guilloche": {
      const a: Pt[] = [], b: Pt[] = [];
      for (let i = 0; i <= 24; i++) { const t = i / 24; a.push([t * w, cy + Math.sin(t * TAU) * h * 0.3]); b.push([t * w, cy - Math.sin(t * TAU) * h * 0.3]); }
      out.push({ d: smoothThrough(a), stroke: line, sw: h * 0.16, name: "Strand outline", layer: "Strands" });
      out.push({ d: smoothThrough(b), stroke: line, sw: h * 0.16, name: "Strand outline", layer: "Strands" });
      out.push({ d: smoothThrough(a), stroke: col(pal, 0), sw: h * 0.1, name: "Strand", layer: "Strands" });
      out.push({ d: smoothThrough(b), stroke: col(pal, 1), sw: h * 0.1, name: "Strand", layer: "Strands" });
      // the first strand passes over at the middle crossing (alternation every half unit)
      const over: Pt[] = [];
      for (let i = 0; i <= 6; i++) { const t = 0.42 + (0.16 * i) / 6; over.push([t * w, cy + Math.sin(t * TAU) * h * 0.3]); }
      out.push({ d: smoothThrough(over), stroke: line, sw: h * 0.16, name: "Over outline", layer: "Strands" });
      const over2 = over.slice(1, -1);
      out.push({ d: smoothThrough(over2), stroke: col(pal, 0), sw: h * 0.1, name: "Over", layer: "Strands" });
      out.push({ d: Path.circle([w * 0.25, cy], h * 0.09), fill: col(pal, 2), name: "Eye", layer: "Eyes" });
      out.push({ d: Path.circle([w * 0.75, cy], h * 0.09), fill: col(pal, 2), name: "Eye", layer: "Eyes" });
      break;
    }
    case "chevron": {
      const t = h * 0.16;
      for (let k = 0; k < 2; k++) {
        const x0 = (k * w) / 2;
        const d = Path.poly([[x0, h * 0.75], [x0 + w / 4, h * 0.25], [x0 + w / 2, h * 0.75], [x0 + w / 2, h * 0.75 - t * 1.4], [x0 + w / 4, h * 0.25 - t * 1.4], [x0, h * 0.75 - t * 1.4]]);
        out.push({ d, fill: col(pal, k), stroke: line, sw, name: "Chevron", layer: "Chevrons" });
      }
      break;
    }
    case "sawtooth": {
      out.push({ d: Path.poly([[0, h], [w / 2, 0], [w, h]]), fill: col(pal, 0), stroke: line, sw, name: "Triangle up", layer: "Triangles" });
      out.push({ d: Path.poly([[0, 0], [w / 2, 0], [0, h]]), fill: col(pal, 1), stroke: line, sw, name: "Triangle down", layer: "Triangles" });
      out.push({ d: Path.poly([[w / 2, 0], [w, 0], [w, h]]), fill: col(pal, 1), stroke: line, sw, name: "Triangle down", layer: "Triangles" });
      break;
    }
    case "beads": {
      out.push({ d: Path.circle([w * 0.25, cy], h * 0.2), fill: col(pal, 0), stroke: line, sw, name: "Bead", layer: "Beads" });
      out.push({ d: Path.poly([[w * 0.75, cy - h * 0.32], [w * 0.75 + h * 0.18, cy], [w * 0.75, cy + h * 0.32], [w * 0.75 - h * 0.18, cy]]), fill: col(pal, 2), stroke: line, sw, name: "Lozenge", layer: "Lozenges" });
      for (const x of [w * 0.5]) out.push({ d: Path.circle([x, cy], h * 0.07), fill: col(pal, 1), name: "Dot", layer: "Beads" });
      break;
    }
    case "cartouche": {
      // a lobed cartouche in the middle of each unit, linked by small quatrefoils at the unit ends
      const c: Pt = [w / 2, cy];
      const lob = lobedPath(c, w * 0.36, h * 0.34, 10, 0.06);
      out.push({ d: lob, fill: col(pal, 2), stroke: line, sw: h * 0.03, name: "Cartouche", layer: "Cartouches" });
      out.push({ d: lobedPath(c, w * 0.26, h * 0.22, 10, 0.05), fill: col(pal, 0), stroke: line, sw: h * 0.02, name: "Cartouche field", layer: "Cartouches" });
      for (const x of [0, w]) out.push({ d: lobedPath([x, cy], h * 0.2, h * 0.2, 4, 0.18), fill: col(pal, 1), stroke: line, sw: h * 0.02, name: "Link", layer: "Links" });
      break;
    }
    case "lattice": {
      const s = Math.min(w, h);
      const r = s * 0.42, oct: Pt[] = [];
      for (let k = 0; k < 8; k++) oct.push(polar(r / Math.cos(Math.PI / 8), (k + 0.5) * (TAU / 8), [w / 2, cy]));
      out.push({ d: Path.poly(oct), fill: col(pal, 0), stroke: line, sw, name: "Octagon", layer: "Lattice" });
      const st: Pt[] = [];
      for (let k = 0; k < 8; k++) st.push(polar(k % 2 ? r * 0.25 : r * 0.62, (k * TAU) / 8, [w / 2, cy]));
      out.push({ d: Path.poly(st), fill: col(pal, 2), stroke: line, sw, name: "Star", layer: "Lattice" });
      break;
    }
  }
  return out;
}

export const borderGenerator: Generator = {
  id: "border",
  family: "border",
  name: "Border and corner designer",
  nameFa: "حاشیه و لچک",
  params: [
    { key: "width", label: "Frame width", type: "range", min: 60, max: 2000, step: 1, unit: "mm" },
    { key: "height", label: "Frame height", type: "range", min: 60, max: 2000, step: 1, unit: "mm" },
    { key: "band", label: "Band depth", type: "range", min: 8, max: 160, step: 1, unit: "mm" },
    { key: "motif", label: "Band motif", type: "select", options: [...BORDER_MOTIFS] },
    { key: "unit", label: "Motif length (approximate)", type: "range", min: 0.6, max: 4, step: 0.05 },
    { key: "corner", label: "Corner block", type: "select", options: [{ value: "rosette", label: "Rosette" }, { value: "star", label: "Eight-pointed star" }, { value: "plain", label: "Plain" }, { value: "none", label: "No corner block (mitred)" }] },
    { key: "rules", label: "Edge rules", type: "bool" },
    { key: "field", label: "Fill the centre", type: "bool" },
  ],
  defaults: { width: 300, height: 300, band: 36, motif: "scroll", unit: 2, corner: "rosette", rules: true, field: false },
  size: (p) => ({ w: num(p, "width"), h: num(p, "height") }),
  build(p, ctx) {
    const W = num(p, "width"), H = num(p, "height"), B = num(p, "band"), pal = ctx.palette, kind = str(p, "motif");
    const corner = str(p, "corner");
    const cb = corner === "none" ? 0 : B; // corner block size
    const shapes: Shape[] = [];
    const side = (len: number, m: Mat) => {
      const n = Math.max(1, Math.round(len / (B * num(p, "unit"))));
      const u = len / n;
      for (let i = 0; i < n; i++) shapes.push(...xf(borderUnit(kind, u, B, pal), matMul(m, translate(i * u, 0))));
    };
    // top, right, bottom, left: each band runs clockwise with its outer edge at y = 0
    side(W - 2 * cb, translate(cb, 0));
    side(H - 2 * cb, matMul(translate(W, cb), rotateM(Math.PI / 2)));
    side(W - 2 * cb, matMul(translate(W - cb, H), rotateM(Math.PI)));
    side(H - 2 * cb, matMul(translate(0, H - cb), rotateM(-Math.PI / 2)));
    if (cb) {
      for (const [x, y] of [[0, 0], [W - B, 0], [0, H - B], [W - B, H - B]] as Pt[]) {
        const c: Pt = [x + B / 2, y + B / 2];
        shapes.push({ d: Path.poly([[x, y], [x + B, y], [x + B, y + B], [x, y + B]]), fill: col(pal, 1), stroke: pal.line, sw: B * 0.025, name: "Corner block", layer: "Corner blocks" });
        if (corner === "rosette") {
          const d = new Path();
          for (let k = 0; k < 8; k++) d.append(petal(B * 0.4, B * 0.2, "cleft").transform(matMul(translate(c[0], c[1]), rotateM((k / 8) * TAU))));
          shapes.push({ d, fill: col(pal, 0), stroke: pal.line, sw: B * 0.02, name: "Corner rosette", layer: "Corner blocks" });
          shapes.push({ d: Path.circle(c, B * 0.1), fill: col(pal, 2), stroke: pal.line, sw: B * 0.02, name: "Corner rosette centre", layer: "Corner blocks" });
        } else if (corner === "star") {
          const st: Pt[] = [];
          for (let k = 0; k < 16; k++) st.push(polar(k % 2 ? B * 0.2 : B * 0.44, (k * TAU) / 16 - Math.PI / 2, c));
          shapes.push({ d: Path.poly(st), fill: col(pal, 0), stroke: pal.line, sw: B * 0.02, name: "Corner star", layer: "Corner blocks" });
        }
      }
    }
    const parts: SvgNode[] = [];
    // band ground as a frame (outer rectangle minus inner rectangle, even-odd)
    const frame = new Path().append(Path.poly([[0, 0], [W, 0], [W, H], [0, H]])).append(Path.poly([[B, B], [B, H - B], [W - B, H - B], [W - B, B]]));
    parts.push(path(frame, { fill: pal.ground, "fill-rule": "evenodd", "data-name": "Band ground" }));
    if (bool(p, "field")) parts.push(rect(B, B, W - 2 * B, H - 2 * B, { fill: col(pal, 0), "data-name": "Field" }));
    parts.push(...toNodes(shapes));
    if (bool(p, "rules")) {
      const r = new Path().append(Path.poly([[0, 0], [W, 0], [W, H], [0, H]])).append(Path.poly([[B, B], [W - B, B], [W - B, H - B], [B, H - B]]));
      parts.push(path(r, { fill: "none", stroke: pal.line, "stroke-width": Math.max(0.4, B * 0.05), "data-name": "Edge rules" }));
    }
    void scaleM;
    return { art: g("Border", parts) };
  },
};
