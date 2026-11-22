import { chromium } from "/var/home/payam/kashi-studio/node_modules/playwright-core/index.mjs";
const out = process.argv[2], url = process.argv[3] || "http://localhost:5200/";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; p.on("pageerror", (e) => errs.push("PAGE " + e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto(url); await p.waitForSelector('[data-ready="1"]', { timeout: 20000 }).catch(() => errs.push("not ready"));
await p.waitForTimeout(2500);
await p.screenshot({ path: out + "/app.png" });
console.log(errs.slice(0, 10).join("\n") || "no errors");
await b.close();
