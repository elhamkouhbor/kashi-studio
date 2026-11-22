// Post-build for GitHub Pages: SPA fallback (404.html), no Jekyll, and a public-output audit
// (no source maps or stray source files).
import { copyFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const dir = process.argv[2] || "dist";
copyFileSync(join(dir, "index.html"), join(dir, "404.html"));
writeFileSync(join(dir, ".nojekyll"), "");
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else files.push(relative(dir, p).split("\\").join("/")); } };
walk(dir);
const bad = files.filter((f) => /\.map$|\.ts$|\.tsx$|^\.env/.test(f));
if (bad.length) { console.error("public audit failed:", bad); process.exit(1); }
console.log(`postbuild: 404.html and .nojekyll written, ${files.length} files audited in ${dir}`);
