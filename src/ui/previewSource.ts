// The tile as a standalone SVG image for previews (copies expanded, guides and references left out).
import { exportSvg } from "../export/svg";
import { getEditor } from "../state/store";

export function tileImageUrl(): { url: string; w: number; h: number } | null {
  const ed = getEditor();
  if (!ed) return null;
  const svg = exportSvg(ed.svgString(), { scope: "tile", units: "mm", includeConstruction: false, includeReference: false, includeTileEdge: false, expandUses: true, tile: ed.meta.tile });
  return { url: URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), w: ed.meta.tile.w, h: ed.meta.tile.h };
}

/** Compare opposite edges of the tile, rendered at a modest resolution. Returns the share of edge pixels that differ. */
export async function seamCheck(url: string, w: number, h: number): Promise<{ x: number; y: number }> {
  const k = 480 / Math.max(w, h), W = Math.max(8, Math.round(w * k)), H = Math.max(8, Math.round(h * k));
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("render")); img.src = url; });
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data;
  const at = (x: number, y: number) => (y * W + x) * 4;
  const differs = (a: number, b: number) => Math.abs(px[a] - px[b]) + Math.abs(px[a + 1] - px[b + 1]) + Math.abs(px[a + 2] - px[b + 2]) > 90;
  let dx = 0, dy = 0;
  // the last column continues into the first column of the next tile (one pixel apart)
  for (let y = 0; y < H; y++) if (differs(at(0, y), at(W - 1, y)) && differs(at(1, y), at(W - 2, y))) dx++;
  for (let x = 0; x < W; x++) if (differs(at(x, 0), at(x, H - 1)) && differs(at(x, 1), at(x, H - 2))) dy++;
  return { x: dx / H, y: dy / W };
}
