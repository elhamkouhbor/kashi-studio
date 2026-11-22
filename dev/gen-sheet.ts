import { serialize } from "../src/ornament/node";
import { PALETTES } from "../src/color/palettes";
import { writeFileSync } from "node:fs";
import { GENERATORS } from "../src/generators/index";
const items: [any, any, string][] = JSON.parse(process.argv[3] || "[]");
const gens: Record<string, any> = { ...GENERATORS, khatai: GENERATORS["khatai-tile"], eslimi: GENERATORS["eslimi-tile"] };
let out = "", x = 10, y = 10, rowH = 0, i = 0;
const list: [string, any, string][] = [
  ["khatai", {}, "safavid-haftrang"], ["khatai", { petals: 12, tip: "round", rings: 3 }, "qajar-shiraz"],
  ["eslimi", {}, "safavid-haftrang"], ["eslimi", { symmetry: "8", ends: "palmette" }, "timurid-moarraq"],
  ["medallion", {}, "safavid-haftrang"], ["medallion", { shape: "toranj", lobes: 16 }, "kerman-ochre"], ["medallion", { shape: "star", lobes: 8 }, "tabriz-blue"],
  ["palmette", {}, "safavid-haftrang"], ["palmette", { kind: "rosette", petals: 10 }, "qajar-shiraz"], ["palmette", { kind: "split" }, "safavid-haftrang"], ["palmette", { kind: "leaf" }, "safavid-haftrang"], ["palmette", { kind: "bud" }, "safavid-haftrang"], ["palmette", { kind: "eslimi" }, "safavid-haftrang"],
  ["girih", { style: "interlace" }, "timurid-moarraq"], ["girih", { style: "moarraq", system: "4.8.8", angle: 67.5 }, "yazd-turquoise"],
];
for (const [k, over, palId] of (items.length ? items : list)) {
  const G = gens[k]; const p = { ...G.defaults, ...over };
  const r = G.build(p, { palette: PALETTES.find((q) => q.id === palId)!, uid: "u" + i });
  const { w, h } = G.size(p);
  const sc = 220 / Math.max(w, h);
  if (x + 230 > 1180) { x = 10; y += rowH + 10; rowH = 0; }
  out += `<g transform="translate(${x},${y}) scale(${sc})"><defs>${(r.defs || []).map((d: any) => serialize(d, -1)).join("")}</defs>${serialize(r.art, -1)}</g>`;
  x += 230; rowH = Math.max(rowH, h * sc); i++;
}
writeFileSync(process.argv[2], `<svg xmlns="http://www.w3.org/2000/svg" width="1180" height="${y + rowH + 10}" style="background:#ddd">${out}</svg>`);
