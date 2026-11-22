import { Resvg } from "@resvg/resvg-js"; import { readFileSync, writeFileSync } from "node:fs";
const r = new Resvg(readFileSync(process.argv[2], "utf8"), { fitTo: { mode: "width", value: Number(process.argv[4] || 1400) }, font: { loadSystemFonts: true } });
writeFileSync(process.argv[3], r.render().asPng());
