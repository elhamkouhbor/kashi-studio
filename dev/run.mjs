import { build } from "esbuild"; import { spawnSync } from "node:child_process";
const [entry, ...args] = process.argv.slice(2);
await build({ entryPoints: [entry], bundle: true, platform: "node", format: "esm", outfile: "node_modules/.cache/dev.mjs", logLevel: "error", external: ["jsdom", "dompurify", "harfbuzzjs", "@resvg/resvg-js"], banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" } });
const r = spawnSync(process.execPath, ["node_modules/.cache/dev.mjs", ...args], { stdio: "inherit" }); process.exit(r.status ?? 1);
