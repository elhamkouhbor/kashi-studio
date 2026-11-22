// Qajar painted tile templates. Qajar tilework (1789 to 1925) is pictorial: roses, birds, vases and
// figures painted in pinks, yellows and greens. A geometric generator cannot produce this, so these are
// hand-constructed vector templates with a few parameters (composition, flower count, palette). They are
// original interpretations of recurring Qajar motifs (gol-o-bolbol, the rose and nightingale, and the
// flower vase), not copies of particular tiles. Human figures are not included.
import { Path, smoothThrough } from "../geometry/path";
import { type Pt, D2R, TAU, matMul, rotateM, translate, scaleM, polar, rng } from "../geometry/vec";
import { petal, leaf, eslimiLeaf } from "../ornament/floral";
import { lobed } from "./floral";
import { g, rect, path, type SvgNode } from "../ornament/node";
import { type Shape, xf, toNodes } from "../ornament/shapes";
import { bool, num, str, type Generator } from "./types";
import type { Palette } from "../color/palettes";

const col = (pal: Palette, i: number) => pal.colors[i % pal.colors.length];

/** A rose seen from three quarters: two rings of round petals and a curled centre. */
export function roseShapes(r: number, pal: Palette, petalFill: string, deep: string): Shape[] {
  const outer = new Path(), inner = new Path();
  for (let k = 0; k < 6; k++) outer.append(petal(r, r * 0.95, "round", 0.6).transform(rotateM((k / 6) * TAU)));
  for (let k = 0; k < 5; k++) inner.append(petal(r * 0.66, r * 0.72, "round", 0.6).transform(rotateM(((k + 0.5) / 5) * TAU)));
  const curl = smoothThrough([0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => polar(r * (0.32 - i * 0.034), i * 0.95)), false);
  return [
    { d: outer, fill: petalFill, stroke: pal.line, sw: r * 0.03, name: "Rose outer petals", layer: "Roses" },
    { d: inner, fill: deep, stroke: pal.line, sw: r * 0.03, name: "Rose inner petals", layer: "Roses" },
    { d: curl, stroke: pal.line, sw: r * 0.035, name: "Rose centre", layer: "Roses" },
  ];
}

/** A small songbird (bolbol) perched, facing right, centred on its body; s is the body length. */
export function birdShapes(s: number, pal: Palette): Shape[] {
  const body = smoothThrough([[-0.5 * s, 0.02 * s], [-0.18 * s, -0.22 * s], [0.25 * s, -0.24 * s], [0.48 * s, -0.08 * s], [0.4 * s, 0.14 * s], [0.05 * s, 0.24 * s], [-0.3 * s, 0.16 * s]], true);
  const breast = smoothThrough([[0.05 * s, 0.22 * s], [0.38 * s, 0.13 * s], [0.46 * s, -0.04 * s], [0.3 * s, 0.02 * s], [0.08 * s, 0.1 * s]], true);
  const head: Pt = [0.46 * s, -0.24 * s];
  const beak = Path.poly([[head[0] + 0.14 * s, head[1] - 0.02 * s], [head[0] + 0.32 * s, head[1] + 0.03 * s], [head[0] + 0.13 * s, head[1] + 0.07 * s]]);
  const wing = eslimiLeaf(0.62 * s, 0.3 * s, 0.25, -1, 2).transform(matMul(translate(0.22 * s, -0.08 * s), rotateM(-100 * D2R)));
  const tail = new Path();
  for (const a of [-12, 0, 12]) tail.append(petal(0.55 * s, 0.16 * s, "round", 0.6).transform(matMul(translate(-0.42 * s, 0.04 * s), rotateM((-115 + a) * D2R))));
  const legs = new Path().M([0.02 * s, 0.22 * s]).L([-0.02 * s, 0.38 * s]).M([0.14 * s, 0.2 * s]).L([0.12 * s, 0.38 * s]);
  return [
    { d: tail, fill: col(pal, 4), stroke: pal.line, sw: s * 0.012, name: "Tail", layer: "Bird" },
    { d: body, fill: col(pal, 4), stroke: pal.line, sw: s * 0.012, name: "Body", layer: "Bird" },
    { d: breast, fill: col(pal, 0), stroke: pal.line, sw: s * 0.01, name: "Breast", layer: "Bird" },
    { d: wing, fill: col(pal, 5), stroke: pal.line, sw: s * 0.012, name: "Wing", layer: "Bird" },
    { d: Path.circle(head, 0.17 * s), fill: col(pal, 4), stroke: pal.line, sw: s * 0.012, name: "Head", layer: "Bird" },
    { d: beak, fill: col(pal, 0), stroke: pal.line, sw: s * 0.01, name: "Beak", layer: "Bird" },
    { d: Path.circle([head[0] + 0.06 * s, head[1] - 0.03 * s], 0.035 * s), fill: pal.line, name: "Eye", layer: "Bird" },
    { d: legs, stroke: pal.line, sw: s * 0.02, name: "Legs", layer: "Bird" },
  ];
}

function leafPair(at: Pt, a: number, L: number, pal: Palette): Shape[] {
  const out: Shape[] = [];
  for (const s of [-1, 1]) {
    const lf = leaf(L, L * 0.42, { teeth: 4, bend: 0.1 * s });
    const m = matMul(translate(at[0], at[1]), rotateM(a + s * 50 * D2R));
    out.push({ d: lf.outline.transform(m), fill: col(pal, 3), stroke: pal.line, sw: L * 0.02, name: "Leaf", layer: "Leaves" });
    out.push({ d: lf.rib.transform(m), stroke: pal.line, sw: L * 0.02, name: "Leaf vein", layer: "Leaves" });
  }
  return out;
}

export const qajarGenerator: Generator = {
  id: "qajar",
  family: "qajar",
  name: "Qajar painted tile",
  nameFa: "کاشی نقاشی قاجاری",
  params: [
    { key: "scene", label: "Composition", type: "select", options: [{ value: "golobolbol", label: "Rose and nightingale (gol-o-bolbol)" }, { value: "vase", label: "Flower vase (goldan)" }, { value: "roses", label: "Rose spray" }, { value: "cartouche", label: "Cartouche with roses (dado tile)" }] },
    { key: "size", label: "Tile size", type: "range", min: 80, max: 600, step: 1, unit: "mm" },
    { key: "flowers", label: "Roses", type: "int", min: 1, max: 7 },
    { key: "mirror", label: "Mirror the composition", type: "bool" },
    { key: "frame", label: "Painted frame", type: "bool" },
    { key: "seed", label: "Variation", type: "int", min: 1, max: 99 },
  ],
  defaults: { scene: "golobolbol", size: 200, flowers: 3, mirror: false, frame: true, seed: 3 },
  size: (p) => ({ w: num(p, "size"), h: num(p, "size") * (str(p, "scene") === "vase" ? 1.25 : 1) }),
  build(p, ctx) {
    const S = num(p, "size"), H = S * (str(p, "scene") === "vase" ? 1.25 : 1), pal = ctx.palette, rand = rng(num(p, "seed"));
    const shapes: Shape[] = [];
    const scene = str(p, "scene"), nF = num(p, "flowers");
    const pink = col(pal, 1), deep = col(pal, 2);
    if (scene === "cartouche") {
      // a barbed quatrefoil cartouche framed by moulded scrolls at the corners, roses inside
      const c: Pt = [S / 2, H / 2];
      const outer = lobed(c, S * 0.4, H * 0.36, 4, 0.16), inner = lobed(c, S * 0.34, H * 0.3, 4, 0.16);
      shapes.push({ d: outer, fill: col(pal, 0), stroke: pal.line, sw: S * 0.006, name: "Cartouche frame", layer: "Cartouche" });
      shapes.push({ d: inner, fill: pal.colors[pal.colors.length - 3] ?? pal.ground, stroke: pal.line, sw: S * 0.004, name: "Cartouche field", layer: "Cartouche" });
      for (const [x, y, a] of [[0, 0, 45], [S, 0, 135], [S, H, 225], [0, H, 315]] as [number, number, number][]) {
        const m = matMul(translate(x, y), rotateM((a - 90) * D2R));
        shapes.push({ d: eslimiLeaf(S * 0.24, S * 0.12, 0.5, 1, 2).transform(matMul(m, rotateM(-20 * D2R))), fill: col(pal, 0), stroke: pal.line, sw: S * 0.004, name: "Corner scroll", layer: "Corner scrolls" });
        shapes.push({ d: eslimiLeaf(S * 0.24, S * 0.12, 0.5, -1, 2).transform(matMul(m, rotateM(20 * D2R))), fill: col(pal, 0), stroke: pal.line, sw: S * 0.004, name: "Corner scroll", layer: "Corner scrolls" });
      }
      for (let i = 0; i < Math.min(nF, 3); i++) shapes.push(...xf(roseShapes(S * (i === 1 ? 0.075 : 0.06), pal, i === 1 ? deep : pink, i === 1 ? pink : deep), translate(S * (0.38 + 0.12 * i), H * (0.52 - (i === 1 ? 0.06 : 0)))));
      shapes.push(...leafPair([S * 0.5, H * 0.6], 0, S * 0.08, pal));
    } else if (scene === "vase") {
      // vase: a symmetric profile mirrored about the centre line
      const cx = S / 2, top = H * 0.6, bottom = H * 0.92;
      const half: Pt[] = [[cx, bottom], [cx + S * 0.1, bottom], [cx + S * 0.08, bottom - H * 0.04], [cx + S * 0.2, bottom - H * 0.16], [cx + S * 0.16, top + H * 0.06], [cx + S * 0.08, top + H * 0.02], [cx + S * 0.12, top]];
      const right = smoothThrough(half, false);
      const left = right.transform([-1, 0, 0, 1, 2 * cx, 0]).reversed();
      const vase = new Path(); vase.segs = [...right.segs, { k: "L", p: [cx - S * 0.12, top] }, ...left.segs.slice(1)]; vase.Z();
      // stems fanning out of the vase mouth
      const ends: Pt[] = [];
      for (let i = 0; i < nF; i++) {
        const t = nF === 1 ? 0.5 : i / (nF - 1);
        const a = (-60 + 120 * t) * D2R;
        const L = H * (0.4 + 0.12 * Math.cos((t - 0.5) * Math.PI));
        const end: Pt = [cx + Math.sin(a) * L * 0.7, top - Math.cos(a) * L];
        ends.push(end);
        shapes.push({ d: smoothThrough([[cx, top], [cx + Math.sin(a) * L * 0.25, top - L * 0.4], end], false), stroke: col(pal, 3), sw: S * 0.008, name: "Stem", layer: "Stems" });
        shapes.push(...leafPair([cx + Math.sin(a) * L * 0.4, top - Math.cos(a) * L * 0.55], a, S * 0.1, pal));
      }
      ends.forEach((e, i) => shapes.push(...xf(roseShapes(S * (i % 2 ? 0.08 : 0.1), pal, i % 2 ? deep : pink, i % 2 ? pink : deep), translate(e[0], e[1]))));
      shapes.push({ d: vase, fill: col(pal, 4), stroke: pal.line, sw: S * 0.008, name: "Vase", layer: "Vase" });
      shapes.push({ d: new Path().M([cx - S * 0.17, bottom - H * 0.12]).C([cx - S * 0.05, bottom - H * 0.08], [cx + S * 0.05, bottom - H * 0.08], [cx + S * 0.17, bottom - H * 0.12]), stroke: col(pal, 0), sw: S * 0.012, name: "Vase band", layer: "Vase" });
    } else {
      // a branch rising from the lower left, with roses along it
      const branch: Pt[] = [[S * 0.08, H * 0.95], [S * 0.3, H * 0.72], [S * 0.42, H * 0.56], [S * 0.62, H * 0.45], [S * 0.84, H * 0.22]];
      shapes.push({ d: smoothThrough(branch, false), stroke: col(pal, 3), sw: S * 0.014, name: "Branch", layer: "Branch" });
      const twig = smoothThrough([[S * 0.42, H * 0.56], [S * 0.3, H * 0.38], [S * 0.24, H * 0.2]], false);
      shapes.push({ d: twig, stroke: col(pal, 3), sw: S * 0.009, name: "Twig", layer: "Branch" });
      const spots: Pt[] = [[S * 0.84, H * 0.22], [S * 0.24, H * 0.2], [S * 0.28, H * 0.74], [S * 0.66, H * 0.62], [S * 0.12, H * 0.5], [S * 0.86, H * 0.5], [S * 0.5, H * 0.18]];
      for (let i = 0; i < 6; i++) shapes.push(...leafPair([S * (0.2 + 0.11 * i), H * (0.82 - 0.11 * i)], (-35 + rand() * 30) * D2R, S * (0.08 + rand() * 0.03), pal));
      for (let i = 0; i < Math.min(nF, spots.length); i++) shapes.push(...xf(roseShapes(S * (0.085 + rand() * 0.03), pal, i % 2 ? deep : pink, i % 2 ? pink : deep), translate(spots[i][0], spots[i][1])));
      if (scene === "golobolbol") shapes.push(...xf(birdShapes(S * 0.26, pal), matMul(translate(S * 0.56, H * 0.39), rotateM(-8 * D2R))));
    }
    let all = shapes;
    if (bool(p, "mirror")) all = xf(shapes, [-1, 0, 0, 1, S, 0]);
    const parts: SvgNode[] = [rect(0, 0, S, H, { fill: pal.ground, "data-name": "Ground" }), g("Painting", toNodes(all))];
    if (bool(p, "frame")) {
      const f = new Path().append(Path.poly([[S * 0.03, H * 0.03], [S * 0.97, H * 0.03], [S * 0.97, H * 0.97], [S * 0.03, H * 0.97]]));
      parts.push(path(f, { fill: "none", stroke: col(pal, 0), "stroke-width": S * 0.012, "data-name": "Frame" }));
      parts.push(path(new Path().append(Path.poly([[S * 0.05, H * 0.05], [S * 0.95, H * 0.05], [S * 0.95, H * 0.95], [S * 0.05, H * 0.95]])), { fill: "none", stroke: col(pal, 4), "stroke-width": S * 0.004, "data-name": "Inner frame" }));
    }
    void scaleM;
    return { art: g("Qajar tile", parts) };
  },
};
