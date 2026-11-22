// A small absolute path model (M, L, C, Q, Z) used by every generator, so geometry can be transformed,
// mirrored, measured and written as SVG path data without a DOM.
import { apply, fmt, type Mat, type Pt, dist, lerp } from "./vec";

export type Seg =
  | { k: "M"; p: Pt }
  | { k: "L"; p: Pt }
  | { k: "C"; c1: Pt; c2: Pt; p: Pt }
  | { k: "Q"; c: Pt; p: Pt }
  | { k: "Z" };

export class Path {
  segs: Seg[] = [];
  static from(segs: Seg[]) { const p = new Path(); p.segs = segs; return p; }
  static poly(pts: Pt[], close = true) {
    const p = new Path();
    pts.forEach((q, i) => p.segs.push(i ? { k: "L", p: q } : { k: "M", p: q }));
    if (close && pts.length > 2) p.segs.push({ k: "Z" });
    return p;
  }
  static circle(c: Pt, r: number) {
    // four cubic arcs (k = 0.5523) so the shape stays a plain path in every editor
    const k = 0.5522847498 * r, [x, y] = c;
    return Path.from([
      { k: "M", p: [x + r, y] },
      { k: "C", c1: [x + r, y + k], c2: [x + k, y + r], p: [x, y + r] },
      { k: "C", c1: [x - k, y + r], c2: [x - r, y + k], p: [x - r, y] },
      { k: "C", c1: [x - r, y - k], c2: [x - k, y - r], p: [x, y - r] },
      { k: "C", c1: [x + k, y - r], c2: [x + r, y - k], p: [x + r, y] },
      { k: "Z" },
    ]);
  }
  M(p: Pt) { this.segs.push({ k: "M", p }); return this; }
  L(p: Pt) { this.segs.push({ k: "L", p }); return this; }
  C(c1: Pt, c2: Pt, p: Pt) { this.segs.push({ k: "C", c1, c2, p }); return this; }
  Q(c: Pt, p: Pt) { this.segs.push({ k: "Q", c, p }); return this; }
  Z() { this.segs.push({ k: "Z" }); return this; }
  append(o: Path) { this.segs.push(...o.segs.map(cloneSeg)); return this; }

  transform(m: Mat): Path {
    const t = (p: Pt) => apply(m, p);
    return Path.from(this.segs.map((s) => {
      switch (s.k) {
        case "M": case "L": return { k: s.k, p: t(s.p) };
        case "C": return { k: "C", c1: t(s.c1), c2: t(s.c2), p: t(s.p) };
        case "Q": return { k: "Q", c: t(s.c), p: t(s.p) };
        default: return { k: "Z" };
      }
    }));
  }

  /** Reverse the direction of a single open or closed subpath list (used to join mirrored halves). */
  reversed(): Path {
    const out = new Path();
    const subs = this.subpaths();
    for (const sp of subs) {
      const closed = sp.segs[sp.segs.length - 1]?.k === "Z";
      const segs = sp.segs.filter((s) => s.k !== "Z");
      const pts: Pt[] = segs.map((s) => (s as { p: Pt }).p);
      out.M(pts[pts.length - 1]);
      for (let i = segs.length - 1; i >= 1; i--) {
        const s = segs[i], prev = pts[i - 1];
        if (s.k === "C") out.C(s.c2, s.c1, prev);
        else if (s.k === "Q") out.Q(s.c, prev);
        else out.L(prev);
      }
      if (closed) out.Z();
    }
    return out;
  }

  subpaths(): Path[] {
    const out: Path[] = [];
    for (const s of this.segs) {
      if (s.k === "M" || !out.length) out.push(new Path());
      out[out.length - 1].segs.push(cloneSeg(s));
    }
    return out;
  }

  /** Polyline approximation (for measuring, hit tests and tests). */
  flatten(stepsPerCurve = 16): Pt[][] {
    const rings: Pt[][] = [];
    let cur: Pt[] = [], last: Pt = [0, 0], start: Pt = [0, 0];
    for (const s of this.segs) {
      if (s.k === "M") { if (cur.length) rings.push(cur); cur = [s.p]; last = start = s.p; }
      else if (s.k === "L") { cur.push(s.p); last = s.p; }
      else if (s.k === "C") { for (let i = 1; i <= stepsPerCurve; i++) cur.push(cubicAt(last, s.c1, s.c2, s.p, i / stepsPerCurve)); last = s.p; }
      else if (s.k === "Q") { for (let i = 1; i <= stepsPerCurve; i++) cur.push(quadAt(last, s.c, s.p, i / stepsPerCurve)); last = s.p; }
      else { if (cur.length && dist(cur[cur.length - 1], start) > 1e-9) cur.push(start); last = start; }
    }
    if (cur.length) rings.push(cur);
    return rings;
  }

  points(): Pt[] {
    const out: Pt[] = [];
    for (const s of this.segs) {
      if (s.k === "Z") continue;
      if (s.k === "C") out.push(s.c1, s.c2);
      if (s.k === "Q") out.push(s.c);
      out.push(s.p);
    }
    return out;
  }

  toString(digits = 3): string {
    const f = (p: Pt) => `${fmt(p[0], digits)} ${fmt(p[1], digits)}`;
    return this.segs.map((s) => {
      switch (s.k) {
        case "M": return `M${f(s.p)}`;
        case "L": return `L${f(s.p)}`;
        case "C": return `C${f(s.c1)} ${f(s.c2)} ${f(s.p)}`;
        case "Q": return `Q${f(s.c)} ${f(s.p)}`;
        default: return "Z";
      }
    }).join("");
  }
}

const cloneSeg = (s: Seg): Seg => ({ ...s } as Seg);

export function cubicAt(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}
export function quadAt(p0: Pt, p1: Pt, p2: Pt, t: number): Pt {
  return lerp(lerp(p0, p1, t), lerp(p1, p2, t), t);
}

/** Total length of polylines. */
export function polylineLength(pts: Pt[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
  return L;
}

/** Sample a polyline at arc length s: point and unit tangent. */
export function sampleAt(pts: Pt[], s: number): { p: Pt; t: Pt } {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = dist(pts[i - 1], pts[i]);
    if (acc + l >= s || i === pts.length - 1) {
      const f = l > 0 ? Math.min(1, Math.max(0, (s - acc) / l)) : 0;
      const t: Pt = l > 0 ? [(pts[i][0] - pts[i - 1][0]) / l, (pts[i][1] - pts[i - 1][1]) / l] : [1, 0];
      return { p: lerp(pts[i - 1], pts[i], f), t };
    }
    acc += l;
  }
  return { p: pts[0], t: [1, 0] };
}

/**
 * Smooth closed or open curve through points (Catmull-Rom converted to cubic Béziers). Used for
 * petals, leaves and vines so every generated outline is a few clean, editable cubic segments.
 */
export function smoothThrough(pts: Pt[], closed = false, tension = 1): Path {
  const p = new Path();
  const n = pts.length;
  if (n < 2) return p;
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  p.M(pts[0]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const k = tension / 6;
    p.C([p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k], [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k], p2);
  }
  if (closed) p.Z();
  return p;
}
