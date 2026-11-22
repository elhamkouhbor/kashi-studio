// Floral motif primitives: petals, leaves, eslimi (arabesque) leaves, buds, khatai rosettes and palmettes,
// spiral vines. Every motif is built in a local frame with its base at (0, 0), growing upwards (−y), and
// returns a few smooth cubic Bézier outlines so the result stays light and easy to edit.
import { Path, smoothThrough, sampleAt, polylineLength } from "../geometry/path";
import { type Pt, type Mat, D2R, TAU, matMul, rotateM, scaleM, translate, reflectM, polar } from "../geometry/vec";
import { g, path, circle, type SvgNode, type Attrs } from "./node";

/** Join a smooth right half (base → tip) with its mirror image, keeping sharp corners at base and tip. */
function mirrored(right: Pt[], sharpTip = true): Path {
  const half = smoothThrough(right, false, 1);
  const left = half.transform([-1, 0, 0, 1, 0, 0]).reversed();
  const p = new Path();
  p.segs = [...half.segs];
  if (!sharpTip) {
    // a round tip: replace the corner with a short curve
  }
  p.segs.push(...left.segs.slice(1));
  p.Z();
  return p;
}

/** Join two open smooth runs into one closed outline with corners where they meet. */
function joined(a: Pt[], b: Pt[]): Path {
  const pa = smoothThrough(a, false, 1), pb = smoothThrough(b, false, 1);
  const p = new Path();
  p.segs = [...pa.segs, ...pb.segs.slice(1)];
  p.Z();
  return p;
}

export type Tip = "point" | "round" | "cleft";

/** A symmetric petal of length L and width W. shoulder: where it is widest (0 base, 1 tip). */
export function petal(L: number, W: number, tip: Tip = "point", shoulder = 0.45): Path {
  const w = W / 2, s = Math.min(0.8, Math.max(0.2, shoulder));
  if (tip === "cleft") {
    const right: Pt[] = [[0, 0], [w * 0.55, -L * s * 0.45], [w, -L * s], [w * 0.92, -L * 0.78], [w * 0.55, -L], [w * 0.22, -L * 0.93], [0, -L * 0.86]];
    return mirrored(right);
  }
  if (tip === "round") {
    const right: Pt[] = [[0, 0], [w * 0.55, -L * s * 0.45], [w, -L * s], [w * 0.85, -L * 0.82], [w * 0.42, -L * 0.98], [0, -L]];
    return mirrored(right);
  }
  const right: Pt[] = [[0, 0], [w * 0.55, -L * s * 0.45], [w, -L * s], [w * 0.66, -L * 0.8], [0, -L]];
  return mirrored(right);
}

/** A leaf: lanceolate outline (optionally toothed and bent) plus its midrib. */
export function leaf(L: number, W: number, opts: { bend?: number; teeth?: number; tip?: Tip } = {}): { outline: Path; rib: Path } {
  const bend = opts.bend ?? 0, teeth = opts.teeth ?? 0, w = W / 2;
  const bendPt = (p: Pt): Pt => { const t = -p[1] / L; return [p[0] + bend * L * t * t, p[1]]; };
  const prof = (t: number) => Math.sin(Math.PI * Math.pow(t, 0.8)) * (1 - 0.15 * t);
  const N = Math.max(6, teeth * 2 + 2);
  const right: Pt[] = [], leftSide: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    let ww = w * prof(t);
    if (teeth && i > 0 && i < N) ww *= i % 2 ? 1.12 : 0.9;
    right.push(bendPt([ww, -L * t]));
    leftSide.push(bendPt([-ww, -L * t]));
  }
  right[0] = [0, 0]; leftSide[0] = [0, 0];
  const outline = joined(right, leftSide.reverse());
  const rib = smoothThrough([0, 0.15, 0.4, 0.65, 0.88].map((t) => bendPt([0, -L * t])), false);
  return { outline, rib };
}

/**
 * Eslimi leaf (barg-e eslimi): the asymmetric half palmette of Persian arabesque, swelling on one side
 * and ending in a hooked tip that turns back towards the stem. dir 1 hooks to the left, −1 to the right.
 */
export function eslimiLeaf(L: number, W: number, hook = 0.35, dir: 1 | -1 = 1, lobes = 0): Path {
  // a curved spine that turns back at the tip, a full belly on one side and a thin inner edge
  const N = 14;
  const spine = (t: number): Pt => [-hook * W * 1.3 * Math.pow(Math.sin((t * Math.PI) / 2), 3), -L * t * (1 - hook * 0.12 * t * t)];
  const outer: Pt[] = [], inner: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = spine(t), q = spine(Math.min(1, t + 1e-3)), o = spine(Math.max(0, t - 1e-3));
    let tx = q[0] - o[0], ty = q[1] - o[1];
    const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const nx = -ty, ny = tx; // points to the belly side (right of the upward spine)
    let wr = W * 0.62 * Math.sin(Math.PI * Math.pow(t, 0.62)) * Math.pow(1 - t, 0.25);
    if (lobes > 0) wr *= 0.84 + 0.16 * Math.abs(Math.cos(lobes * Math.PI * Math.min(1, t * 1.25)));
    const wl = W * 0.1 * Math.sin(Math.PI * t) * (1 - t);
    outer.push([p[0] + nx * wr, p[1] + ny * wr]);
    inner.push([p[0] - nx * wl, p[1] - ny * wl]);
  }
  outer[0] = [0, 0]; inner[0] = [0, 0];
  const p = joined(outer, inner.reverse());
  return dir === 1 ? p : p.transform([-1, 0, 0, 1, 0, 0]);
}

/** Split palmette (eslimi-ye dahan-ejdari): two eslimi leaves facing each other with a small bud between. */
export function splitPalmette(L: number, W: number, hook = 0.45): Path[] {
  return [eslimiLeaf(L, W, hook, -1).transform(rotateM(-12 * D2R)), eslimiLeaf(L, W, hook, 1).transform(rotateM(12 * D2R)), petal(L * 0.55, W * 0.45, "point")];
}

/** A bud (ghoncheh): closed teardrop with two sepals. */
export function bud(L: number, W: number): { body: Path; sepals: Path[] } {
  const body = petal(L, W, "point", 0.38).transform(translate(0, -L * 0.12));
  const sepal = eslimiLeaf(L * 0.5, W * 0.45, 0.5, 1);
  return { body, sepals: [sepal.transform(rotateM(-28 * D2R)), sepal.transform(matMul(reflectM(Math.PI / 2), rotateM(-28 * D2R)))] };
}

export interface RosetteLayer { n: number; len: number; width: number; tip: Tip; offset?: number; fill: string }
/** A khatai rosette seen from above (gol): layered rings of petals, a centre disc and a ring of dots. */
export function rosette(r: number, layers: RosetteLayer[], centre: { fill: string; dots?: string; dotCount?: number }, stroke: Attrs = {}): SvgNode {
  const rings = layers.map((ly, li) => {
    const nodes: SvgNode[] = [];
    const base = petal(ly.len * r, ly.width * r, ly.tip, 0.5);
    const d = new Path();
    for (let k = 0; k < ly.n; k++) d.append(base.transform(rotateM(((k + (ly.offset ?? 0)) / ly.n) * TAU)));
    nodes.push(path(d, { fill: ly.fill, ...stroke }));
    return g(`Petal ring ${li + 1}`, nodes);
  });
  const parts: SvgNode[] = [...rings, circle([0, 0], r * 0.2, { fill: centre.fill, ...stroke })];
  if (centre.dots) {
    const dots = new Path();
    const n = centre.dotCount ?? 10;
    for (let k = 0; k < n; k++) dots.append(Path.circle(polar(r * 0.13, (k / n) * TAU), r * 0.028));
    parts.push(path(dots, { fill: centre.dots }));
  }
  return g("Rosette", parts);
}

export interface PalmetteOpts {
  petals: number; // pairs of side petals (1 to 4)
  spread: number; // degrees between petals
  fill: string;
  inner: string;
  calyx: string;
  tip?: Tip;
}
/** A khatai palmette seen from the side (the "shah-abbasi" type): a fan of petals on a calyx. */
export function palmette(L: number, o: PalmetteOpts, stroke: Attrs = {}): SvgNode {
  const outer = new Path(), inner = new Path();
  const centre = petal(L, L * 0.42, o.tip ?? "point", 0.5).transform(translate(0, -L * 0.12));
  outer.append(centre);
  inner.append(petal(L * 0.6, L * 0.2, "point", 0.5).transform(translate(0, -L * 0.2)));
  for (let i = 1; i <= o.petals; i++) {
    const a = (o.spread * i) * D2R, l = L * (1 - 0.13 * i), w = L * (0.36 - 0.03 * i);
    const p = eslimiLeaf(l, w, 0.32, 1).transform(translate(0, -L * 0.1));
    outer.append(p.transform(rotateM(a)));
    outer.append(p.transform(matMul(reflectM(-Math.PI / 2), rotateM(a))));
    const ip = petal(l * 0.5, w * 0.35, "point").transform(translate(0, -L * 0.16));
    inner.append(ip.transform(rotateM(a * 0.95)));
    inner.append(ip.transform(rotateM(-a * 0.95)));
  }
  const cup = new Path().M([-L * 0.26, -L * 0.1]).C([-L * 0.26, L * 0.12], [L * 0.26, L * 0.12], [L * 0.26, -L * 0.1]).C([L * 0.12, -L * 0.02], [-L * 0.12, -L * 0.02], [-L * 0.26, -L * 0.1]).Z();
  return g("Palmette", [path(outer, { fill: o.fill, ...stroke }), path(inner, { fill: o.inner, ...stroke }), path(cup, { fill: o.calyx, ...stroke })]);
}

/** Points of an Archimedean spiral from radius r0 to r1 (dir 1 clockwise on screen). */
export function spiralPoints(c: Pt, r0: number, r1: number, a0: number, turns: number, dir: 1 | -1 = 1, perTurn = 14): Pt[] {
  const n = Math.max(4, Math.round(turns * perTurn));
  return Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return polar(r0 + (r1 - r0) * t, a0 + dir * turns * TAU * t, c); });
}

/** Place a motif along a polyline at a regular spacing, aligned with the tangent. */
export function along(pts: Pt[], spacing: number, place: (m: Mat, i: number, t: number) => void, opts: { start?: number; end?: number; alternate?: boolean } = {}) {
  const L = polylineLength(pts);
  const s0 = opts.start ?? spacing / 2, s1 = L - (opts.end ?? spacing / 2);
  let i = 0;
  for (let s = s0; s <= s1 + 1e-9; s += spacing, i++) {
    const { p, t } = sampleAt(pts, s);
    let m: Mat = [t[0], t[1], -t[1], t[0], p[0], p[1]]; // x axis along the path
    m = matMul(m, rotateM(-Math.PI / 2)); // motif grows along −y, so turn it to the path normal
    if (opts.alternate && i % 2) m = matMul(m, scaleM(-1, 1));
    place(m, i, s / L);
  }
}

export const stemPath = (pts: Pt[]) => smoothThrough(pts, false, 1);
