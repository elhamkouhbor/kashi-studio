// Bundle the TypeScript tests with esbuild and run them with Node's built-in test runner.
import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const out = "node_modules/.cache/tests.mjs";
mkdirSync("node_modules/.cache", { recursive: true });
await build({
  entryPoints: ["tests/all.test.ts"], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error",
  external: ["jsdom", "@resvg/resvg-js", "dompurify", "harfbuzzjs"],
  loader: { ".woff": "file" },
  define: { "import.meta.env.BASE_URL": '"/"' },
  banner: { js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);" },
});
const r = spawnSync(process.execPath, [out], { stdio: "inherit" });
process.exit(r.status ?? 1);
