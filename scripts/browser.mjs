// End-to-end checks in a real browser (headless Chromium via playwright-core).
//   APP_URL=http://localhost:5200/ node scripts/browser.mjs     (dev server or preview)
// Covers the editor (selection, drawing, nodes, layers, arrange, booleans), the ornament tools, the
// generators, export, import sanitising, persistence, previews, text shaping and the phone layout.
import { chromium } from "playwright-core";
import { readFileSync, mkdirSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const URL0 = process.env.APP_URL || "http://localhost:5200/";
const SHOTS = process.env.SHOTS || "node_modules/.cache/shots";
mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const ok = (c, name, detail = "") => { if (c) { pass++; console.log(`  ✓ ${name}`); } else { fail++; console.log(`  ✗ ${name}${detail ? ` (${detail})` : ""}`); } };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
let section = "start";
const log0 = console.log;
console.log = (...a) => { if (typeof a[0] === "string" && a[0].startsWith("\n")) section = a[0].trim(); log0(...a); };
page.on("pageerror", (e) => errors.push(`${e.message} [${section}]`));
page.on("console", (m) => { if (m.type() === "error") errors.push(`${m.text()} [${section}]`); });
const K = (fn, arg) => page.evaluate(fn, arg);
const ready = () => page.waitForSelector('[data-ready="1"]', { timeout: 30000 });
const center = async (sel) => { const b = await page.locator(sel).first().boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };

console.log("Start");
await page.goto(URL0);
await ready();
await page.evaluate(() => indexedDB.deleteDatabase("kashi-studio"));
await page.reload(); await ready();
await page.waitForTimeout(800);
ok(await page.locator(".dcard").count() >= 100, "library shows 100+ designs", String(await page.locator(".dcard").count()));
ok(await K(() => !!window.kashi.layerGroup("ornament")?.querySelector("[data-kashi-gen]")), "a generated design is open at start");
ok(await K(() => window.kashi.layers().map((l) => l.name).join("|")) === "Tile edge|Ornament|Construction|Reference", "four named layers");

console.log("\nLibrary and search");
await page.fill('input[type="search"]', "شمسه");
ok(await page.locator(".dcard").count() > 0, "Persian search finds designs", String(await page.locator(".dcard").count()));
await page.fill('input[type="search"]', "eight-pointed stars and crosses");
await page.locator(".dcard-open").first().click();
await page.waitForTimeout(600);
ok(await K(() => JSON.parse(window.kashi.layerGroup("ornament").querySelector("[data-kashi-gen]").getAttribute("data-kashi-params")).system) === "4.8.8", "opening a card loads its construction");
await page.fill('input[type="search"]', "");
await page.waitForFunction(() => document.querySelectorAll(".dcard img").length > 4, null, { timeout: 20000 }).catch(() => {});
const thumbs = await page.locator(".dcard img").count();
ok(thumbs > 4, "thumbnails render lazily", String(thumbs));

console.log("\nGenerator parameters, undo and redo");
const d0 = await K(() => window.kashi.layerGroup("ornament").querySelector("[data-kashi-gen] path:not([fill='none'])")?.getAttribute("d"));
await page.locator('input[aria-label="Contact angle value"]').fill("60");
await page.locator('input[aria-label="Contact angle value"]').press("Tab");
await page.waitForTimeout(500);
const d1 = await K(() => window.kashi.layerGroup("ornament").querySelector("[data-kashi-gen] path:not([fill='none'])")?.getAttribute("d"));
const p1 = await K(() => JSON.parse(window.kashi.layerGroup("ornament").querySelector("[data-kashi-gen]").getAttribute("data-kashi-params")).angle);
ok(d1 !== d0 && p1 === 60, "changing the contact angle regenerates the geometry");
await K(() => window.kashi.undo());
ok(await K(() => JSON.parse(window.kashi.layerGroup("ornament").querySelector("[data-kashi-gen]").getAttribute("data-kashi-params")).angle) === 67.5, "undo restores the previous construction");
await K(() => window.kashi.redo());
ok(await K(() => JSON.parse(window.kashi.layerGroup("ornament").querySelector("[data-kashi-gen]").getAttribute("data-kashi-params")).angle) === 60, "redo applies it again");

console.log("\nDrawing on an empty document");
await page.click('button[aria-label="New design"]');
await page.click('text=Square tile 20 cm');
await page.click('.modal button:has-text("Create")');
const confirmBtn = page.locator('[data-testid="confirm-ok"]');
if (await confirmBtn.count()) await confirmBtn.click();
await page.waitForTimeout(500);
ok(await K(() => window.kashi.meta.w === 200 && window.kashi.meta.h === 200), "new 200 × 200 mm document");
const toClient = (x, y) => K(([x, y]) => window.kashi.canvasToClient(x, y), [x, y]);
const drag = async (a, b, steps = 8) => { const [x0, y0] = await toClient(...a), [x1, y1] = await toClient(...b); await page.mouse.move(x0, y0); await page.mouse.down(); await page.mouse.move(x1, y1, { steps }); await page.mouse.up(); };
await K(() => { window.kashi.snap.points = false; window.kashi.snap.guides = false; });
await page.keyboard.press("r");
await drag([20, 20], [60, 50]);
ok(await K(() => window.kashi.content().querySelectorAll("rect:not([data-name])").length) >= 1, "rectangle tool draws a rectangle");
await page.keyboard.press("e");
await drag([100, 30], [130, 50]);
ok(await K(() => window.kashi.content().querySelectorAll("ellipse").length) === 1, "ellipse tool draws an ellipse");
await page.keyboard.press("g");
await drag([150, 150], [175, 150]);
ok(await K(() => { const p = [...window.kashi.content().querySelectorAll("path")].pop(); return (p?.getAttribute("d").match(/L/g) ?? []).length; }) === 5, "polygon tool draws a hexagon");
await page.keyboard.press("p");
for (const [x, y] of [[30, 120], [70, 90], [110, 130]]) { const [cx, cy] = await toClient(x, y); await page.mouse.click(cx, cy); }
{ const [cx, cy] = await toClient(110, 130); await page.mouse.dblclick(cx, cy); }
await page.keyboard.press("Escape");
const pen = await K(() => { const ps = [...window.kashi.content().querySelectorAll("path")]; const p = ps.find((x) => /M\s*30[\d.]*[ ,]120/.test(x.getAttribute("d"))) ?? ps.pop(); return p ? { id: p.id, d: p.getAttribute("d") } : null; });
ok(!!pen && /M/.test(pen.d), "pen tool draws a path", pen?.d?.slice(0, 50));

console.log("\nSelection, move, nodes");
await page.keyboard.press("v");
const rectId = await K(() => window.kashi.content().querySelector("rect:not([data-name])").id);
{ const [cx, cy] = await toClient(40, 35); await page.mouse.click(cx, cy); }
ok(await K(() => window.kashi.selected().length) === 1, "click selects one object");
const before = await K((id) => document.getElementById(id).getAttribute("x"), rectId);
await drag([40, 35], [70, 35]);
const after = await K((id) => document.getElementById(id).getAttribute("x"), rectId);
ok(Math.abs(Number(after) - Number(before) - 30) < 1.5, "dragging moves the object by the drag distance", `${before} → ${after}`);
await K(() => window.kashi.undo());
ok(Math.abs(Number(await K((id) => document.getElementById(id).getAttribute("x"), rectId)) - Number(before)) < 1e-6, "undo moves it back");
if (pen) {
  await K((id) => { const el = document.getElementById(id); window.kashi.canvas.selectOnly([el]); window.kashi.editNodes(); }, pen.id);
  await page.waitForTimeout(200);
  const grips = await page.locator('[id^="pathpointgrip_"]').count();
  ok(grips >= 3, "node editing shows a grip per node", String(grips));
  const g1 = await center("#pathpointgrip_1");
  await page.mouse.move(g1[0], g1[1]); await page.mouse.down(); await page.mouse.move(g1[0] + 25, g1[1] - 20, { steps: 6 }); await page.mouse.up();
  const dn = await K((id) => document.getElementById(id).getAttribute("d"), pen.id);
  ok(dn !== pen.d, "dragging a node changes the path", dn.slice(0, 60));
  await K(() => window.kashi.setSegment(true));
  ok(/C/.test(await K((id) => document.getElementById(id).getAttribute("d"), pen.id)), "a segment converts to a Bézier curve");
  await K(() => window.kashi.setTool("select"));
}

console.log("\nArrange, align, distribute, booleans");
const ids3 = await K(() => {
  const ed = window.kashi, ns = "http://www.w3.org/2000/svg", ids = [];
  for (const [x, w] of [[10, 10], [40, 30], [150, 20]]) { const r = document.createElementNS(ns, "rect"); r.id = ed.canvas.getNextId(); Object.entries({ x, y: 170, width: w, height: 10, fill: "#2fa3b0" }).forEach(([k, v]) => r.setAttribute(k, v)); ed.layerGroup("ornament").appendChild(r); ids.push(r.id); }
  ed.canvas.selectOnly(ids.map((i) => document.getElementById(i)));
  ed.distribute("h");
  return ids;
});
const gaps = await K((ids) => { const b = ids.map((i) => document.getElementById(i).getBBox()).sort((a, c) => a.x - c.x); return [b[1].x - (b[0].x + b[0].width), b[2].x - (b[1].x + b[1].width)]; }, ids3);
ok(Math.abs(gaps[0] - gaps[1]) < 0.01, "distribute makes equal gaps", gaps.map((g) => g.toFixed(2)).join(" / "));
await K((ids) => { window.kashi.canvas.selectOnly(ids.map((i) => document.getElementById(i))); window.kashi.align("t"); }, ids3);
ok(await K((ids) => new Set(ids.map((i) => Math.round(document.getElementById(i).getBBox().y * 1000))).size === 1, ids3), "align top lines them up");
await K((ids) => { window.kashi.canvas.selectOnly(ids.slice(0, 2).map((i) => document.getElementById(i))); window.kashi.group(); }, ids3);
ok(await K(() => window.kashi.selected()[0]?.tagName) === "g", "group makes a group");
await K(() => window.kashi.ungroup());
ok(await K(() => window.kashi.selected().length) === 2, "ungroup restores the parts");
await K(() => window.kashi.duplicate());
ok(await K(() => window.kashi.selected().length) === 2, "duplicate copies the selection");
const nBefore = await K(() => window.kashi.content().querySelectorAll("path,rect").length);
await K(async () => {
  const ed = window.kashi, ns = "http://www.w3.org/2000/svg", els = [];
  for (const [x, y] of [[20, 140], [30, 145]]) { const r = document.createElementNS(ns, "rect"); r.id = ed.canvas.getNextId(); Object.entries({ x, y, width: 20, height: 20, fill: "#e0ac3e" }).forEach(([k, v]) => r.setAttribute(k, v)); ed.layerGroup("ornament").appendChild(r); els.push(r); }
  ed.canvas.selectOnly(els);
  await ed.boolean("unite");
});
const united = await K(() => window.kashi.selected()[0]);
ok(await K(() => window.kashi.selected()[0]?.tagName === "path" && window.kashi.selected()[0].getBBox().width > 29.9), "boolean unite merges two squares into one path");
void united; void nBefore;

console.log("\nLayers");
await K(() => window.kashi.setLayerLocked("Ornament", true));
{ const [cx, cy] = await toClient(55, 175); await page.mouse.click(cx, cy); }
ok(await K(() => window.kashi.selected().length) === 0, "objects in a locked layer cannot be selected");
await K(() => window.kashi.setLayerLocked("Ornament", false));
await K(() => window.kashi.setLayerVisible("Ornament", false));
ok(await K(() => window.kashi.layerGroup("ornament").getAttribute("display")) === "none", "hiding a layer");
await K(() => window.kashi.undo());
ok(await K(() => window.kashi.layerGroup("ornament").getAttribute("display")) === null, "layer visibility is undoable");

console.log("\nSymmetry designer and brush");
const symCount = await K(() => {
  const ed = window.kashi, ns = "http://www.w3.org/2000/svg";
  const p = document.createElementNS(ns, "path"); p.id = ed.canvas.getNextId();
  p.setAttribute("d", "M100 100 C110 80 120 70 130 60 L135 75 Z"); p.setAttribute("fill", "#1d3c86");
  ed.layerGroup("ornament").appendChild(p);
  ed.canvas.selectOnly([p]);
  ed.makeSymmetric(8, true, [100, 100]);
  return ed.selected()[0].querySelectorAll("use").length;
});
ok(symCount === 15, "8-fold mirror symmetry makes 15 live copies", String(symCount));
const live = await K(() => { const g = window.kashi.selected()[0]; const src = g.querySelector("g"); const p = src.querySelector("path"); p.setAttribute("fill", "#b33a3a"); const u = g.querySelectorAll("use")[3]; return getComputedStyle(document.getElementById(u.getAttribute("href").slice(1)).querySelector("path")).fill; });
ok(/179, 58, 58/.test(live), "editing the source updates the copies");
ok(await K(() => window.kashi.expandUses()) === 15 && await K(() => window.kashi.content().querySelectorAll("use").length) === 0, "expand copies turns them into paths");
await K(() => { const ed = window.kashi, ns = "http://www.w3.org/2000/svg"; const p = document.createElementNS(ns, "path"); p.id = ed.canvas.getNextId(); p.setAttribute("d", "M20 60 C60 20 100 100 180 60"); p.setAttribute("fill", "none"); p.setAttribute("stroke", "#4a873c"); ed.layerGroup("ornament").appendChild(p); ed.canvas.selectOnly([p]); });
await page.click('.insp-tabs button:has-text("Tools")');
await page.click('button:has-text("Place along path")');
await page.waitForTimeout(300);
const brushed = await K(() => window.kashi.content().querySelector('[data-name="Brushed motifs"]')?.querySelectorAll("path").length ?? 0);
ok(brushed >= 8, "ornament brush places editable motifs along the path", String(brushed));

console.log("\nPersian text with HarfBuzz shaping");
await page.fill('.fa-input', "کاشی‌های اصفهان");
await page.click('button:has-text("Insert as outlines")');
await page.waitForFunction(() => !!document.querySelector('[data-name^="Text outlines"]'), null, { timeout: 15000 }).catch(() => {});
const tp = await K(() => { const p = document.querySelector('[data-name^="Text outlines"]'); return p ? { len: p.getAttribute("d").length, w: p.getBBox().width } : null; });
ok(!!tp && tp.len > 400 && tp.w > 20, "text becomes outlines", tp ? `${tp.len} chars, ${tp.w.toFixed(1)} mm wide` : "none");
// shaping check: joined forms make the word narrower than isolated letters
const widths = await K(async () => { const m = await import("/src/text/outline.ts"); const a = await m.textToPath("کاشی", "Vazirmatn", 400, 20); const iso = await m.textToPath("ک ا ش ی".replace(/ /g, "‌"), "Vazirmatn", 400, 20); return [a.width, iso.width]; });
ok(widths[0] < widths[1], "letters join (shaped word is narrower than isolated letters)", widths.map((w) => w.toFixed(2)).join(" < "));

console.log("\nRecolour");
await K(() => window.kashi.canvas.clearSelection());
const cols = await K(() => window.kashi.colours().length);
await K(() => { const c = window.kashi.colours()[0].hex; window.kashi.replaceColour(c, "#123456"); });
ok(cols > 1 && await K(() => window.kashi.colours().some((c) => c.hex === "#123456")), "replace a colour everywhere");

console.log("\nExport");
await page.click('.export-btn');
await page.locator('.radio-set input').first().check();
const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-testid="export-svg"]')]);
const svgText = readFileSync(await dl.path(), "utf8");
ok(/width="200mm"/.test(svgText) && /height="200mm"/.test(svgText) && /viewBox="0 0 200 200"/.test(svgText), "SVG has millimetre size and viewBox");
ok(/inkscape:groupmode="layer"/.test(svgText) && /inkscape:label="Ornament"/.test(svgText), "layers are named for Inkscape and Illustrator");
ok(!/data-kashi|se:|<script/i.test(svgText), "no editor data or scripts in the export");
ok(!/<image[^>]+href="data:image\/png/.test(svgText), "vectors, not an embedded picture");
try { const png = new Resvg(svgText, { fitTo: { mode: "width", value: 400 } }).render(); ok(png.width === 400, "export renders in an independent renderer (resvg)"); } catch (e) { ok(false, "export renders in resvg", e.message); }

console.log("\nImport sanitising");
const evil = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="50mm" height="40mm" viewBox="0 0 50 40" onload="alert(1)"><script>window.pwned=1</script><rect width="50" height="40" fill="#2fa3b0" onclick="window.pwned=2"/><image href="https://example.com/x.png" width="10" height="10"/><foreignObject><div>x</div></foreignObject><a href="javascript:alert(1)"><circle cx="5" cy="5" r="3"/></a></svg>`;
await page.setInputFiles('.topbar input[type="file"]', { name: "evil.svg", mimeType: "image/svg+xml", buffer: Buffer.from(evil) });
if (await confirmBtn.count()) await confirmBtn.click();
await page.waitForTimeout(600);
const imported = await K(() => ({ html: window.kashi.content().outerHTML, w: window.kashi.meta.w, h: window.kashi.meta.h, pwned: window.pwned }));
ok(!/script|onload|onclick|foreignObject|example\.com|javascript:/i.test(imported.html) && !imported.pwned, "scripts, handlers and external references are removed");
ok(Math.abs(imported.w - 50) < 1e-6 && Math.abs(imported.h - 40) < 1e-6, "imported size is read in mm");
await page.setInputFiles('.topbar input[type="file"]', { name: "broken.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg><g><path d='M0 0") });
await page.waitForTimeout(400);
ok(/not well-formed/.test(await page.locator(".toast").textContent()), "a malformed SVG is rejected with a message", await page.locator(".toast").textContent());
ok(await page.locator(".modal-backdrop").count() === 0, "nothing is discarded for a rejected file");

console.log("\nProjects and autosave");
await page.fill('input[type="search"]', "Lobed shamse");
await page.locator(".dcard-open").first().click();
if (await confirmBtn.count()) await confirmBtn.click();
await page.waitForTimeout(500);
await page.keyboard.press("Control+s");
await page.waitForTimeout(800);
ok(await K(async () => { const r = indexedDB.open("kashi-studio"); const db = await new Promise((res) => { r.onsuccess = () => res(r.result); }); const all = await new Promise((res) => { const q = db.transaction("projects").objectStore("projects").getAll(); q.onsuccess = () => res(q.result); }); db.close(); return all.length; }) === 1, "Ctrl+S saves a project in IndexedDB");
await K(() => { const ed = window.kashi, ns = "http://www.w3.org/2000/svg"; const r = document.createElementNS(ns, "rect"); r.id = "persist-me"; Object.entries({ x: 5, y: 5, width: 9, height: 9, fill: "#b33a3a" }).forEach(([k, v]) => r.setAttribute(k, v)); ed.layerGroup("ornament").appendChild(r); ed.emit("change"); });
await page.waitForTimeout(150);
await page.reload(); await ready(); await page.waitForTimeout(500);
ok(await K(() => !!document.getElementById("persist-me")), "an edit made just before reload is restored (autosave)");
ok(await K(() => !!window.kashi.layerGroup("ornament").querySelector("[data-kashi-gen=medallion]")), "the working design comes back after reload");
await page.click('button[aria-label="Projects"]');
await page.waitForSelector(".project-list li");
ok(await page.locator(".project-list li").count() === 1, "projects dialog lists the saved project");
await page.click('.project-list button[aria-label^="Duplicate"]');
await page.waitForTimeout(400);
ok(await page.locator(".project-list li").count() === 2, "duplicate project");
await page.click('.modal button[aria-label="Close"]');

console.log("\nPreviews and seams");
await page.fill('input[type="search"]', "Ten-pointed stars with bowties");
await page.locator(".dcard-open").first().click();
if (await confirmBtn.count()) await confirmBtn.click();
await page.waitForTimeout(500);
await page.click('button:has-text("Repeat")');
await page.waitForSelector('[data-testid="seam-ok"], [data-testid="seam-warn"]', { timeout: 10000 }).catch(() => {});
ok(await page.locator('[data-testid="seam-ok"]').count() === 1, "girih tile passes the seam test");
await page.screenshot({ path: `${SHOTS}/repeat.png` });
await page.click('button:has-text("Ceramic")');
await page.waitForTimeout(800);
ok(await page.locator(".preview-layer.ceramic svg image").count() >= 9, "ceramic preview shows a wall of tiles");
await page.screenshot({ path: `${SHOTS}/ceramic.png` });
await page.click('button:has-text("Back to vector")');

console.log("\nReference and tracing");
await page.fill('input[type="search"]', "");
await page.click('.lib-tabs button:has-text("References")');
await page.locator(".rcard-open").first().click();
await page.waitForSelector(".ref-detail");
ok(await page.locator(".facts").textContent().then((t) => /Accession/.test(t)), "reference shows its accession number and facts");
await page.click('button:has-text("Place as tracing image")');
await page.waitForTimeout(800);
ok(await K(() => !!window.kashi.layerGroup("reference").querySelector("image")), "tracing image placed in the reference layer");
ok(await K(() => window.kashi.layerGroup("reference").getAttribute("data-locked")) === "1", "reference layer stays locked");
await page.screenshot({ path: `${SHOTS}/reference.png` });

console.log("\nLarge pattern performance");
const t = await K(() => { const ed = window.kashi; const g = ed.layerGroup("ornament").querySelector("[data-kashi-gen]"); const p = JSON.parse(g.getAttribute("data-kashi-params")); const t0 = performance.now(); ed.regenerate(g, { ...p, cols: 6, rows: 6, width: 600 }); return { ms: performance.now() - t0, n: ed.content().querySelectorAll("path").length }; });
ok(t.ms < 4000, `a 6 × 6 ten-fold girih regenerates in ${Math.round(t.ms)} ms (${t.n} paths)`);
const fps = await K(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else res(n); }; requestAnimationFrame(f); }));
ok(fps > 20, `the page stays responsive (${fps} frames in 1 s)`);

console.log("\nPhone and tablet");
for (const [w, h, name] of [[390, 844, "phone"], [820, 1180, "tablet"]]) {
  const m = await browser.newPage({ viewport: { width: w, height: h }, isMobile: w < 500, hasTouch: true });
  await m.goto(URL0); await m.waitForSelector('[data-ready="1"]', { timeout: 30000 });
  await m.waitForTimeout(600);
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(overflow <= 0, `${name}: no horizontal overflow`, String(overflow));
  if (w < 500) {
    ok(await m.locator(".mobile-tabs").isVisible(), "phone: bottom tabs");
    await m.click('.mobile-tabs button:has-text("Library")');
    ok(await m.locator(".dcard").first().isVisible(), "phone: library pane");
    await m.screenshot({ path: `${SHOTS}/phone-library.png` });
    await m.click('.mobile-tabs button:has-text("Properties")');
    await m.screenshot({ path: `${SHOTS}/phone-inspector.png` });
    await m.click('.mobile-tabs button:has-text("Canvas")');
  }
  await m.screenshot({ path: `${SHOTS}/${name}.png` });
  await m.close();
}

await page.screenshot({ path: `${SHOTS}/desktop.png` });
const real = errors.filter((e) => !/favicon|ERR_FILE_NOT_FOUND/.test(e));
ok(real.length === 0, "no console errors", real.slice(0, 3).join(" | "));
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
