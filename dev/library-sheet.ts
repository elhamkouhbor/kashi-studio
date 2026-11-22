import { DESIGNS } from "../src/library/designs";
import { generate } from "../src/editor/document";
import { serialize } from "../src/ornament/node";
import { writeFileSync } from "node:fs";
const start = Number(process.argv[3] || 0), count = Number(process.argv[4] || 40);
let out = "", i = 0;
const C = 8, S = 150, PAD = 26;
for (const d of DESIGNS.slice(start, start + count)) {
  const p = generate(d.gen, d.params, d.palette, "s" + i);
  const k = S / Math.max(p.size.w, p.size.h);
  const x = (i % C) * (S + 10) + 5, y = Math.floor(i / C) * (S + PAD + 10) + 5;
  out += `<g transform="translate(${x},${y})"><g transform="scale(${k})"><defs>${p.defs.map((q) => serialize(q, -1)).join("")}</defs>${serialize(p.node, -1)}</g><text y="${S + 14}" font-size="10" font-family="sans-serif">${start + i}. ${d.title.replace(/&/g, "and").slice(0, 30)}</text></g>`;
  i++;
}
writeFileSync(process.argv[2], `<svg xmlns="http://www.w3.org/2000/svg" width="${C * (S + 10)}" height="${Math.ceil(i / C) * (S + PAD + 10)}"><rect width="100%" height="100%" fill="#ddd"/>${out}</svg>`);
