// Phase 1 integration test of @svgedit/svgcanvas (run against `npx vite --config research/spike/vite.config.mjs`).
// girih.cjs is js/girih.js from https://github.com/evoluteur/islamic-patterns (MIT), copied next to this file.
import { chromium } from "/var/home/payam/kashi-studio/node_modules/playwright-core/index.mjs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const g = require("./girih.cjs");
const svg = g.patternSvg({ tiling: "4.8.8", angle: 67.5, gap: 0, size: 60, width: 6, style: "interlace", palette: "isfahan", fill: true, showTiles: false, w: 400, h: 400 });
console.log("pattern svg bytes", svg.length);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; p.on("pageerror", (e) => errs.push(String(e))); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto("http://localhost:5300/"); await p.waitForFunction(() => window.canvas);
const r1 = await p.evaluate((s) => { const ok = canvas.setSvgString(s); const els = [...canvas.getSvgContent().querySelectorAll("path,rect")]; return { ok, count: els.length, layers: canvas.getCurrentDrawing().getNumLayers(), undo: typeof canvas.undoMgr }; }, svg);
console.log("import", r1);
// select by clicking on a filled star
const box = await p.evaluate(() => { const el = canvas.getSvgContent().querySelectorAll("path")[0]; const r = el.getBoundingClientRect(); el.id = el.id || "star"; return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: el.id, tag: el.tagName }; });
// Use selectOnly API then drag via mouse
await p.evaluate(() => { const el = canvas.getSvgContent().querySelectorAll("path")[1]; canvas.selectOnly([el], true); });
const sel = await p.evaluate(() => canvas.getSelectedElements().filter(Boolean).map((e) => e.tagName));
console.log("selected", sel);
await p.evaluate(() => canvas.moveSelectedElements(20, 10, true));
const moved = await p.evaluate(() => canvas.getSelectedElements()[0].getAttribute("transform") || canvas.getSelectedElements()[0].getAttribute("d").slice(0, 40));
console.log("after move", moved);
await p.evaluate(() => canvas.undoMgr.undo());
console.log("after undo", await p.evaluate(() => canvas.getSvgContent().querySelectorAll("path")[1].getAttribute("d").slice(0, 40)));
// draw a rectangle with the mouse
await p.evaluate(() => canvas.setMode("rect"));
await p.mouse.move(300, 300); await p.mouse.down(); await p.mouse.move(380, 360, { steps: 5 }); await p.mouse.up();
console.log("rects", await p.evaluate(() => canvas.getSvgContent().querySelectorAll("rect").length));
// path editing: create a path via pen ('path' mode) clicks
await p.evaluate(() => canvas.setMode("path"));
for (const [x, y] of [[100, 500], [200, 450], [260, 560]]) { await p.mouse.click(x, y); }
await p.mouse.click(100, 500); // close
const pth = await p.evaluate(() => { const ps = [...canvas.getSvgContent().querySelectorAll("path")]; return ps[ps.length - 1].getAttribute("d"); });
console.log("pen path", pth, "mode", await p.evaluate(() => canvas.getMode()));
// enter node editing on that path
const nodeEdit = await p.evaluate(() => { const ps = [...canvas.getSvgContent().querySelectorAll("path")]; const el = ps[ps.length - 1]; canvas.setMode("select"); canvas.selectOnly([el]); canvas.pathActions.toEditMode(el); return { mode: canvas.getMode(), grips: document.querySelectorAll('[id^="pathpointgrip_"]').length }; });
console.log("node edit", nodeEdit);
const grip = await p.evaluate(() => { const g = document.querySelector("#pathpointgrip_1"); const r = g.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
await p.mouse.move(grip.x, grip.y); await p.mouse.down(); await p.mouse.move(grip.x + 30, grip.y - 40, { steps: 6 }); await p.mouse.up();
console.log("after node drag", await p.evaluate(() => { const ps = [...canvas.getSvgContent().querySelectorAll("path")]; return ps[ps.length - 1].getAttribute("d"); }));
// convert segment to curve
const curve = await p.evaluate(() => { try { canvas.pathActions.setSegType(6); } catch (e) { return String(e); } const ps = [...canvas.getSvgContent().querySelectorAll("path")]; return ps[ps.length - 1].getAttribute("d"); });
console.log("seg -> curve", curve);
await p.evaluate(() => canvas.pathActions.toSelectMode(canvas.getSelectedElements()[0]));
// group / layers / export
const grp = await p.evaluate(() => { const ps = [...canvas.getSvgContent().querySelectorAll("path")].slice(0, 3); canvas.selectOnly(ps); const g = canvas.groupSelectedElements(); canvas.createLayer("Ornament"); return { g: g && g.tagName, layers: canvas.getCurrentDrawing().getNumLayers(), undo: typeof canvas.undoMgr }; });
console.log("group+layer", grp);
const out = await p.evaluate(() => canvas.getSvgString());
console.log("export bytes", out.length, out.slice(0, 200));
await p.evaluate(() => canvas.setZoom(2)); console.log("zoom", await p.evaluate(() => canvas.getZoom()));
await p.screenshot({ path: process.argv[2] + "/spike.png" });
console.log("errors", errs);
await b.close();
