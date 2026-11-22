import { SYSTEMS } from "../src/geometry/girih/systems";
import { motif, weave, type Segment } from "../src/geometry/girih/hankin";
const S = SYSTEMS.decagonal;
for (const gap of [0, 0.1]) {
  const W = S.period.w, H = S.period.h;
  const tiles = S.tilesIn(-W * 1.05, -H * 1.05, W * 2.05, H * 2.05);
  const segs: Segment[] = []; for (const t of tiles) segs.push(...motif(t, 54, gap).segs);
  const sc = segs.map(([a, b]) => [[a[0] * 10, a[1] * 10], [b[0] * 10, b[1] * 10]] as Segment);
  const r0 = weave(sc), r1 = weave(sc, { w: W * 10, h: H * 10 }), r2 = weave(sc, { w: W * 20, h: H * 20 });
  console.log(gap, "no period:", r0.periodic, "period:", r1.periodic, "double:", r2.periodic, "crossings", r0.crossings.length);
}
