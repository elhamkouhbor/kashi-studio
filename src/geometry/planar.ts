// Planar arrangements and clipping: turns a set of line segments into the closed regions between them
// (the pieces of a cut-tile mosaic), and clips polylines and polygons to a rectangle.
import { type Pt, polygonArea, segCross, dist } from "./vec";

const K = 1e6;
const keyOf = (p: Pt) => `${Math.round(p[0] * K)},${Math.round(p[1] * K)}`;

/** Split segments at all mutual crossings (grid accelerated). */
export function splitSegments(segs: [Pt, Pt][]): [Pt, Pt][] {
  const S = segs.filter((s) => dist(s[0], s[1]) > 1e-9);
  const cuts: number[][] = S.map(() => [0, 1]);
  let tot = 0;
  for (const s of S) tot += dist(s[0], s[1]);
  const G = Math.max(1e-6, (tot / Math.max(1, S.length)) * 1.5);
  const grid = new Map<string, number[]>();
  S.forEach((s, i) => {
    const gx0 = Math.floor(Math.min(s[0][0], s[1][0]) / G), gx1 = Math.floor(Math.max(s[0][0], s[1][0]) / G);
    const gy0 = Math.floor(Math.min(s[0][1], s[1][1]) / G), gy1 = Math.floor(Math.max(s[0][1], s[1][1]) / G);
    for (let x = gx0; x <= gx1; x++) for (let y = gy0; y <= gy1; y++) {
      const k = x + "," + y;
      (grid.get(k) ?? grid.set(k, []).get(k)!).push(i);
    }
  });
  const done = new Set<number>();
  for (const list of grid.values())
    for (let a = 0; a < list.length; a++)
      for (let b = a + 1; b < list.length; b++) {
        const i = list[a], j = list[b], id = i < j ? i * S.length + j : j * S.length + i;
        if (done.has(id)) continue;
        done.add(id);
        const c = segCross(S[i][0], S[i][1], S[j][0], S[j][1], 1e-9);
        if (!c) continue;
        if (c.t > 1e-7 && c.t < 1 - 1e-7) cuts[i].push(c.t);
        if (c.s > 1e-7 && c.s < 1 - 1e-7) cuts[j].push(c.s);
      }
  const out: [Pt, Pt][] = [];
  const seen = new Set<string>();
  S.forEach((s, i) => {
    const ts = [...new Set(cuts[i].map((t) => Math.round(t * 1e9) / 1e9))].sort((x, y) => x - y);
    for (let k = 1; k < ts.length; k++) {
      const p: Pt = [s[0][0] + (s[1][0] - s[0][0]) * ts[k - 1], s[0][1] + (s[1][1] - s[0][1]) * ts[k - 1]];
      const q: Pt = [s[0][0] + (s[1][0] - s[0][0]) * ts[k], s[0][1] + (s[1][1] - s[0][1]) * ts[k]];
      if (dist(p, q) < 1e-7) continue;
      const a = keyOf(p), b = keyOf(q), id = a < b ? a + "|" + b : b + "|" + a;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push([p, q]);
    }
  });
  return out;
}

/**
 * Bounded faces of the arrangement of segments (each face a simple polygon, counter-clockwise in a
 * y-up sense, i.e. positive signed area in SVG coordinates is clockwise on screen; orientation is
 * normalised to positive area). The outer face is dropped.
 */
export function faces(segs: [Pt, Pt][]): Pt[][] {
  const split = splitSegments(segs);
  const nodes = new Map<string, { p: Pt; out: { to: string; a: number }[] }>();
  const node = (p: Pt) => {
    const k = keyOf(p);
    if (!nodes.has(k)) nodes.set(k, { p, out: [] });
    return k;
  };
  for (const [p, q] of split) {
    const a = node(p), b = node(q);
    nodes.get(a)!.out.push({ to: b, a: Math.atan2(q[1] - p[1], q[0] - p[0]) });
    nodes.get(b)!.out.push({ to: a, a: Math.atan2(p[1] - q[1], p[0] - q[0]) });
  }
  for (const n of nodes.values()) n.out.sort((x, y) => x.a - y.a);
  const used = new Set<string>();
  const result: Pt[][] = [];
  for (const [ka, na] of nodes)
    for (const e of na.out) {
      const startId = ka + ">" + e.to;
      if (used.has(startId)) continue;
      const poly: Pt[] = [];
      let u = ka, v = e.to, guard = 0;
      while (guard++ < 10000) {
        const id = u + ">" + v;
        if (used.has(id)) break;
        used.add(id);
        poly.push(nodes.get(u)!.p);
        // at v, turn to the next edge clockwise from the way back (keeps the face on the left)
        const nv = nodes.get(v)!;
        const back = Math.atan2(nodes.get(u)!.p[1] - nv.p[1], nodes.get(u)!.p[0] - nv.p[0]);
        let idx = nv.out.findIndex((o) => o.to === u && Math.abs(o.a - back) < 1e-6);
        if (idx < 0) idx = nv.out.findIndex((o) => o.to === u);
        const next = nv.out[(idx - 1 + nv.out.length) % nv.out.length];
        u = v;
        v = next.to;
      }
      if (poly.length >= 3) result.push(poly);
    }
  // faces traced this way have one orientation, the outer boundary of each component the other
  const withArea = result.map((p) => ({ p, a: polygonArea(p) }));
  const sign = Math.sign(withArea.reduce((s, f) => s + Math.sign(f.a), 0)) || 1;
  return withArea.filter((f) => Math.sign(f.a) === sign && Math.abs(f.a) > 1e-9).map((f) => (f.a < 0 ? f.p.slice().reverse() : f.p));
}

/** Sutherland-Hodgman clip of a polygon to an axis aligned rectangle. */
export function clipPolygon(poly: Pt[], x0: number, y0: number, x1: number, y1: number): Pt[] {
  let out = poly;
  const edges: [(p: Pt) => boolean, (p: Pt, q: Pt) => Pt][] = [
    [(p) => p[0] >= x0, (p, q) => [x0, p[1] + ((q[1] - p[1]) * (x0 - p[0])) / (q[0] - p[0])]],
    [(p) => p[0] <= x1, (p, q) => [x1, p[1] + ((q[1] - p[1]) * (x1 - p[0])) / (q[0] - p[0])]],
    [(p) => p[1] >= y0, (p, q) => [p[0] + ((q[0] - p[0]) * (y0 - p[1])) / (q[1] - p[1]), y0]],
    [(p) => p[1] <= y1, (p, q) => [p[0] + ((q[0] - p[0]) * (y1 - p[1])) / (q[1] - p[1]), y1]],
  ];
  for (const [inside, inter] of edges) {
    const inp = out;
    out = [];
    for (let i = 0; i < inp.length; i++) {
      const p = inp[i], q = inp[(i + 1) % inp.length];
      const pi = inside(p), qi = inside(q);
      if (pi) out.push(p);
      if (pi !== qi) out.push(inter(p, q));
    }
    if (!out.length) break;
  }
  // drop repeated points
  return out.filter((p, i) => dist(p, out[(i + 1) % out.length]) > 1e-9);
}

/** Clip a polyline to a rectangle (Liang-Barsky per segment), returning the visible runs. */
export function clipPolyline(pts: Pt[], x0: number, y0: number, x1: number, y1: number): Pt[][] {
  const runs: Pt[][] = [];
  let cur: Pt[] = [];
  for (let i = 1; i < pts.length; i++) {
    const c = clipSeg(pts[i - 1], pts[i], x0, y0, x1, y1);
    if (!c) { if (cur.length > 1) runs.push(cur); cur = []; continue; }
    if (cur.length && dist(cur[cur.length - 1], c[0]) < 1e-9) cur.push(c[1]);
    else { if (cur.length > 1) runs.push(cur); cur = [c[0], c[1]]; }
    if (dist(c[1], pts[i]) > 1e-9) { runs.push(cur); cur = []; }
  }
  if (cur.length > 1) runs.push(cur);
  return runs.filter((r) => r.length > 1 && dist(r[0], r[r.length - 1]) + (r.length > 2 ? 1 : 0) > 1e-9);
}

export function clipSeg(p: Pt, q: Pt, x0: number, y0: number, x1: number, y1: number): [Pt, Pt] | null {
  let t0 = 0, t1 = 1;
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const P = [-dx, dx, -dy, dy], Q = [p[0] - x0, x1 - p[0], p[1] - y0, y1 - p[1]];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(P[i]) < 1e-15) { if (Q[i] < 0) return null; continue; }
    const r = Q[i] / P[i];
    if (P[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
    else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  if (t1 - t0 < 1e-12) return null;
  return [[p[0] + t0 * dx, p[1] + t0 * dy], [p[0] + t1 * dx, p[1] + t1 * dy]];
}
