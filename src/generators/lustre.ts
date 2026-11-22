// Lustre star and cross tiles (zarrin-fam, زرین‌فام), after the eight-pointed star and cross tiles made in
// Kashan in the thirteenth and fourteenth centuries. The geometry is exact: eight-pointed stars on a square
// lattice touch point to point, and the cross tiles are the regions between four stars. The painting is an
// original interpretation (reserved white motifs on a lustre ground, scattered dots). The inscription band
// on the star is left empty for the user's own text.
import { Path } from "../geometry/path";
import { type Pt, TAU, D2R, matMul, polar, rotateM, translate, rng, pointInPolygon } from "../geometry/vec";
import { petal, eslimiLeaf } from "../ornament/floral";
import { g, path, rect, type SvgNode } from "../ornament/node";
import { bool, num, str, type Generator } from "./types";

const INNER = Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8); // inner radius of the {8/2} star

export function starOutline(c: Pt, R: number): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k < 16; k++) out.push(polar(k % 2 ? R * INNER : R, (k * TAU) / 16, c));
  return out;
}

/** The cross between four stars of radius a/2 centred on a square lattice of spacing a; c is the cross centre. */
export function crossOutline(c: Pt, a: number): Pt[] {
  const R = a / 2, out: Pt[] = [];
  // the four stars around the cross, in order, each contributing the arc that faces the cross
  const stars: [Pt, number][] = [[[c[0] + a / 2, c[1] - a / 2], 180], [[c[0] + a / 2, c[1] + a / 2], 270], [[c[0] - a / 2, c[1] + a / 2], 0], [[c[0] - a / 2, c[1] - a / 2], 90]];
  for (const [sc, start] of stars) for (let k = 0; k < 4; k++) out.push(polar(k % 2 ? R * INNER : R, (start - k * 22.5) * D2R, sc));
  return out;
}

export const lustreGenerator: Generator = {
  id: "lustre",
  family: "lustre",
  name: "Lustre star and cross tiles",
  nameFa: "کاشی ستاره و چلیپای زرین‌فام",
  params: [
    { key: "size", label: "Star width", type: "range", min: 40, max: 400, step: 1, unit: "mm" },
    { key: "repeat", label: "Stars across", type: "int", min: 1, max: 6 },
    { key: "centre", label: "Star motif", type: "select", options: [{ value: "rosette", label: "Rosette" }, { value: "palmettes", label: "Palmette cross" }, { value: "scroll", label: "Leaf scroll" }] },
    { key: "band", label: "Inscription band (empty)", type: "bool" },
    { key: "dots", label: "Scattered dots", type: "range", min: 0, max: 400, step: 10 },
    { key: "crossFill", label: "Cross colour", type: "select", options: [{ value: "1", label: "Cobalt" }, { value: "2", label: "Turquoise" }, { value: "0", label: "Lustre" }] },
  ],
  defaults: { size: 200, repeat: 1, centre: "rosette", band: true, dots: 160, crossFill: "2" },
  size: (p) => ({ w: num(p, "size") * num(p, "repeat"), h: num(p, "size") * num(p, "repeat") }),
  build(p, ctx) {
    const a = num(p, "size"), n = num(p, "repeat"), pal = ctx.palette, W = a * n;
    const lustre = pal.colors[0], white = pal.ground, line = pal.line;
    const stars: SvgNode[] = [], crosses: SvgNode[] = [], paint: SvgNode[] = [];
    const rand = rng(7);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const c: Pt = [a / 2 + i * a, a / 2 + j * a];
      const outline = starOutline(c, a / 2);
      stars.push(path(Path.poly(outline), { fill: lustre, stroke: white, "stroke-width": a * 0.012, "data-name": "Star tile" }));
      // inscription band: a white band inside the star edge, left empty
      if (bool(p, "band")) {
        const inner = starOutline(c, a / 2 * 0.86);
        const band = new Path().append(Path.poly(outline)).append(Path.poly(inner.slice().reverse()));
        paint.push(path(band, { fill: white, "fill-rule": "evenodd", "data-name": "Inscription band (empty)" }));
        paint.push(path(Path.poly(starOutline(c, a / 2 * 0.83)), { fill: "none", stroke: white, "stroke-width": a * 0.006, "data-name": "Band rule" }));
      }
      const motif = new Path();
      if (str(p, "centre") === "rosette") {
        for (let k = 0; k < 8; k++) motif.append(petal(a * 0.2, a * 0.1, "cleft").transform(matMul(translate(c[0], c[1]), rotateM((k / 8) * TAU))));
        motif.append(Path.circle(c, a * 0.04));
      } else if (str(p, "centre") === "palmettes") {
        for (let k = 0; k < 4; k++) {
          const m = matMul(translate(c[0], c[1]), rotateM((k / 4) * TAU));
          motif.append(petal(a * 0.26, a * 0.11, "point").transform(m));
          motif.append(eslimiLeaf(a * 0.18, a * 0.1, 0.5, 1).transform(matMul(m, rotateM(40 * D2R))));
          motif.append(eslimiLeaf(a * 0.18, a * 0.1, 0.5, -1).transform(matMul(m, rotateM(-40 * D2R))));
        }
      } else {
        for (let k = 0; k < 8; k++) motif.append(eslimiLeaf(a * 0.22, a * 0.12, 0.6, 1).transform(matMul(translate(c[0], c[1]), rotateM((k / 8) * TAU))));
      }
      paint.push(path(motif, { fill: white, "data-name": "Reserved motif" }));
      const dots = new Path(), inner = starOutline(c, a / 2 * (bool(p, "band") ? 0.8 : 0.95));
      for (let k = 0; k < num(p, "dots"); k++) {
        const q: Pt = [c[0] + (rand() - 0.5) * a, c[1] + (rand() - 0.5) * a];
        if (!pointInPolygon(q, inner) || Math.hypot(q[0] - c[0], q[1] - c[1]) < a * 0.24) continue;
        dots.append(Path.circle(q, a * (0.004 + rand() * 0.004)));
      }
      if (dots.segs.length) paint.push(path(dots, { fill: white, "data-name": "Dots" }));
    }
    // crosses centred on the lattice corners (between stars), clipped by the tile
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      const c: Pt = [i * a, j * a];
      const out = crossOutline(c, a);
      crosses.push(path(Path.poly(out), { fill: pal.colors[Number(p.crossFill)] ?? pal.colors[2], stroke: white, "stroke-width": a * 0.012, "data-name": "Cross tile" }));
      const m = new Path();
      for (let k = 0; k < 4; k++) m.append(petal(a * 0.16, a * 0.07, "point").transform(matMul(translate(c[0], c[1]), rotateM((k / 4) * TAU + Math.PI / 4 * 0))));
      crosses.push(path(m, { fill: white, "data-name": "Cross motif" }));
    }
    const art = g("Lustre tiles", [rect(0, 0, W, W, { fill: line, "data-name": "Ground" }), g("Cross tiles", crosses), g("Star tiles", stars), g("Lustre painting", paint)], { "clip-path": `url(#${ctx.uid}-clip)` });
    const guides = new Path();
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) guides.append(Path.circle([i * a + a / 2, j * a + a / 2], a / 2));
    return { art, defs: [{ tag: "clipPath", attrs: { id: `${ctx.uid}-clip` }, children: [rect(0, 0, W, W)] }], guides: g("Star circles", [path(guides, { fill: "none", stroke: "#c0392b", "stroke-width": 0.3, "stroke-dasharray": "2 1.5" })]) };
  },
};
