import { chromium } from "/var/home/payam/kashi-studio/node_modules/playwright-core/index.mjs";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
let step = "load"; const errs = []; p.on("console", (m) => m.type() === "error" && errs.push(m.text() + " @" + step));
await p.goto("http://localhost:5200/"); await p.waitForSelector('[data-ready="1"]');
const K = (f, a) => p.evaluate(f, a);
const toClient = (x, y) => K(([x, y]) => window.kashi.canvasToClient(x, y), [x, y]);
const drag = async (a, bb) => { const [x0, y0] = await toClient(...a), [x1, y1] = await toClient(...bb); await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move(x1, y1, { steps: 8 }); await p.mouse.up(); };
step="regen"; await K(() => { const ed = window.kashi; const g = ed.layerGroup("ornament").querySelector("[data-kashi-gen]"); const pp = JSON.parse(g.getAttribute("data-kashi-params")); ed.regenerate(g, { ...pp, angle: 60 }); ed.undo(); ed.redo(); });
step="new"; await p.click('button[aria-label="New design"]'); await p.click('text=Square tile 20 cm'); await p.click('.modal button:has-text("Create")'); if (await p.locator('[data-testid="confirm-ok"]').count()) await p.click('[data-testid="confirm-ok"]'); await p.waitForTimeout(400);
await K(() => { window.kashi.snap.points = false; window.kashi.snap.guides = false; });
for (const [k, a, bb] of [["r", [20, 20], [60, 50]], ["e", [100, 30], [130, 50]], ["g", [150, 150], [175, 150]]]) { step = k; await p.keyboard.press(k); await drag(a, bb); await p.waitForTimeout(100); }
step = "pen"; await p.keyboard.press("p");
for (const [x, y] of [[30, 120], [70, 90], [110, 130]]) { const [cx, cy] = await toClient(x, y); await p.mouse.click(cx, cy); }
step = "dbl"; { const [cx, cy] = await toClient(110, 130); await p.mouse.dblclick(cx, cy); }
step = "esc"; await p.keyboard.press("Escape");
console.log(errs.join("\n") || "none");
await b.close();
