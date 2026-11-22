import { chromium } from "/var/home/payam/kashi-studio/node_modules/playwright-core/index.mjs";
const b = await chromium.launch(); const p = await b.newPage();
p.on("response", (r) => { if (r.status() >= 400) console.log(r.status(), r.url()); });
await p.goto("https://elhamkouhbor.com/kashi-studio/"); await p.waitForSelector('[data-ready="1"]'); await p.waitForTimeout(2000);
await b.close();
