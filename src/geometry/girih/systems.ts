// The tilings Kashi Studio grows girih patterns from. Each system has a rectangular period, so a tile of
// whole periods repeats without seams.
//
// - Ten Archimedean and uniform tilings of regular polygons (from islamic-patterns, see hankin.ts).
// - The ten-fold girih system: regular decagons on a centred rectangular lattice, touching along edges at
//   36°, with the bowtie girih tile filling each gap. This is one of the periodic arrangements of the five
//   girih tiles described by Lu and Steinhardt (Science 315, 2007). At a 54° contact angle the decagons
//   carry the classical 10-pointed star and the bowties the linking strapwork.
// - Girih tiles placed individually (decagon, pentagon, elongated hexagon, bowtie, rhombus) for the
//   girih tile designer.
import { type Pt, D2R, dist, polar } from "../vec";
import { LATTICES, rectPeriod, tilesIn, type Tile } from "./hankin";

export interface GirihSystem {
  key: string;
  name: string;
  nameFa: string;
  /** Rectangular period in edge units. */
  period: { w: number; h: number };
  /** Rotational order of the main star (for labels and symmetry metadata). */
  fold: number;
  tilesIn(x0: number, y0: number, x1: number, y1: number): Tile[];
  /** Default contact angle and the classical range. */
  angle: number;
  range: [number, number];
}

const lattice = (key: string, nameFa: string, fold: number, angle: number, range: [number, number]): GirihSystem => {
  const L = LATTICES[key];
  return { key, name: L.name, nameFa, period: rectPeriod(L), fold, tilesIn: (x0, y0, x1, y1) => tilesIn(L, x0, y0, x1, y1), angle, range };
};

/** The five girih tiles with edges of 1, built from their interior angles. */
export const GIRIH_TILES: Record<string, { name: string; nameFa: string; angles: number[] }> = {
  decagon: { name: "Decagon", nameFa: "ده‌ضلعی", angles: Array(10).fill(144) },
  pentagon: { name: "Pentagon", nameFa: "پنج‌ضلعی", angles: Array(5).fill(108) },
  hexagon: { name: "Elongated hexagon", nameFa: "شش‌ضلعی کشیده", angles: [72, 144, 144, 72, 144, 144] },
  bowtie: { name: "Bowtie", nameFa: "پاپیونی", angles: [72, 72, 216, 72, 72, 216] },
  rhombus: { name: "Rhombus", nameFa: "لوزی", angles: [72, 108, 72, 108] },
};

/** Vertices of a girih tile (edge 1) by walking its interior angles, centred on its vertex mean. */
export function girihTile(kind: string, at: Pt = [0, 0], rotation = 0): Tile {
  const def = GIRIH_TILES[kind];
  const v: Pt[] = [];
  let p: Pt = [0, 0], h = 0;
  for (let i = 0; i < def.angles.length; i++) {
    v.push(p);
    p = [p[0] + Math.cos(h), p[1] + Math.sin(h)];
    h += (180 - def.angles[(i + 1) % def.angles.length]) * D2R;
  }
  const cx = v.reduce((s, q) => s + q[0], 0) / v.length, cy = v.reduce((s, q) => s + q[1], 0) / v.length;
  const cs = Math.cos(rotation), sn = Math.sin(rotation);
  const out = v.map(([x, y]): Pt => { const dx = x - cx, dy = y - cy; return [at[0] + dx * cs - dy * sn, at[1] + dx * sn + dy * cs]; });
  return { n: out.length, c: at, v: out, kind: kind === "decagon" || kind === "pentagon" ? `regular-${out.length}` : `girih-${kind}` };
}

const R10 = 0.5 / Math.sin(18 * D2R); // circumradius of the decagon
const r10 = 0.5 / Math.tan(18 * D2R); // inradius
const DW = 4 * r10 * Math.cos(36 * D2R), DH = 4 * r10 * Math.sin(36 * D2R);

function decagon(c: Pt): Tile {
  const v = Array.from({ length: 10 }, (_, k) => polar(R10, (18 + 36 * k) * D2R, c));
  return { n: 10, c, v, kind: "regular-10" };
}

/** Decagons at the corners and centre of a DW × DH rectangle, bowties in between. */
function decagonalTiles(x0: number, y0: number, x1: number, y1: number): Tile[] {
  const out: Tile[] = [];
  const i0 = Math.floor(x0 / DW) - 1, i1 = Math.ceil(x1 / DW) + 1, j0 = Math.floor(y0 / DH) - 1, j1 = Math.ceil(y1 / DH) + 1;
  const centres: Pt[] = [];
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) centres.push([i * DW, j * DH], [i * DW + DW / 2, j * DH + DH / 2]);
  const decs = centres.map(decagon);
  for (const d of decs) if (d.c[0] + R10 >= x0 && d.c[0] - R10 <= x1 && d.c[1] + R10 >= y0 && d.c[1] - R10 <= y1) out.push(d);
  // bowties: centred between four decagons
  const bowCentres: Pt[] = [];
  for (let i = i0 + 1; i < i1; i++) for (let j = j0 + 1; j < j1; j++) bowCentres.push([i * DW, j * DH + DH / 2], [i * DW + DW / 2, j * DH]);
  for (const bc of bowCentres) {
    if (bc[0] + 1.2 < x0 || bc[0] - 1.2 > x1 || bc[1] + 1.2 < y0 || bc[1] - 1.2 > y1) continue;
    const pts: Pt[] = [];
    for (const d of decs) {
      if (dist(d.c, bc) > 3.2) continue;
      for (const v of d.v) if (dist(v, bc) < 1.1 && !pts.some((q) => dist(q, v) < 1e-6)) pts.push(v);
    }
    if (pts.length !== 6) continue;
    pts.sort((a, b) => Math.atan2(a[1] - bc[1], a[0] - bc[0]) - Math.atan2(b[1] - bc[1], b[0] - bc[0]));
    out.push({ n: 6, c: bc, v: pts, kind: "girih-bowtie" });
  }
  return out;
}

export const SYSTEMS: Record<string, GirihSystem> = {
  "decagonal": { key: "decagonal", name: "Decagons and bowties (girih tiles)", nameFa: "ده‌ضلعی و پاپیونی", period: { w: DW, h: DH }, fold: 10, tilesIn: decagonalTiles, angle: 54, range: [36, 72] },
  "4.8.8": lattice("4.8.8", "هشت‌ضلعی و مربع", 8, 67.5, [45, 80]),
  "4.4.4.4": lattice("4.4.4.4", "مربع", 4, 45, [20, 70]),
  "6.6.6": lattice("6.6.6", "شش‌ضلعی", 6, 60, [30, 75]),
  "3.6.3.6": lattice("3.6.3.6", "شش‌ضلعی و مثلث", 6, 60, [30, 75]),
  "3.4.6.4": lattice("3.4.6.4", "شش‌ضلعی، مربع و مثلث", 6, 60, [30, 75]),
  "4.6.12": lattice("4.6.12", "دوازده‌ضلعی، شش‌ضلعی و مربع", 12, 62, [45, 75]),
  "3.12.12": lattice("3.12.12", "دوازده‌ضلعی و مثلث", 12, 70, [50, 80]),
  "3.3.4.3.4": lattice("3.3.4.3.4", "مربع چرخیده و مثلث", 4, 60, [35, 75]),
  "3.3.3.4.4": lattice("3.3.3.4.4", "ردیف مربع و مثلث", 2, 55, [35, 75]),
  "3.3.3.3.3.3": lattice("3.3.3.3.3.3", "مثلث", 6, 60, [30, 75]),
};
