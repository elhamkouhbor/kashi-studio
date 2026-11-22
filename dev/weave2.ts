import { SYSTEMS } from "../src/geometry/girih/systems";
import { motif, weave, piece, type Segment } from "../src/geometry/girih/hankin";
const S = SYSTEMS.decagonal; const W = S.period.w * 2, H = S.period.h * 2;
const tiles = S.tilesIn(-S.period.w * 1.05, -S.period.h * 1.05, W + S.period.w * 1.05, H + S.period.h * 1.05);
const segs: Segment[] = []; for (const t of tiles) segs.push(...motif(t, 54, 0.1).segs);
const { strands, crossings } = weave(segs);
const ang = (c: any) => { const os = c.overStrand; const p = piece(strands[os.st], os.s - 1e-3, os.s + 1e-3); if (p.length < 2) return NaN; let a = Math.atan2(p[p.length-1][1]-p[0][1], p[p.length-1][0]-p[0][0]); return Math.round((((a % Math.PI)+Math.PI)%Math.PI)*1e4); };
const key = (p: number[]) => `${Math.round(p[0]*1e3)},${Math.round(p[1]*1e3)}`;
const map = new Map(crossings.map((c) => [key(c.p), c]));
let same = 0, diff = 0, nan = 0, miss = 0;
for (const c of crossings) { if (c.p[0] < 0 || c.p[1] < 0 || c.p[0] >= S.period.w || c.p[1] >= S.period.h) continue; const o = map.get(key([c.p[0] + S.period.w, c.p[1]])); if (!o) { miss++; continue; } const a = ang(c), b = ang(o); if (isNaN(a) || isNaN(b)) nan++; else if (a === b) same++; else diff++; }
console.log({ same, diff, nan, miss, crossings: crossings.length, strands: strands.length });
