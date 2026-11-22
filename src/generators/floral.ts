// Floral generators: khatai flower tiles, eslimi scroll tiles, palmette motifs and medallions.
// Compositions use the symmetries of Persian tile design (a square tile is usually symmetric under the
// eight motions of the square, so motifs crossing an edge meet their mirror image and repeat seamlessly).
import { Path } from "../geometry/path";
import { type Pt, D2R, TAU, matMul, rotateM, translate, scaleM, reflectM, polar, type Mat } from "../geometry/vec";
import { petal, leaf, eslimiLeaf, rosette, palmette, spiralPoints, along, stemPath, bud, type Tip } from "../ornament/floral";
import { g, path, rect, circle, withTransform, type SvgNode } from "../ornament/node";
import { type Shape, xf, symmetric, toNodes } from "../ornament/shapes";
import { bool, num, str, type Generator, type Params } from "./types";
import type { Palette } from "../color/palettes";

const col = (pal: Palette, i: number) => pal.colors[i % pal.colors.length];
const tipOptions = [{ value: "point", label: "Pointed" }, { value: "round", label: "Round" }, { value: "cleft", label: "Cleft" }];
const clip = (uid: string, w: number, h: number): SvgNode => ({ tag: "clipPath", attrs: { id: `${uid}-clip` }, children: [rect(0, 0, w, h)] });

/** Palmette shapes in a local frame (base at origin, pointing up), as shapes for composition. */
function palmetteShapes(L: number, pal: Palette, pairs = 2, spread = 20, tip: Tip = "point"): Shape[] {
  const outer = new Path(), inner = new Path(), cup = new Path();
  // outer petals first (behind), curling outwards, then the central petal on top
  for (let i = pairs; i >= 1; i--) {
    const a = spread * i * D2R, l = L * (0.96 - 0.1 * i), w = L * (0.4 - 0.04 * i);
    const p = eslimiLeaf(l, w, 0.42, 1, 1).transform(translate(0, -L * 0.06));
    outer.append(p.transform(rotateM(-a)));
    outer.append(p.transform(matMul(rotateM(a), reflectM(Math.PI / 2))));
    const ip = petal(l * 0.5, w * 0.3, "point").transform(translate(0, -L * 0.14));
    inner.append(ip.transform(rotateM(a * 0.8)));
    inner.append(ip.transform(rotateM(-a * 0.8)));
  }
  outer.append(petal(L, L * 0.46, tip, 0.5).transform(translate(0, -L * 0.08)));
  inner.append(petal(L * 0.66, L * 0.22, "point", 0.5).transform(translate(0, -L * 0.16)));
  cup.M([-L * 0.26, -L * 0.1]).C([-L * 0.26, L * 0.14], [L * 0.26, L * 0.14], [L * 0.26, -L * 0.1]).C([L * 0.1, -L * 0.02], [-L * 0.1, -L * 0.02], [-L * 0.26, -L * 0.1]).Z();
  return [
    { d: outer, fill: col(pal, 0), stroke: pal.line, sw: L * 0.012, name: "Palmette petals", layer: "Palmettes" },
    { d: inner, fill: col(pal, 2), stroke: pal.line, sw: L * 0.008, name: "Palmette inner petals", layer: "Palmettes" },
    { d: cup, fill: col(pal, 1), stroke: pal.line, sw: L * 0.01, name: "Palmette calyx", layer: "Palmettes" },
  ];
}

function rosetteShapes(r: number, pal: Palette, n: number, tip: Tip, layers = 2): Shape[] {
  const out: Shape[] = [];
  const fills = [col(pal, 0), col(pal, 2), col(pal, 1)];
  for (let l = 0; l < layers; l++) {
    const len = r * (1 - l * 0.3), w = (TAU * len * 0.62) / n * (l ? 0.8 : 1);
    const base = petal(len, w, l === 0 ? tip : "point", 0.52);
    const d = new Path();
    for (let k = 0; k < n; k++) d.append(base.transform(rotateM(((k + (l % 2) * 0.5) / n) * TAU)));
    out.push({ d, fill: fills[l % fills.length], stroke: pal.line, sw: r * 0.015, name: `Petal ring ${l + 1}`, layer: "Rosettes" });
  }
  out.push({ d: Path.circle([0, 0], r * 0.24), fill: col(pal, 1), stroke: pal.line, sw: r * 0.015, name: "Rosette centre", layer: "Rosettes" });
  const dots = new Path();
  for (let k = 0; k < n; k++) dots.append(Path.circle(polar(r * 0.15, (k / n) * TAU), r * 0.03));
  out.push({ d: dots, fill: col(pal, 2), name: "Rosette dots", layer: "Rosettes" });
  return out;
}

function leafShapes(L: number, W: number, pal: Palette, teeth = 0, bend = 0.12): Shape[] {
  const lf = leaf(L, W, { teeth, bend });
  return [
    { d: lf.outline, fill: col(pal, 3), stroke: pal.line, sw: L * 0.012, name: "Leaf", layer: "Leaves" },
    { d: lf.rib, stroke: pal.line, sw: L * 0.012, name: "Leaf vein", layer: "Leaves" },
  ];
}

// ------------------------------------------------------------------ khatai flower tile

export const khataiTile: Generator = {
  id: "khatai-tile",
  family: "khatai",
  name: "Khatai flower tile",
  nameFa: "کاشی گل ختایی",
  params: [
    { key: "size", label: "Tile size", type: "range", min: 40, max: 600, step: 1, unit: "mm" },
    { key: "petals", label: "Petals", type: "int", min: 5, max: 16 },
    { key: "tip", label: "Petal tip", type: "select", options: tipOptions },
    { key: "rings", label: "Petal rings", type: "int", min: 1, max: 3 },
    { key: "flower", label: "Flower size", type: "range", min: 0.12, max: 0.34, step: 0.01 },
    { key: "palmettes", label: "Palmettes on the axes", type: "bool" },
    { key: "leaves", label: "Leaves on the diagonals", type: "bool" },
    { key: "corners", label: "Corner rosettes", type: "bool" },
    { key: "stem", label: "Stem ring", type: "bool" },
  ],
  defaults: { size: 150, petals: 8, tip: "cleft", rings: 2, flower: 0.22, palmettes: true, leaves: true, corners: true, stem: true },
  size: (p) => ({ w: num(p, "size"), h: num(p, "size") }),
  build(p, ctx) {
    const S = num(p, "size"), pal = ctx.palette, c: Pt = [S / 2, S / 2];
    const shapes: Shape[] = [];
    const R = S * num(p, "flower");
    if (bool(p, "stem")) {
      const ring = Path.circle([0, 0], R * 1.45);
      shapes.push({ d: ring.transform(translate(c[0], c[1])), stroke: col(pal, 3), sw: S * 0.012, name: "Stem ring", layer: "Stems" });
    }
    if (bool(p, "leaves")) {
      for (let k = 0; k < 4; k++) {
        const a = (45 + 90 * k) * D2R;
        const m = matMul(translate(c[0], c[1]), matMul(rotateM(a + Math.PI / 2), translate(0, -R * 1.1)));
        shapes.push(...xf(leafShapes(S * 0.2, S * 0.08, pal, 5, 0.05), m));
      }
    }
    if (bool(p, "palmettes")) {
      for (let k = 0; k < 4; k++) {
        const m = matMul(translate(c[0], c[1]), matMul(rotateM((90 * k) * D2R), translate(0, -R * 1.25)));
        shapes.push(...xf(palmetteShapes(S * 0.2, pal, 2, 24), m));
      }
    }
    shapes.push(...xf(rosetteShapes(R, pal, num(p, "petals"), str(p, "tip") as Tip, num(p, "rings")), translate(c[0], c[1])));
    if (bool(p, "corners")) {
      for (const q of [[0, 0], [S, 0], [0, S], [S, S]] as Pt[]) shapes.push(...xf(rosetteShapes(R * 0.85, pal, num(p, "petals"), str(p, "tip") as Tip, Math.max(1, num(p, "rings") - 1)), translate(q[0], q[1])));
    }
    const art = g("Khatai tile", [rect(0, 0, S, S, { fill: pal.ground, "data-name": "Ground" }), g("Ornament", toNodes(shapes), { "clip-path": `url(#${ctx.uid}-clip)` })]);
    return { art, defs: [clip(ctx.uid, S, S)], guides: squareGuides(S) };
  },
};

function squareGuides(S: number, n = 8): SvgNode {
  const d = new Path();
  const c: Pt = [S / 2, S / 2];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI;
    const dx = Math.cos(a) * S, dy = Math.sin(a) * S;
    d.M([c[0] - dx, c[1] - dy]).L([c[0] + dx, c[1] + dy]);
  }
  d.append(Path.circle(c, S * 0.25)).append(Path.circle(c, S * 0.5));
  return g("Symmetry guides", [path(d, { fill: "none", stroke: "#c0392b", "stroke-width": 0.3, "stroke-dasharray": "2 1.5" })], { "clip-path": undefined });
}

// ------------------------------------------------------------------ eslimi scroll tile

export const eslimiTile: Generator = {
  id: "eslimi-tile",
  family: "eslimi",
  name: "Eslimi scroll tile",
  nameFa: "کاشی اسلیمی",
  params: [
    { key: "size", label: "Tile size", type: "range", min: 40, max: 600, step: 1, unit: "mm" },
    { key: "symmetry", label: "Symmetry", type: "select", options: [{ value: "4", label: "Mirror in 4 (quarter)" }, { value: "8", label: "Mirror in 8 (eighth)" }] },
    { key: "turns", label: "Scroll turns", type: "range", min: 0.6, max: 2, step: 0.05 },
    { key: "radius", label: "Scroll size", type: "range", min: 0.12, max: 0.24, step: 0.005 },
    { key: "leaves", label: "Leaves per scroll", type: "int", min: 0, max: 10 },
    { key: "leafSize", label: "Leaf size", type: "range", min: 0.04, max: 0.12, step: 0.002 },
    { key: "stem", label: "Stem width", type: "range", min: 0.3, max: 6, step: 0.1, unit: "mm" },
    { key: "flower", label: "Flower at the centre", type: "bool" },
    { key: "ends", label: "Scroll ends", type: "select", options: [{ value: "palmette", label: "Palmette" }, { value: "split", label: "Split palmette" }, { value: "bud", label: "Bud" }] },
  ],
  defaults: { size: 150, symmetry: "4", turns: 1.2, radius: 0.2, leaves: 6, leafSize: 0.1, stem: 1.6, flower: true, ends: "split" },
  size: (p) => ({ w: num(p, "size"), h: num(p, "size") }),
  build(p, ctx) {
    const S = num(p, "size"), pal = ctx.palette, c: Pt = [S / 2, S / 2];
    const r = S * num(p, "radius"), turns = num(p, "turns");
    // one quadrant: a scroll centred on the quadrant's diagonal, entered from the tile centre
    const sc: Pt = [S * 0.25, S * 0.25];
    const spiral = spiralPoints(sc, r, r * 0.22, Math.atan2(c[1] - sc[1], c[0] - sc[0]), turns, 1, 18);
    const lead: Pt[] = [[S * 0.5, S * 0.5], [S * 0.44, S * 0.36], spiral[0]];
    const stemPts = [...lead.slice(0, -1), ...spiral];
    const quarter: Shape[] = [{ d: stemPath(stemPts), stroke: col(pal, 3), sw: num(p, "stem"), name: "Scroll stem", layer: "Stems" }];
    // a stem to the tile corner so neighbouring tiles join
    quarter.push({ d: stemPath([spiral[Math.round(spiral.length * 0.18)], [S * 0.12, S * 0.12], [0, 0]]), stroke: col(pal, 3), sw: num(p, "stem"), name: "Corner stem", layer: "Stems" });
    const nLeaves = num(p, "leaves"), ls = S * num(p, "leafSize");
    if (nLeaves > 0) {
      const usable = spiral.slice(0, Math.round(spiral.length * 0.85));
      let len = 0;
      for (let i = 1; i < usable.length; i++) len += Math.hypot(usable[i][0] - usable[i - 1][0], usable[i][1] - usable[i - 1][1]);
      along(usable, len / nLeaves, (m, i) => {
        const L = ls * (1 - i * 0.05);
        const lf = eslimiLeaf(L, L * 0.55, 0.4, 1);
        quarter.push({ d: lf.transform(m), fill: i % 2 ? col(pal, 0) : col(pal, 1), stroke: pal.line, sw: S * 0.0025, name: "Eslimi leaf", layer: "Eslimi leaves" });
      }, { alternate: true, start: len / nLeaves / 2 });
    }
    // the scroll's eye
    const eye = spiral[spiral.length - 1];
    const ends = str(p, "ends");
    const endM = matMul(translate(eye[0], eye[1]), rotateM(-30 * D2R));
    if (ends === "palmette") quarter.push(...xf(palmetteShapes(r * 0.9, pal, 2, 26), endM));
    else if (ends === "bud") {
      const b = bud(r * 0.7, r * 0.4);
      quarter.push({ d: b.body.transform(endM), fill: col(pal, 2), stroke: pal.line, sw: S * 0.002, name: "Bud", layer: "Buds" });
      for (const sp of b.sepals) quarter.push({ d: sp.transform(endM), fill: col(pal, 3), stroke: pal.line, sw: S * 0.002, name: "Sepal", layer: "Buds" });
    } else {
      const L = r * 0.75;
      quarter.push({ d: eslimiLeaf(L, L * 0.6, 0.5, -1).transform(matMul(endM, rotateM(-14 * D2R))), fill: col(pal, 0), stroke: pal.line, sw: S * 0.0025, name: "Split palmette", layer: "Split palmettes" });
      quarter.push({ d: eslimiLeaf(L, L * 0.6, 0.5, 1).transform(matMul(endM, rotateM(14 * D2R))), fill: col(pal, 0), stroke: pal.line, sw: S * 0.0025, name: "Split palmette", layer: "Split palmettes" });
      quarter.push({ d: petal(L * 0.55, L * 0.26, "point").transform(endM), fill: col(pal, 2), stroke: pal.line, sw: S * 0.0025, name: "Split palmette bud", layer: "Split palmettes" });
    }
    const n = str(p, "symmetry") === "8" ? 8 : 4;
    let all: Shape[];
    if (n === 4) all = symmetric(quarter, 2, true, c, 0).flatMap((s, i, arr) => (i < arr.length ? [s] : []));
    else all = symmetric(quarter, 4, true, c, Math.PI / 4);
    if (n === 4) {
      // mirror across both axes: identity, mirror x, mirror y, rotate 180
      all = [...quarter, ...xf(quarter, reflectM(Math.PI / 2, c)), ...xf(quarter, reflectM(0, c)), ...xf(quarter, rotateM(Math.PI, c))];
    }
    const parts: SvgNode[] = [rect(0, 0, S, S, { fill: pal.ground, "data-name": "Ground" })];
    const flower = bool(p, "flower") ? xf(rosetteShapes(S * 0.09, pal, 8, "cleft", 2), translate(c[0], c[1])) : [];
    const corners = [[0, 0], [S, 0], [0, S], [S, S]].flatMap((q) => xf(rosetteShapes(S * 0.07, pal, 8, "round", 1), translate(q[0], q[1])));
    parts.push(g("Ornament", toNodes([...all, ...flower, ...corners]), { "clip-path": `url(#${ctx.uid}-clip)` }));
    return { art: g("Eslimi tile", parts), defs: [clip(ctx.uid, S, S)], guides: squareGuides(S) };
  },
};

// ------------------------------------------------------------------ palmette motif (single)

export const palmetteMotif: Generator = {
  id: "palmette",
  family: "khatai",
  name: "Palmette and flower motif",
  nameFa: "نقش شاه‌عباسی و گل",
  params: [
    { key: "kind", label: "Motif", type: "select", options: [
      { value: "palmette", label: "Palmette (shah-abbasi, side view)" },
      { value: "rosette", label: "Rosette (top view)" },
      { value: "bud", label: "Bud" },
      { value: "leaf", label: "Serrated leaf" },
      { value: "eslimi", label: "Eslimi leaf" },
      { value: "split", label: "Split palmette" },
    ] },
    { key: "size", label: "Size", type: "range", min: 10, max: 300, step: 1, unit: "mm" },
    { key: "petals", label: "Petals or petal pairs", type: "int", min: 1, max: 16 },
    { key: "spread", label: "Spread", type: "range", min: 10, max: 45, step: 1, unit: "°" },
    { key: "tip", label: "Petal tip", type: "select", options: tipOptions },
    { key: "hook", label: "Hook (eslimi)", type: "range", min: 0, max: 0.8, step: 0.01 },
  ],
  defaults: { kind: "palmette", size: 80, petals: 2, spread: 22, tip: "point", hook: 0.4 },
  size: (p) => ({ w: num(p, "size") * 1.2, h: num(p, "size") * 1.2 }),
  build(p, ctx) {
    const s = num(p, "size"), pal = ctx.palette, W = s * 1.2;
    const at = (base: Pt) => translate(base[0], base[1]);
    let shapes: Shape[] = [];
    const kind = str(p, "kind");
    if (kind === "palmette") shapes = xf(palmetteShapes(s * 0.8, pal, Math.min(4, num(p, "petals")), num(p, "spread"), str(p, "tip") as Tip), at([W / 2, W * 0.88]));
    else if (kind === "rosette") shapes = xf(rosetteShapes(s * 0.5, pal, Math.max(5, num(p, "petals")), str(p, "tip") as Tip, 2), at([W / 2, W / 2]));
    else if (kind === "bud") { const b = bud(s * 0.7, s * 0.38); const m = at([W / 2, W * 0.85]); shapes = [{ d: b.body.transform(m), fill: col(pal, 2), stroke: pal.line, sw: s * 0.01, name: "Bud", layer: "Bud" }, ...b.sepals.map((d) => ({ d: d.transform(m), fill: col(pal, 3), stroke: pal.line, sw: s * 0.01, name: "Sepal", layer: "Bud" }))]; }
    else if (kind === "leaf") shapes = xf(leafShapes(s * 0.9, s * 0.36, pal, 6, 0.15), at([W / 2, W * 0.95]));
    else if (kind === "eslimi") shapes = [{ d: eslimiLeaf(s * 0.9, s * 0.5, num(p, "hook"), 1).transform(at([W / 2, W * 0.95])), fill: col(pal, 0), stroke: pal.line, sw: s * 0.01, name: "Eslimi leaf", layer: "Eslimi" }];
    else {
      const m = at([W / 2, W * 0.95]), L = s * 0.85;
      shapes = [
        { d: eslimiLeaf(L, L * 0.55, num(p, "hook"), -1).transform(matMul(m, rotateM(-14 * D2R))), fill: col(pal, 0), stroke: pal.line, sw: s * 0.01, name: "Left half", layer: "Split palmette" },
        { d: eslimiLeaf(L, L * 0.55, num(p, "hook"), 1).transform(matMul(m, rotateM(14 * D2R))), fill: col(pal, 0), stroke: pal.line, sw: s * 0.01, name: "Right half", layer: "Split palmette" },
        { d: petal(L * 0.5, L * 0.22, "point").transform(m), fill: col(pal, 2), stroke: pal.line, sw: s * 0.01, name: "Centre", layer: "Split palmette" },
      ];
    }
    return { art: g("Motif", toNodes(shapes)) };
  },
};

// ------------------------------------------------------------------ medallion

/** Lobed outline (the toranj and shamse frames): n lobes around radius r with depth d. */
export function lobed(c: Pt, rx: number, ry: number, n: number, depth: number): Path {
  const p = new Path();
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * TAU - Math.PI / 2, a1 = ((k + 1) / n) * TAU - Math.PI / 2, am = (a0 + a1) / 2;
    const P = (a: number, f: number): Pt => [c[0] + rx * f * Math.cos(a), c[1] + ry * f * Math.sin(a)];
    const v0 = P(a0, 1 - depth), v1 = P(a1, 1 - depth);
    if (!k) p.M(v0);
    const bulge = 1 + depth * 0.9;
    p.C(P(a0 + (am - a0) * 0.15, bulge), P(am - (am - a0) * 0.35, bulge), P(am, 1 + depth * 0.25));
    p.C(P(am + (a1 - am) * 0.35, bulge), P(a1 - (a1 - am) * 0.15, bulge), v1);
  }
  return p.Z();
}

export const medallion: Generator = {
  id: "medallion",
  family: "medallion",
  name: "Medallion (toranj and shamse)",
  nameFa: "ترنج و شمسه",
  params: [
    { key: "size", label: "Tile size", type: "range", min: 40, max: 800, step: 1, unit: "mm" },
    { key: "shape", label: "Frame", type: "select", options: [{ value: "shamse", label: "Round, lobed (shamse)" }, { value: "toranj", label: "Oval, lobed (toranj)" }, { value: "star", label: "Star (geometric)" }] },
    { key: "lobes", label: "Lobes or points", type: "int", min: 6, max: 24 },
    { key: "depth", label: "Lobe depth", type: "range", min: 0, max: 0.2, step: 0.005 },
    { key: "ring", label: "Palmettes in the ring", type: "int", min: 0, max: 16 },
    { key: "petals", label: "Central rosette petals", type: "int", min: 5, max: 16 },
    { key: "corners", label: "Corner quarters (lachak)", type: "bool" },
    { key: "pendants", label: "Pendants (sar-toranj)", type: "bool" },
  ],
  defaults: { size: 200, shape: "shamse", lobes: 12, depth: 0.08, ring: 8, petals: 8, corners: true, pendants: true },
  size: (p) => ({ w: num(p, "size"), h: num(p, "size") * (str(p, "shape") === "toranj" ? 1.4 : 1) }),
  build(p, ctx) {
    const S = num(p, "size"), H = S * (str(p, "shape") === "toranj" ? 1.4 : 1), pal = ctx.palette, c: Pt = [S / 2, H / 2];
    const rx = S * 0.36, ry = str(p, "shape") === "toranj" ? H * 0.36 : rx;
    const n = num(p, "lobes"), shapes: Shape[] = [];
    let frame: Path;
    if (str(p, "shape") === "star") {
      const pts: Pt[] = [];
      for (let k = 0; k < 2 * n; k++) pts.push(polar(k % 2 ? rx * 0.78 : rx, (k / (2 * n)) * TAU - Math.PI / 2, c));
      frame = Path.poly(pts);
    } else frame = lobed(c, rx, ry, n, num(p, "depth"));
    shapes.push({ d: frame.transform(matMul(translate(c[0], c[1]), matMul(scaleM(1.07), translate(-c[0], -c[1])))), fill: col(pal, 0), stroke: pal.line, sw: S * 0.004, name: "Frame border", layer: "Medallion frame" });
    shapes.push({ d: frame, fill: col(pal, 1 + (pal.colors.length > 4 ? 3 : 0)), stroke: pal.line, sw: S * 0.004, name: "Medallion field", layer: "Medallion frame" });
    const ringN = num(p, "ring");
    for (let k = 0; k < ringN; k++) {
      const a = (k / ringN) * TAU;
      const m = matMul(translate(c[0], c[1]), matMul(scaleM(1, ry / rx), matMul(rotateM(a), translate(0, -rx * 0.24))));
      shapes.push(...xf(palmetteShapes(rx * 0.5, pal, 1, 30), m));
    }
    shapes.push(...xf(rosetteShapes(rx * 0.26, pal, num(p, "petals"), "cleft", 2), translate(c[0], c[1])));
    if (bool(p, "pendants") && str(p, "shape") !== "star") {
      for (const sgn of [-1, 1]) {
        const m = matMul(translate(c[0], c[1] + sgn * ry * 1.06), rotateM(sgn > 0 ? Math.PI : 0));
        shapes.push({ d: petal(rx * 0.32, rx * 0.26, "cleft", 0.45).transform(m), fill: col(pal, 0), stroke: pal.line, sw: S * 0.004, name: "Pendant", layer: "Pendants" });
        shapes.push({ d: petal(rx * 0.18, rx * 0.1, "point").transform(m), fill: col(pal, 2), stroke: pal.line, sw: S * 0.003, name: "Pendant centre", layer: "Pendants" });
      }
    }
    if (bool(p, "corners")) {
      for (const q of [[0, 0], [S, 0], [0, H], [S, H]] as Pt[]) {
        const cf = lobed(q, rx * 0.55, rx * 0.55, Math.max(6, n), num(p, "depth"));
        shapes.push({ d: cf, fill: col(pal, 0), stroke: pal.line, sw: S * 0.004, name: "Corner quarter", layer: "Corner quarters" });
        shapes.push(...xf(rosetteShapes(rx * 0.2, pal, 8, "round", 1), translate(q[0], q[1])));
      }
    }
    const art = g("Medallion", [rect(0, 0, S, H, { fill: pal.ground, "data-name": "Ground" }), g("Ornament", toNodes(shapes), { "clip-path": `url(#${ctx.uid}-clip)` })]);
    return { art, defs: [clip(ctx.uid, S, H)], guides: squareGuides(Math.min(S, H)) };
  },
};

export { petal, withTransform, circle, rosette, palmette };
export const _unused = (m: Mat, params: Params) => [m, params];
