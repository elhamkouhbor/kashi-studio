// Star tile systems: tiles cut in the shape of stars with their complementary tiles, as made in Kashan
// and elsewhere from the thirteenth century.
//   star-cross: eight-pointed stars ({8/2}, two overlapping squares) touching point to point on a square
//               lattice, with four-armed cross tiles in between (p4m).
//   star-hex:   six-pointed stars (hexagrams) and regular hexagons. Each star is a hexagon of the
//               trihexagonal tiling (3.6.3.6) together with its six triangles, taken on one third of the
//               hexagons, so every remaining hexagon shares its edges with star points (p6m).
// Each tile is a separate closed path with a moulded rim, so tiles can be recoloured one by one.
import { Path } from "../geometry/path";
import { type Pt, TAU, D2R, matMul, polar, rotateM, translate } from "../geometry/vec";
import { petal, eslimiLeaf } from "../ornament/floral";
import { g, path, rect, type SvgNode } from "../ornament/node";
import { bool, num, str, type Generator } from "./types";
import { starOutline, crossOutline } from "./lustre";

const S3 = Math.sqrt(3);

function hexagram(c: Pt, s: number, a0 = 0): Pt[] {
  // hexagon of side s plus its six edge triangles: points at s·√3, inner corners at s
  const out: Pt[] = [];
  for (let k = 0; k < 12; k++) out.push(polar(k % 2 ? s : s * S3, a0 + (k * TAU) / 12 + Math.PI / 6, c));
  return out;
}
function hexagon(c: Pt, s: number, a0 = 0): Pt[] {
  return Array.from({ length: 6 }, (_, k) => polar(s, a0 + (k * TAU) / 6, c));
}

function fillMotif(kind: string, c: Pt, r: number, n: number): Path {
  const d = new Path();
  if (kind === "rosette") {
    for (let k = 0; k < n; k++) d.append(petal(r, r * 0.5, "cleft").transform(matMul(translate(c[0], c[1]), rotateM((k / n) * TAU))));
    d.append(Path.circle(c, r * 0.2));
  } else if (kind === "palmettes") {
    for (let k = 0; k < Math.min(n, 8); k++) {
      const m = matMul(translate(c[0], c[1]), rotateM((k / Math.min(n, 8)) * TAU));
      d.append(petal(r, r * 0.42, "point").transform(m));
      d.append(eslimiLeaf(r * 0.7, r * 0.38, 0.5, 1).transform(matMul(m, rotateM(36 * D2R))));
    }
  } else if (kind === "dots") {
    for (let k = 0; k < n; k++) d.append(Path.circle(polar(r * 0.65, (k / n) * TAU, c), r * 0.12));
    d.append(Path.circle(c, r * 0.22));
  }
  return d;
}

export const starTiles: Generator = {
  id: "star-tiles",
  family: "lustre",
  name: "Star tile systems",
  nameFa: "کاشی‌های ستاره‌ای",
  params: [
    { key: "system", label: "System", type: "select", options: [{ value: "star-cross", label: "Eight-pointed stars and crosses" }, { value: "star-hex", label: "Six-pointed stars and hexagons" }] },
    { key: "size", label: "Star width", type: "range", min: 30, max: 400, step: 1, unit: "mm" },
    { key: "repeat", label: "Repeats", type: "int", min: 1, max: 5 },
    { key: "fill", label: "Star fill", type: "select", options: [{ value: "rosette", label: "Rosette" }, { value: "palmettes", label: "Palmettes" }, { value: "dots", label: "Dots" }, { value: "none", label: "Plain" }] },
    { key: "rim", label: "Moulded rim", type: "bool" },
    { key: "alternate", label: "Alternate star colours", type: "bool" },
  ],
  defaults: { system: "star-cross", size: 160, repeat: 2, fill: "rosette", rim: true, alternate: false },
  size: (p) => {
    const a = num(p, "size"), n = num(p, "repeat");
    if (str(p, "system") === "star-hex") { const s = a / (2 * S3); return { w: 6 * s * n, h: 2 * S3 * s * n }; }
    return { w: a * n, h: a * n };
  },
  build(p, ctx) {
    const pal = ctx.palette, a = num(p, "size"), n = num(p, "repeat");
    const { w: W, h: H } = starTiles.size(p);
    const rimW = bool(p, "rim") ? a * 0.012 : 0;
    const stars: SvgNode[] = [], others: SvgNode[] = [], paint: SvgNode[] = [];
    const starFill = (i: number) => (bool(p, "alternate") && i % 2 ? pal.colors[2] ?? pal.colors[0] : pal.colors[0]);
    const tileAttrs = (fill: string, name: string) => ({ fill, stroke: rimW ? pal.ground : undefined, "stroke-width": rimW || undefined, "stroke-linejoin": "round", "data-name": name });
    if (str(p, "system") === "star-hex") {
      const s = a / (2 * S3); // hexagon side
      // trihexagonal lattice: hexagon centres at i·(2s, 0) + j·(s, s√3); stars on the index-3 sublattice
      const R = Math.ceil(Math.max(W, H) / s) + 4;
      let idx = 0;
      for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
        const c: Pt = [i * 2 * s + j * s, j * S3 * s];
        if (c[0] < -2 * s || c[1] < -2 * s || c[0] > W + 2 * s || c[1] > H + 2 * s) continue;
        if (((i - j) % 3 + 3) % 3 === 0) {
          stars.push(path(Path.poly(hexagram(c, s)), tileAttrs(starFill(idx++), "Star tile")));
          if (str(p, "fill") !== "none") paint.push(path(fillMotif(str(p, "fill"), c, s * 0.75, 6), { fill: pal.ground, "data-name": "Star motif" }));
        } else {
          others.push(path(Path.poly(hexagon(c, s, Math.PI / 6 * 0)), tileAttrs(pal.colors[1] ?? pal.colors[0], "Hexagon tile")));
          paint.push(path(fillMotif("dots", c, s * 0.4, 6), { fill: pal.ground, "data-name": "Hexagon motif" }));
        }
      }
    } else {
      let idx = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const c: Pt = [a / 2 + i * a, a / 2 + j * a];
        stars.push(path(Path.poly(starOutline(c, a / 2)), tileAttrs(starFill(idx++), "Star tile")));
        if (str(p, "fill") !== "none") paint.push(path(fillMotif(str(p, "fill"), c, a * 0.24, 8), { fill: pal.ground, "data-name": "Star motif" }));
      }
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
        const c: Pt = [i * a, j * a];
        others.push(path(Path.poly(crossOutline(c, a)), tileAttrs(pal.colors[1] ?? pal.colors[0], "Cross tile")));
        paint.push(path(fillMotif("dots", c, a * 0.14, 4), { fill: pal.ground, "data-name": "Cross motif" }));
      }
    }
    const art = g("Star tiles", [rect(0, 0, W, H, { fill: pal.ground, "data-name": "Ground" }), g("Complementary tiles", others), g("Star tiles", stars), g("Painting", paint)], { "clip-path": `url(#${ctx.uid}-clip)` });
    return { art, defs: [{ tag: "clipPath", attrs: { id: `${ctx.uid}-clip` }, children: [rect(0, 0, W, H)] }] };
  },
};
