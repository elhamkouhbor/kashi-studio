// Hankin's "polygons in contact" construction, strand joining and over/under weaving.
//
// Ported to TypeScript from islamic-patterns by Olivier Giulieri (https://github.com/evoluteur/islamic-patterns,
// js/girih.js, MIT licence, © 2026 Olivier Giulieri). Changes for Kashi Studio: a separate contact angle per
// polygon size (as in classical rosette constructions), a general solver for irregular and non-convex tiles
// (the girih tiles), and tiles carry a kind so pieces can be coloured by their origin.
//
// The method (E. H. Hankin 1925, formalised by Craig S. Kaplan 2005): take a tiling, send two rays from the
// midpoint of every edge into each tile at the contact angle, and stop each ray where it meets its partner.
// The rays of neighbouring tiles meet at the shared midpoints, so the lines run on across the whole tiling.
import { type Pt, D2R, cross, dist, lineMeet, sub } from "../vec";

export interface Tile {
  /** Number of sides. */
  n: number;
  /** Centre (used for orientation tests and colouring). */
  c: Pt;
  /** Vertices in order. */
  v: Pt[];
  /** "regular" polygons use the bisector meeting rule. Girih tiles use the general solver. */
  kind: string;
}

export interface Lattice {
  name: string;
  a: Pt;
  b: Pt;
  /** Polygons of one cell: centre x, centre y, sides, angle of the first vertex in degrees. Edges of 1. */
  polys: [number, number, number, number][];
}

const S3 = Math.sqrt(3);
const IN12 = (2 + S3) / 2; // inradius of a dodecagon with edges of 1
const W8 = 1 + Math.SQRT2; // width of an octagon with edges of 1

function snubTriangles(s: number, r: number): [number, number, number, number][] {
  const sq = (cx: number, cy: number, a0: number): Pt[] => [0, 1, 2, 3].map((k) => [cx + r * Math.cos((a0 + 90 * k) * D2R), cy + r * Math.sin((a0 + 90 * k) * D2R)]);
  const verts: Pt[] = [];
  for (const [cx, cy, a0] of [[0, 0, 60], [s / 2, s / 2, 30]] as const)
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) verts.push(...sq(cx + i * s, cy + j * s, a0));
  const tris: [number, number, number, number][] = [];
  const unit = (p: Pt, q: Pt) => Math.abs(dist(p, q) - 1) < 1e-6;
  for (let i = 0; i < verts.length; i++)
    for (let j = i + 1; j < verts.length; j++) {
      if (!unit(verts[i], verts[j])) continue;
      for (let k = j + 1; k < verts.length; k++) {
        if (!unit(verts[i], verts[k]) || !unit(verts[j], verts[k])) continue;
        const c: Pt = [(verts[i][0] + verts[j][0] + verts[k][0]) / 3, (verts[i][1] + verts[j][1] + verts[k][1]) / 3];
        if (c[0] < -1e-6 || c[1] < -1e-6 || c[0] >= s - 1e-6 || c[1] >= s - 1e-6) continue;
        let inSquare = false;
        for (const [qx, qy] of [[0, 0], [s / 2, s / 2]])
          for (let i2 = -1; i2 <= 2; i2++) for (let j2 = -1; j2 <= 2; j2++) if (Math.hypot(c[0] - qx - i2 * s, c[1] - qy - j2 * s) < 0.6) inSquare = true;
        if (inSquare || tris.some((t) => Math.hypot(t[0] - c[0], t[1] - c[1]) < 1e-6)) continue;
        tris.push([c[0], c[1], 3, Math.atan2(verts[i][1] - c[1], verts[i][0] - c[0]) / D2R]);
      }
    }
  return tris;
}

export const LATTICES: Record<string, Lattice> = {
  "4.8.8": { name: "Octagons and squares", a: [W8, 0], b: [0, W8], polys: [[0, 0, 8, 22.5], [W8 / 2, W8 / 2, 4, 0]] },
  "4.6.12": (() => {
    const d = 2 * IN12 + 1, q = IN12 + 0.5;
    return {
      name: "Dodecagons, hexagons and squares", a: [d, 0] as Pt, b: [d / 2, (d * S3) / 2] as Pt,
      polys: [[0, 0, 12, 15], [q, 0, 4, 45], [q * Math.cos(60 * D2R), q * Math.sin(60 * D2R), 4, 105], [q * Math.cos(120 * D2R), q * Math.sin(120 * D2R), 4, 165], [d / 2, d / (2 * S3), 6, 0], [d / 2, -d / (2 * S3), 6, 0]] as [number, number, number, number][],
    };
  })(),
  "3.12.12": { name: "Dodecagons and triangles", a: [2 * IN12, 0], b: [IN12, S3 * IN12], polys: [[0, 0, 12, 15], [IN12, IN12 / S3, 3, 30], [IN12, -IN12 / S3, 3, -30]] },
  "6.6.6": { name: "Hexagons", a: [S3, 0], b: [S3 / 2, 1.5], polys: [[0, 0, 6, 30]] },
  "3.4.6.4": (() => {
    const d = S3 + 1, q = S3 / 2 + 0.5;
    return {
      name: "Hexagons, squares and triangles", a: [d, 0] as Pt, b: [d / 2, (d * S3) / 2] as Pt,
      polys: [[0, 0, 6, 30], [q, 0, 4, 45], [q * Math.cos(60 * D2R), q * Math.sin(60 * D2R), 4, 105], [q * Math.cos(120 * D2R), q * Math.sin(120 * D2R), 4, 165], [d / 2, d / (2 * S3), 3, 90], [d / 2, -d / (2 * S3), 3, 30]] as [number, number, number, number][],
    };
  })(),
  "3.6.3.6": { name: "Hexagons and triangles", a: [2, 0], b: [1, S3], polys: [[0, 0, 6, 0], [1, 1 / S3, 3, 270], [0, 2 / S3, 3, 90]] },
  "4.4.4.4": { name: "Squares", a: [1, 0], b: [0, 1], polys: [[0, 0, 4, 45]] },
  "3.3.4.3.4": (() => {
    const s = Math.sqrt(2 + S3), r = 1 / Math.SQRT2;
    return { name: "Snub squares", a: [s, 0] as Pt, b: [0, s] as Pt, polys: [[0, 0, 4, 60], [s / 2, s / 2, 4, 30], ...snubTriangles(s, r)] as [number, number, number, number][] };
  })(),
  "3.3.3.4.4": { name: "Squares and triangles in rows", a: [1, 0], b: [0.5, 1 + S3 / 2], polys: [[0.5, 0.5, 4, 45], [0.5, 1 + S3 / 6, 3, 90], [1, 1 + S3 / 3, 3, 270]] },
  "3.3.3.3.3.3": { name: "Triangles", a: [1, 0], b: [0.5, S3 / 2], polys: [[0.5, S3 / 6, 3, 90], [1, S3 / 3, 3, 270]] },
};

/** Rectangular period of a lattice: the smallest axis-aligned rectangle that repeats exactly. */
export function rectPeriod(L: { a: Pt; b: Pt }): { w: number; h: number } {
  const [ax, ay] = L.a, [bx, by] = L.b;
  if (Math.abs(ay) > 1e-9) throw new Error("lattice vector a must be horizontal");
  const w = ax;
  // smallest k with k·b horizontally aligned to a multiple of a
  for (let k = 1; k <= 12; k++) {
    const x = (k * bx) / ax;
    if (Math.abs(x - Math.round(x)) < 1e-9) return { w, h: k * by };
  }
  throw new Error("no rectangular period");
}

/** All polygons of a lattice tiling that touch the rectangle, in edge units. */
export function tilesIn(L: Lattice, x0: number, y0: number, x1: number, y1: number): Tile[] {
  const [ax, ay] = L.a, [bx, by] = L.b;
  const det = ax * by - ay * bx;
  const cell = (x: number, y: number) => [(x * by - y * bx) / det, (ax * y - ay * x) / det];
  const cs = [cell(x0, y0), cell(x1, y0), cell(x0, y1), cell(x1, y1)];
  const i0 = Math.floor(Math.min(...cs.map((c) => c[0]))) - 2, i1 = Math.ceil(Math.max(...cs.map((c) => c[0]))) + 2;
  const j0 = Math.floor(Math.min(...cs.map((c) => c[1]))) - 2, j1 = Math.ceil(Math.max(...cs.map((c) => c[1]))) + 2;
  const out: Tile[] = [];
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++)
      for (const [cx0, cy0, n, a0] of L.polys) {
        const cx = cx0 + i * ax + j * bx, cy = cy0 + i * ay + j * by;
        const R = 1 / (2 * Math.sin(Math.PI / n));
        if (cx + R < x0 || cx - R > x1 || cy + R < y0 || cy - R > y1) continue;
        const v: Pt[] = [];
        for (let k = 0; k < n; k++) { const a = (a0 + (360 * k) / n) * D2R; v.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
        out.push({ n, c: [cx, cy], v, kind: `regular-${n}` });
      }
  return out;
}

export type Segment = [Pt, Pt];
interface Ray { p: Pt; d: Pt; edge: number; side: 0 | 1 }

function edgeRays(tile: Tile, angleDeg: number, gap: number): { rays: Ray[]; cross: Pt[] } {
  const { v, n } = tile;
  const th = angleDeg * D2R, ct = Math.cos(th), st = Math.sin(th);
  // orientation: inward normal is to the left for counter-clockwise polygons
  let area = 0;
  for (let k = 0; k < n; k++) area += cross(v[k], v[(k + 1) % n]);
  const ccw = area > 0;
  const rays: Ray[] = [], crossPts: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const a = v[k], b = v[(k + 1) % n];
    const L = dist(a, b);
    const e: Pt = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
    const nr: Pt = ccw ? [-e[1], e[0]] : [e[1], -e[0]];
    const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const h = (gap * L) / 2;
    const toB: Ray = { p: [m[0] - e[0] * h, m[1] - e[1] * h], d: [e[0] * ct + nr[0] * st, e[1] * ct + nr[1] * st], edge: k, side: 1 };
    const toA: Ray = { p: [m[0] + e[0] * h, m[1] + e[1] * h], d: [-e[0] * ct + nr[0] * st, -e[1] * ct + nr[1] * st], edge: k, side: 0 };
    rays.push(toA, toB);
    crossPts.push(h > 0 ? lineMeet(toB.p, toB.d, toA.p, toA.d) ?? m : m);
  }
  return { rays, cross: crossPts };
}

/**
 * The motif of one tile. Regular polygons: each ray meets the ray of the next edge on the corner bisector
 * (exact and never parallel). Other tiles: rays are paired greedily by the shortest combined length
 * (Kaplan's rule), which reproduces the classical girih tile decorations at 54°.
 */
export function motif(tile: Tile, angleDeg: number, gap = 0): { segs: Segment[]; star: Pt[] } {
  const { v, c, n } = tile;
  const { rays, cross: xs } = edgeRays(tile, angleDeg, gap);
  const segs: Segment[] = [];
  if (tile.kind.startsWith("regular")) {
    const star: Pt[] = [];
    for (let k = 0; k < n; k++) {
      const r1 = rays[2 * k + 1], r2 = rays[2 * ((k + 1) % n)];
      const w = v[(k + 1) % n];
      const P = lineMeet(r1.p, r1.d, w, sub(c, w)) ?? c;
      segs.push([r1.p, P], [P, r2.p]);
      star.push(xs[k], P);
    }
    return { segs, star };
  }
  // general solver
  const cands: { i: number; j: number; P: Pt; cost: number }[] = [];
  for (let i = 0; i < rays.length; i++)
    for (let j = i + 1; j < rays.length; j++) {
      if (rays[i].edge === rays[j].edge) continue;
      const P = rayMeet(rays[i], rays[j]);
      if (!P || !insideOrOn(P, v)) continue;
      cands.push({ i, j, P, cost: dist(rays[i].p, P) + dist(rays[j].p, P) });
    }
  // equal costs (symmetric pairs) must be broken the same way in every copy of the tile, so compare
  // rounded costs and then the (translation invariant) ray indices, never floating-point noise
  cands.sort((a, b) => Math.round(a.cost * 1e7) - Math.round(b.cost * 1e7) || a.i - b.i || a.j - b.j);
  const used = new Set<number>();
  for (const cd of cands) {
    if (used.has(cd.i) || used.has(cd.j)) continue;
    used.add(cd.i); used.add(cd.j);
    segs.push([rays[cd.i].p, cd.P], [cd.P, rays[cd.j].p]);
  }
  return { segs, star: xs };
}

function rayMeet(r: Ray, s: Ray): Pt | null {
  const d = cross(r.d, s.d);
  if (Math.abs(d) < 1e-12) return null;
  const w = sub(s.p, r.p);
  const t = cross(w, s.d) / d, u = cross(w, r.d) / d;
  if (t <= 1e-9 || u <= 1e-9) return null;
  return [r.p[0] + t * r.d[0], r.p[1] + t * r.d[1]];
}

function insideOrOn(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    // on the edge counts as inside
    const ex = xj - xi, ey = yj - yi, L = Math.hypot(ex, ey);
    if (L > 0) {
      const t = ((p[0] - xi) * ex + (p[1] - yi) * ey) / (L * L);
      if (t >= -1e-9 && t <= 1 + 1e-9 && Math.abs((p[0] - xi) * ey - (p[1] - yi) * ex) / L < 1e-7) return true;
    }
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---------------------------------------------------------------- strands and weaving

export interface Strand { pts: Pt[]; closed: boolean; segIdx: number[]; length: number; cum?: number[] }
export interface Crossing { p: Pt; sin: number; u: { st: number; s: number }; v: { st: number; s: number }; over?: "u" | "v"; overStrand?: { st: number; s: number } }

const KEY = 1e5;
const key = (p: Pt) => Math.round(p[0] * KEY) + "," + Math.round(p[1] * KEY);

/** Join segments into strands (polylines) and weave every crossing over/under alternately. */
export function weave(segs: Segment[], period?: { w: number; h: number }): { strands: Strand[]; crossings: Crossing[]; periodic: boolean } {
  const seen = new Set<string>();
  const S: { a: Pt; b: Pt; ka: string; kb: string }[] = [];
  for (const s of segs) {
    if (dist(s[0], s[1]) < 1e-9) continue;
    const k1 = key(s[0]), k2 = key(s[1]);
    const id = k1 < k2 ? k1 + "|" + k2 : k2 + "|" + k1;
    if (seen.has(id)) continue;
    seen.add(id);
    S.push({ a: s[0], b: s[1], ka: k1, kb: k2 });
  }
  const nodes = new Map<string, { i: number; end: 0 | 1 }[]>();
  S.forEach((s, i) => {
    for (const end of [0, 1] as const) {
      const k = end ? s.kb : s.ka;
      if (!nodes.has(k)) nodes.set(k, []);
      nodes.get(k)!.push({ i, end });
    }
  });
  const link = new Map<string, { i: number; end: 0 | 1 }>();
  const nodeX: [number, number, Pt][] = [];
  const dir = (s: (typeof S)[number], end: number): Pt => {
    const [p, q] = end ? [s.b, s.a] : [s.a, s.b];
    const L = dist(p, q);
    return [(q[0] - p[0]) / L, (q[1] - p[1]) / L];
  };
  for (const ends of nodes.values()) {
    if (ends.length === 2) {
      link.set(ends[0].i + ":" + ends[0].end, ends[1]);
      link.set(ends[1].i + ":" + ends[1].end, ends[0]);
    } else if (ends.length === 4) {
      const d = ends.map((x) => dir(S[x.i], x.end));
      let best = 1, bd = 2;
      for (let j = 1; j < 4; j++) { const dd = d[0][0] * d[j][0] + d[0][1] * d[j][1]; if (dd < bd) { bd = dd; best = j; } }
      const rest = [1, 2, 3].filter((j) => j !== best);
      for (const [x, y] of [[0, best], [rest[0], rest[1]]]) {
        link.set(ends[x].i + ":" + ends[x].end, ends[y]);
        link.set(ends[y].i + ":" + ends[y].end, ends[x]);
      }
      const e = ends[0];
      nodeX.push([ends[0].i, ends[rest[0]].i, e.end ? S[e.i].b : S[e.i].a]);
    }
  }
  const strandOf = new Array<number>(S.length).fill(-1);
  const strands: Strand[] = [];
  for (let i0 = 0; i0 < S.length; i0++) {
    if (strandOf[i0] >= 0) continue;
    const id = strands.length;
    let i = i0, end: 0 | 1 = 0;
    for (let guard = 0; guard < S.length; guard++) {
      const nx = link.get(i + ":" + end);
      if (!nx || nx.i === i0) break;
      i = nx.i;
      end = (1 - nx.end) as 0 | 1;
    }
    const pts: Pt[] = [end ? S[i].b : S[i].a];
    const segIdx: number[] = [];
    let closed = false;
    for (let guard = 0; guard <= S.length; guard++) {
      strandOf[i] = id;
      segIdx.push(i);
      pts.push(end ? S[i].a : S[i].b);
      const nx = link.get(i + ":" + (1 - end));
      if (!nx) break;
      if (strandOf[nx.i] === id) { closed = true; break; }
      i = nx.i;
      end = nx.end;
    }
    strands.push({ pts, segIdx, closed, length: 0 });
  }
  const at = new Array<{ s0: number; p: Pt; q: Pt }>(S.length);
  for (const st of strands) {
    let s = 0;
    st.segIdx.forEach((i, j) => {
      const p = st.pts[j], q = st.pts[j + 1];
      at[i] = { s0: s, p, q };
      s += dist(p, q);
    });
    st.length = s;
  }
  const where = (i: number, pt: Pt) => at[i].s0 + dist(pt, at[i].p);
  const sinBetween = (s: (typeof S)[number], t: (typeof S)[number]) => {
    const r: Pt = [s.b[0] - s.a[0], s.b[1] - s.a[1]], q: Pt = [t.b[0] - t.a[0], t.b[1] - t.a[1]];
    return Math.abs(cross(r, q)) / (Math.hypot(r[0], r[1]) * Math.hypot(q[0], q[1]));
  };
  const crossings: Crossing[] = nodeX.map(([i, j, p]) => ({ p, sin: sinBetween(S[i], S[j]), u: { st: strandOf[i], s: where(i, p) }, v: { st: strandOf[j], s: where(j, p) } }));
  let tot = 0;
  for (const sg of S) tot += dist(sg.a, sg.b);
  const G = Math.max(1e-6, (tot / Math.max(1, S.length)) * 1.5), grid = new Map<string, number[]>();
  S.forEach((s, i) => {
    const gx0 = Math.floor(Math.min(s.a[0], s.b[0]) / G), gx1 = Math.floor(Math.max(s.a[0], s.b[0]) / G);
    const gy0 = Math.floor(Math.min(s.a[1], s.b[1]) / G), gy1 = Math.floor(Math.max(s.a[1], s.b[1]) / G);
    for (let gx = gx0; gx <= gx1; gx++) for (let gy = gy0; gy <= gy1; gy++) {
      const k = gx + "," + gy;
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k)!.push(i);
    }
  });
  const tested = new Set<number>();
  for (const list of grid.values())
    for (let x = 0; x < list.length; x++)
      for (let y = x + 1; y < list.length; y++) {
        const i = list[x], j = list[y];
        const id = i < j ? i * S.length + j : j * S.length + i;
        if (tested.has(id)) continue;
        tested.add(id);
        if (S[i].ka === S[j].ka || S[i].ka === S[j].kb || S[i].kb === S[j].ka || S[i].kb === S[j].kb) continue;
        const p = properCross(S[i], S[j]);
        if (p) crossings.push({ p, sin: sinBetween(S[i], S[j]), u: { st: strandOf[i], s: where(i, p) }, v: { st: strandOf[j], s: where(j, p) } });
      }
  const periodic = overUnder(strands, crossings, period);
  return { strands, crossings, periodic };
}

function properCross(s: { a: Pt; b: Pt }, t: { a: Pt; b: Pt }): Pt | null {
  const r: Pt = [s.b[0] - s.a[0], s.b[1] - s.a[1]], q: Pt = [t.b[0] - t.a[0], t.b[1] - t.a[1]];
  const d = cross(r, q);
  if (Math.abs(d) < 1e-12) return null;
  const w: Pt = [t.a[0] - s.a[0], t.a[1] - s.a[1]];
  const u = cross(w, q) / d, v = cross(w, r) / d;
  const e = 1e-6;
  if (u <= e || u >= 1 - e || v <= e || v >= 1 - e) return null;
  return [s.a[0] + u * r[0], s.a[1] + u * r[1]];
}

/**
 * Over, under, over, under along every strand. Each crossing gets one bit: whether the line with the
 * smaller direction angle (mod 180°) passes over. Consecutive crossings along a strand must alternate,
 * and, when a period is given, a crossing and its translate by the period must agree. Both are parity
 * constraints, solved together by breadth-first 2-colouring. Returns false when the constraints conflict
 * (the weave then needs a larger repeat), in which case plain alternation is kept.
 */
function overUnder(strands: Strand[], crossings: Crossing[], period?: { w: number; h: number }): boolean {
  const along: { s: number; ci: number; side: "u" | "v" }[][] = strands.map(() => []);
  crossings.forEach((c, ci) => {
    along[c.u.st].push({ s: c.u.s, ci, side: "u" });
    along[c.v.st].push({ s: c.v.s, ci, side: "v" });
  });
  for (const a of along) a.sort((x, y) => x.s - y.s);
  const angleAt = (st: number, s: number) => {
    const p = piece(strands[st], s - 1e-4, s + 1e-4);
    if (p.length < 2) return 0;
    const a = Math.atan2(p[p.length - 1][1] - p[0][1], p[p.length - 1][0] - p[0][0]);
    return ((a % Math.PI) + Math.PI) % Math.PI;
  };
  // low side: the side whose line has the smaller angle
  const low: ("u" | "v")[] = crossings.map((c) => (angleAt(c.u.st, c.u.s) <= angleAt(c.v.st, c.v.s) ? "u" : "v"));
  // constraint graph: edges (i, j, parity) meaning bit_i XOR bit_j = parity
  const adj: [number, number][][] = crossings.map(() => []);
  const edge = (i: number, j: number, par: number) => { adj[i].push([j, par]); adj[j].push([i, par]); };
  along.forEach((list) => {
    for (let k = 1; k < list.length; k++) {
      const x = list[k - 1], y = list[k];
      const ex = x.side === low[x.ci] ? 1 : 0, ey = y.side === low[y.ci] ? 1 : 0;
      edge(x.ci, y.ci, 1 ^ ex ^ ey);
    }
  });
  if (period) {
    const K = 1e3, key = (x: number, y: number) => `${Math.round(x * K)},${Math.round(y * K)}`;
    const at = new Map<string, number>();
    crossings.forEach((c, i) => at.set(key(c.p[0], c.p[1]), i));
    crossings.forEach((c, i) => {
      for (const [dx, dy] of [[period.w, 0], [0, period.h]]) {
        const j = at.get(key(c.p[0] + dx, c.p[1] + dy));
        if (j !== undefined) edge(i, j, 0);
      }
    });
  }
  const bit = new Int8Array(crossings.length).fill(-1);
  let ok = true;
  for (let s0 = 0; s0 < crossings.length; s0++) {
    if (bit[s0] >= 0) continue;
    bit[s0] = 1;
    const queue = [s0];
    while (queue.length) {
      const i = queue.pop()!;
      for (const [j, par] of adj[i]) {
        const want = bit[i] ^ par;
        if (bit[j] < 0) { bit[j] = want; queue.push(j); }
        else if (bit[j] !== want) ok = false;
      }
    }
  }
  if (!ok && period) return overUnder(strands, crossings, undefined) && false;
  crossings.forEach((c, i) => {
    const lowOver = bit[i] === 1;
    c.over = lowOver ? low[i] : low[i] === "u" ? "v" : "u";
    c.overStrand = c.over === "u" ? c.u : c.v;
  });
  return ok;
}

/** A piece of a strand from arc length s0 to s1. */
export function piece(st: Strand, s0: number, s1: number): Pt[] {
  const pts = st.pts;
  if (!st.cum) {
    st.cum = [0];
    for (let i = 1; i < pts.length; i++) st.cum.push(st.cum[i - 1] + dist(pts[i], pts[i - 1]));
  }
  const cum = st.cum;
  let lo = 0, hi = pts.length - 2;
  while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m + 1] <= s0) lo = m + 1; else hi = m; }
  const out: Pt[] = [];
  for (let i = lo; i < pts.length - 1 && cum[i] < s1; i++) {
    const p = pts[i], q = pts[i + 1], s = cum[i], L = cum[i + 1] - s;
    if (L <= 0) continue;
    const a = Math.max(s0, s), b = Math.min(s1, s + L);
    if (b <= a) continue;
    const f = (x: number): Pt => [p[0] + ((x - s) / L) * (q[0] - p[0]), p[1] + ((x - s) / L) * (q[1] - p[1])];
    if (!out.length) out.push(f(a));
    out.push(f(b));
  }
  return out;
}
