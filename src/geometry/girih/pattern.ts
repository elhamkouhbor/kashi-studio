// Builds a girih pattern inside a rectangular tile made of whole periods, so the tile repeats seamlessly.
// Output is geometry only (no SVG): the strands for the strapwork, the over/under crossings, the filled
// pieces between the lines (for moarraq style colouring) and the construction tiling.
import { type Pt, centroid, dist, polygonArea } from "../vec";
import { clipPolygon, clipPolyline, faces } from "../planar";
import { motif, piece, weave, type Segment, type Strand, type Tile, type Crossing } from "./hankin";
import { SYSTEMS } from "./systems";

export interface GirihParams {
  system: string;
  /** Contact angle in degrees, for all tiles. */
  angle: number;
  /** Optional contact angle per tile kind (e.g. "regular-12": 70). */
  angles?: Record<string, number>;
  /** Doubled lines: distance between the two contact points, in edge lengths (0 to 0.5). */
  gap: number;
  /** Tile width in mm. */
  width: number;
  /** Whole periods across and down. */
  cols: number;
  rows: number;
  /** Put the main star at the tile centre instead of the corners. */
  centred: boolean;
}

export interface GirihGeometry {
  w: number;
  h: number;
  edge: number;
  tiles: { pts: Pt[]; kind: string }[];
  strands: Pt[][];
  /** Short runs of the strand that passes over at each crossing (already clipped). */
  overs: Pt[][];
  /** The same runs, slightly longer, for the band colour (so the outline shows only along the sides). */
  oversBand: Pt[][];
  pieces: { pts: Pt[]; cls: number; sides: number; area: number }[];
  classes: number;
  crossings: number;
  /** True when the over/under weave repeats with this tile (checked numerically). */
  weaveSeamless: boolean;
  /** False when the lines admit no consistent over/under alternation (then draw plain strapwork). */
  weaveConsistent: boolean;
}

export function girihSize(p: Pick<GirihParams, "system" | "width" | "cols" | "rows">) {
  const S = SYSTEMS[p.system];
  const edge = p.width / (p.cols * S.period.w);
  return { w: p.width, h: p.rows * S.period.h * edge, edge };
}

export function buildGirih(p: GirihParams, opts: { pieces?: boolean; overReach?: number; bandExtra?: number } = {}): GirihGeometry {
  const S = SYSTEMS[p.system];
  if (!S) throw new Error(`unknown system ${p.system}`);
  const { w, h, edge } = girihSize(p);
  const ox = p.centred ? S.period.w / 2 : 0, oy = p.centred ? S.period.h / 2 : 0;
  // generate a margin of one period around the tile, in edge units
  const mx = S.period.w * 1.05, my = S.period.h * 1.05;
  const W = w / edge, H = h / edge;
  const tiles = S.tilesIn(-mx - ox, -my - oy, W + mx - ox, H + my - oy).map((t) => shift(t, ox, oy));
  const segs: Segment[] = [];
  for (const t of tiles) {
    const a = p.angles?.[t.kind] ?? p.angle;
    for (const s of motif(t, a, p.gap).segs) segs.push(s);
  }
  const sc = (q: Pt): Pt => [q[0] * edge, q[1] * edge];
  const scaled: Segment[] = segs.map(([a, b]) => [sc(a), sc(b)]);
  const { strands, crossings, periodic } = weave(scaled, { w, h });
  annotateCrossings(strands, crossings);

  const clipRun = (pts: Pt[]) => clipPolyline(pts, 0, 0, w, h);
  const strandRuns: Pt[][] = [];
  for (const s of strands) for (const r of clipRun(s.closed ? [...s.pts] : s.pts)) strandRuns.push(r);

  const reach = opts.overReach ?? 1;
  const overs: Pt[][] = [], oversBand: Pt[][] = [];
  const extra = opts.bandExtra ?? reach * 0.3;
  for (const c of crossings) {
    if (c.p[0] < -reach * 4 || c.p[1] < -reach * 4 || c.p[0] > w + reach * 4 || c.p[1] > h + reach * 4) continue;
    const os = c.overStrand!, st: Strand = strands[os.st];
    const r = reach / Math.max(0.25, c.sin || 1);
    for (const run of clipRun(piece(st, os.s - r, os.s + r))) overs.push(run);
    for (const run of clipRun(piece(st, os.s - r - extra, os.s + r + extra))) oversBand.push(run);
  }

  let pieces: GirihGeometry["pieces"] = [];
  let classes = 0;
  if (opts.pieces !== false) {
    const all = faces(scaled);
    // classify by shape: same number of sides and same area means the same piece
    const keyOf = (pts: Pt[]) => `${pts.length}:${Math.round(Math.abs(polygonArea(pts)) / (edge * edge) * 200)}`;
    const keys = new Map<string, number>();
    const tmp = all.map((f) => ({ f, k: keyOf(simplify(f)), a: Math.abs(polygonArea(f)) }));
    // order classes by area, largest first, so colour roles are stable
    const order = [...new Set(tmp.sort((x, y) => y.a - x.a).map((t) => t.k))];
    order.forEach((k, i) => keys.set(k, i));
    classes = order.length;
    for (const t of tmp) {
      const c = centroid(t.f);
      if (c[0] < -w * 0.5 || c[1] < -h * 0.5 || c[0] > w * 1.5 || c[1] > h * 1.5) continue;
      const clipped = clipPolygon(t.f, 0, 0, w, h);
      if (clipped.length < 3 || Math.abs(polygonArea(clipped)) < 1e-6) continue;
      pieces.push({ pts: clipped, cls: keys.get(t.k)!, sides: simplify(t.f).length, area: t.a });
    }
  }

  const tileOut = tiles
    .map((t) => ({ pts: clipPolygon(t.v.map(sc), 0, 0, w, h), kind: t.kind }))
    .filter((t) => t.pts.length >= 3);

  return { w, h, edge, tiles: tileOut, strands: strandRuns, overs, oversBand, pieces, classes, crossings: crossings.length, weaveSeamless: periodic && weaveRepeats(crossings, w, h), weaveConsistent: periodic };
}

function shift(t: Tile, dx: number, dy: number): Tile {
  if (!dx && !dy) return t;
  return { ...t, c: [t.c[0] + dx, t.c[1] + dy], v: t.v.map((q) => [q[0] + dx, q[1] + dy] as Pt) };
}

/** Remove collinear vertices (faces carry extra vertices where lines cross). */
export function simplify(pts: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[(i - 1 + pts.length) % pts.length], b = pts[i], c = pts[(i + 1) % pts.length];
    const cr = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cr) > 1e-9 * (dist(a, b) + dist(b, c)) ** 2 + 1e-12) out.push(b);
  }
  return out;
}

/**
 * The weave alternates along every strand, which can need twice the geometric period. Compare each
 * crossing inside the tile with its copy one tile to the right and one tile down.
 */
function weaveRepeats(crossings: Crossing[], w: number, h: number): boolean {
  const K = 1e3;
  const k = (p: Pt) => `${Math.round(p[0] * K)},${Math.round(p[1] * K)}`;
  const map = new Map<string, Crossing>();
  for (const c of crossings) map.set(k(c.p), c);
  let checked = 0;
  for (const c of crossings) {
    if (c.p[0] < 0 || c.p[1] < 0 || c.p[0] >= w || c.p[1] >= h) continue;
    for (const [dx, dy] of [[w, 0], [0, h]]) {
      const o = map.get(k([c.p[0] + dx, c.p[1] + dy]));
      if (!o) continue;
      checked++;
      if (overAngle(c) !== overAngle(o)) return false;
    }
  }
  return checked > 0;
}

// which line is on top, expressed as the over strand's orientation (mod 180°), comparable across copies
const overAngleCache = new WeakMap<Crossing, number>();
function overAngle(c: Crossing): number {
  return overAngleCache.get(c) ?? NaN;
}

/** Attach the orientation of the over strand at each crossing (needed by weaveRepeats). */
export function annotateCrossings(strands: Strand[], crossings: Crossing[]) {
  for (const c of crossings) {
    const os = c.overStrand!;
    const pts = piece(strands[os.st], os.s - 1e-3, os.s + 1e-3);
    if (pts.length < 2) continue;
    let a = Math.atan2(pts[pts.length - 1][1] - pts[0][1], pts[pts.length - 1][0] - pts[0][0]);
    a = ((a % Math.PI) + Math.PI) % Math.PI;
    overAngleCache.set(c, Math.round(a * 1e4));
  }
}
