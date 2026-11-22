// Haft-rang (هفت‌رنگ) panels: painted cuerda seca tile fields. A haft-rang panel is a single painting
// spread over many square tiles: a framed field of eslimi scrolls and khatai flowers, often with a
// central medallion and corner quarters. Here the painting is built from the floral generators and the
// tile joints are drawn as a separate layer, so the composition can be checked tile by tile.
import { Path } from "../geometry/path";
import { translate } from "../geometry/vec";
import { g, path, rect, withTransform, type SvgNode } from "../ornament/node";
import { bool, num, str, type Generator } from "./types";
import { eslimiTile, khataiTile, medallion } from "./floral";
import { borderGenerator } from "./border";

export const haftrangPanel: Generator = {
  id: "haftrang-panel",
  family: "haftrang",
  name: "Haft-rang panel",
  nameFa: "تابلوی هفت‌رنگ",
  params: [
    { key: "tilesX", label: "Tiles across", type: "int", min: 2, max: 12 },
    { key: "tilesY", label: "Tiles down", type: "int", min: 2, max: 16 },
    { key: "tile", label: "Tile size", type: "range", min: 100, max: 250, step: 1, unit: "mm" },
    { key: "field", label: "Field", type: "select", options: [{ value: "eslimi", label: "Eslimi scrolls" }, { value: "khatai", label: "Khatai flowers" }] },
    { key: "medallion", label: "Central medallion", type: "select", options: [{ value: "shamse", label: "Round (shamse)" }, { value: "toranj", label: "Oval (toranj)" }, { value: "none", label: "None" }] },
    { key: "border", label: "Border", type: "select", options: [{ value: "flowers", label: "Flowers and buds" }, { value: "scroll", label: "Scroll" }, { value: "guilloche", label: "Guilloche" }, { value: "none", label: "None" }] },
    { key: "joints", label: "Show tile joints", type: "bool" },
  ],
  defaults: { tilesX: 4, tilesY: 4, tile: 150, field: "eslimi", medallion: "shamse", border: "flowers", joints: true },
  size: (p) => ({ w: num(p, "tilesX") * num(p, "tile"), h: num(p, "tilesY") * num(p, "tile") }),
  build(p, ctx) {
    const T = num(p, "tile"), W = num(p, "tilesX") * T, H = num(p, "tilesY") * T, pal = ctx.palette;
    const B = str(p, "border") === "none" ? 0 : T * 0.5;
    const parts: SvgNode[] = [rect(0, 0, W, H, { fill: pal.ground, "data-name": "Ground" })];
    const defs: SvgNode[] = [];
    // field: the floral tile repeated at a size that divides the field into whole motifs
    const gen = str(p, "field") === "khatai" ? khataiTile : eslimiTile;
    const fw = W - 2 * B, fh = H - 2 * B;
    const n = Math.max(1, Math.round(fw / (T * 1.5)));
    const unit = fw / n;
    const r = gen.build({ ...gen.defaults, size: unit }, { ...ctx, uid: ctx.uid + "-f" });
    defs.push(...(r.defs ?? []), { tag: "clipPath", attrs: { id: `${ctx.uid}-field` }, children: [rect(B, B, fw, fh)] });
    const copies: SvgNode[] = [];
    for (let y = 0; y < fh; y += unit) for (let x = 0; x < fw; x += unit) copies.push(withTransform(r.art, translate(B + x, B + y)));
    parts.push(g("Field", copies, { "clip-path": `url(#${ctx.uid}-field)` }));
    if (str(p, "medallion") !== "none") {
      const ms = Math.min(fw, fh) * 0.62;
      const mp = { ...medallion.defaults, size: ms, shape: str(p, "medallion"), corners: false };
      const m = medallion.build(mp, { ...ctx, uid: ctx.uid + "-m" });
      const { w: mw, h: mh } = medallion.size(mp);
      // only the medallion itself, not its square ground
      const orn = (m.art.children ?? []).find((c) => c.attrs?.["data-name"] === "Ornament");
      if (orn) parts.push(withTransform({ ...orn, attrs: { ...orn.attrs, "clip-path": undefined, "data-name": "Medallion" } }, translate(W / 2 - mw / 2, H / 2 - mh / 2)));
    }
    if (B) parts.push(borderGenerator.build({ ...borderGenerator.defaults, width: W, height: H, band: B, motif: str(p, "border"), unit: 1.4 }, { ...ctx, uid: ctx.uid + "-b" }).art);
    if (bool(p, "joints")) {
      const j = new Path();
      for (let x = T; x < W - 1e-6; x += T) j.M([x, 0]).L([x, H]);
      for (let y = T; y < H - 1e-6; y += T) j.M([0, y]).L([W, y]);
      parts.push(path(j, { fill: "none", stroke: "#ffffff", "stroke-opacity": 0.55, "stroke-width": 0.8, "data-name": "Tile joints", "data-kashi-role": "joints" }));
    }
    return { art: g("Haft-rang panel", parts), defs };
  },
};
