import { chromium } from "/var/home/payam/kashi-studio/node_modules/playwright-core/index.mjs";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on("console", (m) => m.type() === "error" && errs.push(m.text() + " @" + step)); p.on("pageerror", (e) => errs.push("PAGE " + e.message + " @" + step));
let step = "load";
await p.goto("http://localhost:5200/"); await p.waitForSelector('[data-ready="1"]');
const K = (f, a) => p.evaluate(f, a);
const toClient = (x, y) => K(([x, y]) => window.kashi.canvasToClient(x, y), [x, y]);
step = "pen"; await p.keyboard.press("p");
for (const [x, y] of [[30, 20], [70, 40], [110, 30]]) { const [cx, cy] = await toClient(x, y); await p.mouse.click(cx, cy); }
step = "dblclick"; { const [cx, cy] = await toClient(110, 30); await p.mouse.dblclick(cx, cy); }
step = "esc"; await p.keyboard.press("Escape");
step = "select"; await p.keyboard.press("v");
step = "zoom"; await K(() => window.kashi.setZoom(2));
step = "editnodes"; await K(() => { const ps = [...window.kashi.content().querySelectorAll("path")]; const el = ps.pop(); window.kashi.canvas.selectOnly([el]); window.kashi.editNodes(); });
step = "zoom2"; await K(() => window.kashi.setZoom(1.5));
step = "tool"; await K(() => window.kashi.setTool("select"));
step = "rect-select"; await K(() => { const r = window.kashi.content().querySelector("rect"); window.kashi.canvas.selectOnly([r]); });
console.log(errs.join("\n") || "none");
await b.close();
