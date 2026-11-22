// Calligraphic ornament: the user's own Persian or Arabic text set in a band, a cartouche or a medallion.
// The text stays live (editable) until it is converted to outlines with HarfBuzz shaping (src/text).
// No inscription is supplied: the default word is "کاشی" (tile), and religious or historical texts are
// never invented.
import { Path } from "../geometry/path";
import { type Pt } from "../geometry/vec";
import { lobed } from "./floral";
import { g, path, rect, type SvgNode } from "../ornament/node";
import { num, str, type Generator } from "./types";

export const FONTS = [
  { value: "Vazirmatn", label: "Vazirmatn (modern naskh-style sans)" },
  { value: "Noto Naskh Arabic", label: "Noto Naskh Arabic (naskh)" },
];

export const calligraphyGenerator: Generator = {
  id: "calligraphy",
  family: "calligraphy",
  name: "Inscription and calligraphy",
  nameFa: "کتیبه و خط",
  params: [
    { key: "text", label: "Text (your own)", type: "text", rtl: true },
    { key: "frame", label: "Frame", type: "select", options: [{ value: "band", label: "Band" }, { value: "cartouche", label: "Cartouche (lobed)" }, { value: "medallion", label: "Round medallion" }] },
    { key: "font", label: "Font", type: "select", options: FONTS },
    { key: "width", label: "Width", type: "range", min: 60, max: 2000, step: 1, unit: "mm" },
    { key: "size", label: "Letter size", type: "range", min: 4, max: 300, step: 0.5, unit: "mm" },
    { key: "weight", label: "Weight", type: "range", min: 300, max: 900, step: 100 },
  ],
  defaults: { text: "کاشی", frame: "cartouche", font: "Vazirmatn", width: 240, size: 48, weight: 700 },
  size: (p) => { const w = num(p, "width"); const f = str(p, "frame"); return { w, h: f === "band" ? w * 0.22 : f === "medallion" ? w : w * 0.5 }; },
  build(p, ctx) {
    const pal = ctx.palette, W = num(p, "width"), f = str(p, "frame");
    const H = f === "band" ? W * 0.22 : f === "medallion" ? W : W * 0.5;
    const c: Pt = [W / 2, H / 2];
    const parts: SvgNode[] = [rect(0, 0, W, H, { fill: pal.ground, "data-name": "Ground" })];
    if (f === "cartouche") parts.push(path(lobed(c, W * 0.47, H * 0.44, 14, 0.04), { fill: pal.colors[0], stroke: pal.line, "stroke-width": W * 0.006, "data-name": "Cartouche" }));
    else if (f === "medallion") parts.push(path(lobed(c, W * 0.46, W * 0.46, 16, 0.05), { fill: pal.colors[0], stroke: pal.line, "stroke-width": W * 0.006, "data-name": "Medallion" }));
    else parts.push(path(new Path().M([0, H * 0.06]).L([W, H * 0.06]).M([0, H * 0.94]).L([W, H * 0.94]), { fill: "none", stroke: pal.colors[0], "stroke-width": H * 0.05, "data-name": "Band rules" }));
    const fill = f === "band" ? pal.colors[0] : pal.ground;
    parts.push({
      tag: "text",
      attrs: { x: c[0], y: c[1], "font-family": `${str(p, "font")}, serif`, "font-size": num(p, "size"), "font-weight": num(p, "weight"), "text-anchor": "middle", "dominant-baseline": "central", fill, "data-name": "Inscription (live text)", "xml:space": "preserve" },
      text: String(p.text ?? ""),
    });
    return { art: g("Inscription", parts) };
  },
};
