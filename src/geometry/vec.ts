// Points, affine transforms and small numeric helpers. Pure and framework free.
// Document units are millimetres (1 SVG user unit = 1 mm).
export type Pt = [number, number];
/** Affine matrix [a, b, c, d, e, f] as in SVG: x' = a x + c y + e, y' = b x + d y + f. */
export type Mat = [number, number, number, number, number, number];

export const EPS = 1e-9;
export const TAU = Math.PI * 2;
export const D2R = Math.PI / 180;

export const add = (p: Pt, q: Pt): Pt => [p[0] + q[0], p[1] + q[1]];
export const sub = (p: Pt, q: Pt): Pt => [p[0] - q[0], p[1] - q[1]];
export const mul = (p: Pt, k: number): Pt => [p[0] * k, p[1] * k];
export const dot = (p: Pt, q: Pt) => p[0] * q[0] + p[1] * q[1];
export const cross = (p: Pt, q: Pt) => p[0] * q[1] - p[1] * q[0];
export const len = (p: Pt) => Math.hypot(p[0], p[1]);
export const dist = (p: Pt, q: Pt) => Math.hypot(p[0] - q[0], p[1] - q[1]);
export const lerp = (p: Pt, q: Pt, t: number): Pt => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
export const mid = (p: Pt, q: Pt): Pt => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
export const norm = (p: Pt): Pt => { const l = len(p) || 1; return [p[0] / l, p[1] / l]; };
export const perp = (p: Pt): Pt => [-p[1], p[0]];
export const polar = (r: number, a: number, c: Pt = [0, 0]): Pt => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)];
export const angleOf = (p: Pt) => Math.atan2(p[1], p[0]);
export const rot = (p: Pt, a: number, c: Pt = [0, 0]): Pt => {
  const s = Math.sin(a), co = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * co - y * s, c[1] + x * s + y * co];
};
export const near = (p: Pt, q: Pt, tol = 1e-6) => Math.abs(p[0] - q[0]) <= tol && Math.abs(p[1] - q[1]) <= tol;

export const I: Mat = [1, 0, 0, 1, 0, 0];
export const matMul = (m: Mat, n: Mat): Mat => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
export const apply = (m: Mat, p: Pt): Pt => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
export const translate = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
export const scaleM = (sx: number, sy = sx): Mat => [sx, 0, 0, sy, 0, 0];
export const rotateM = (a: number, c: Pt = [0, 0]): Mat => {
  const co = Math.cos(a), s = Math.sin(a);
  return [co, s, -s, co, c[0] - co * c[0] + s * c[1], c[1] - s * c[0] - co * c[1]];
};
/** Reflection across the line through c at angle a. */
export const reflectM = (a: number, c: Pt = [0, 0]): Mat => {
  const co = Math.cos(2 * a), s = Math.sin(2 * a);
  return matMul(translate(c[0], c[1]), matMul([co, s, s, -co, 0, 0], translate(-c[0], -c[1])));
};
export const matToSvg = (m: Mat) => `matrix(${m.map((v) => fmt(v, 6)).join(" ")})`;
export const isIdentity = (m: Mat) => m.every((v, i) => Math.abs(v - I[i]) < 1e-12);

/** Number formatting for SVG: fixed decimals, no trailing zeros, no "-0". */
export function fmt(v: number, digits = 3): string {
  const k = 10 ** digits;
  let r = Math.round(v * k) / k;
  if (Object.is(r, -0) || Math.abs(r) < 0.5 / k) r = 0;
  return String(r);
}

/** Intersection of lines p + t·u and q + s·w (null if parallel). */
export function lineMeet(p: Pt, u: Pt, q: Pt, w: Pt): Pt | null {
  const d = cross(u, w);
  if (Math.abs(d) < 1e-12) return null;
  const t = cross(sub(q, p), w) / d;
  return [p[0] + t * u[0], p[1] + t * u[1]];
}

/** Proper crossing of segments ab and cd, away from their ends. Returns point and parameters. */
export function segCross(a: Pt, b: Pt, c: Pt, d: Pt, e = 1e-9): { p: Pt; t: number; s: number } | null {
  const r = sub(b, a), q = sub(d, c);
  const den = cross(r, q);
  if (Math.abs(den) < 1e-14) return null;
  const w = sub(c, a);
  const t = cross(w, q) / den, s = cross(w, r) / den;
  if (t < -e || t > 1 + e || s < -e || s > 1 + e) return null;
  return { p: [a[0] + t * r[0], a[1] + t * r[1]], t, s };
}

export function polygonArea(pts: Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) a += cross(pts[i], pts[(i + 1) % pts.length]);
  return a / 2;
}
export function centroid(pts: Pt[]): Pt {
  let x = 0, y = 0;
  for (const p of pts) { x += p[0]; y += p[1]; }
  return [x / pts.length, y / pts.length];
}
export function pointInPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function regularPolygon(n: number, r: number, c: Pt = [0, 0], a0 = -Math.PI / 2): Pt[] {
  return Array.from({ length: n }, (_, k) => polar(r, a0 + (TAU * k) / n, c));
}

export interface Box { x: number; y: number; w: number; h: number }
export function bboxOf(pts: Pt[]): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Deterministic PRNG (mulberry32) for reproducible variations. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
