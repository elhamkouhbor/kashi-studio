import { JSDOM } from "jsdom";
import { writeFileSync } from "node:fs";
import { documentFor } from "../src/editor/document";
import { exportSvg } from "../src/export/svg";
const win = new JSDOM("").window as any;
const cases: [string, any, string, any][] = [
  ["girih", { system: "decagonal", angle: 54, style: "interlace", width: 200 }, "timurid-moarraq", { scope: "document", units: "mm" }],
  ["medallion", { size: 150 }, "safavid-haftrang", { scope: "document", units: "cm" }],
  ["eslimi-tile", { size: 120 }, "safavid-haftrang", { scope: "tile", units: "mm", tile: { w: 120, h: 120 } }],
  ["arch", {}, "safavid-haftrang", { scope: "document", units: "mm" }],
];
for (const [gen, p, pal, o] of cases) {
  const { svg } = documentFor(gen, p, pal);
  const out = exportSvg(svg, { includeConstruction: false, includeReference: false, includeTileEdge: false, expandUses: false, ...o }, new win.DOMParser(), new win.XMLSerializer());
  writeFileSync(`node_modules/.cache/ink/${gen}.svg`, out);
}
