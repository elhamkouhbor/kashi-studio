import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const stub = (f: string) => fileURLToPath(new URL(`./src/editor/stubs/${f}`, import.meta.url));

export default defineConfig({
  plugins: [react()],
  // "/" locally; "/kashi-studio/" for GitHub Pages (npm run build:pages)
  base: process.env.KASHI_BASE || "/",
  server: { port: 5200 },
  preview: { port: 5201 },
  resolve: {
    // svgcanvas imports jsPDF and svg2pdf for PDF export, which Kashi Studio does not offer
    alias: { jspdf: stub("jspdf.js"), "svg2pdf.js": stub("svg2pdf.js") },
  },
  // harfbuzzjs uses top-level await to load its WebAssembly
  optimizeDeps: { exclude: ["harfbuzzjs"], esbuildOptions: { target: "es2022" } },
  build: { sourcemap: false, target: "es2022", chunkSizeWarningLimit: 900 },
  worker: { format: "es" },
});
