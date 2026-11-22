import { buildGirih } from "../src/geometry/girih/pattern";
for (const gap of [0, 0.05, 0.1, 0.2]) {
  const g = buildGirih({ system: "decagonal", angle: 54, gap, width: 100, cols: 1, rows: 1, centred: false });
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-7;
  const ends = (pred: (p: number[]) => boolean, c: number) => [...new Set(g.strands.flatMap((r) => [r[0], r[r.length - 1]]).filter(pred).map((p) => Math.round(p[c] * 1e4)))].sort((a, b) => a - b).join(",");
  const L = ends((p) => near(p[0], 0), 1), R = ends((p) => near(p[0], g.w), 1), T = ends((p) => near(p[1], 0), 0), B = ends((p) => near(p[1], g.h), 0);
  console.log(gap, "LR", L === R, "TB", T === B, "weave", g.weaveSeamless, g.crossings);
}
