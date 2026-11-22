import { buildGirih } from "../src/geometry/girih/pattern";
import { SYSTEMS } from "../src/geometry/girih/systems";
import { writeFileSync } from "node:fs";
const pal = ["#1d4e89", "#e8dcc0", "#2a8c8c", "#c9a13e", "#8c2f39", "#f4efe3", "#3b6b4a", "#5b4a8a"];
let cells = "", i = 0;
for (const key of Object.keys(SYSTEMS)) {
  const t0 = performance.now();
  const g = buildGirih({ system: key, angle: SYSTEMS[key].angle, gap: 0, width: 200, cols: 2, rows: 2, centred: false });
  const ms = performance.now() - t0;
  const pd = (pts: number[][], z = true) => "M" + pts.map((p) => p[0].toFixed(2) + " " + p[1].toFixed(2)).join("L") + (z ? "Z" : "");
  let s = `<g transform="translate(${(i % 4) * 230 + 10},${Math.floor(i / 4) * 330 + 10})"><rect width="${g.w}" height="${g.h}" fill="#fff"/>`;
  for (const pc of g.pieces) s += `<path d="${pd(pc.pts)}" fill="${pal[pc.cls % pal.length]}"/>`;
  s += `<path d="${g.strands.map((r) => pd(r, false)).join("")}" fill="none" stroke="#222" stroke-width="3"/>`;
  s += `<path d="${g.strands.map((r) => pd(r, false)).join("")}" fill="none" stroke="#f4efe3" stroke-width="1.6"/>`;
  s += `<text y="${g.h + 14}" font-size="11" font-family="sans-serif">${key} pieces ${g.pieces.length} cls ${g.classes} ${ms.toFixed(0)}ms h=${g.h.toFixed(1)} seam=${g.weaveSeamless}</text></g>`;
  cells += s; i++;
}
writeFileSync(process.argv[2], `<svg xmlns="http://www.w3.org/2000/svg" width="940" height="${Math.ceil(i / 4) * 330 + 20}">${cells}</svg>`);
