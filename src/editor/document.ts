// The Kashi document: one SVG in millimetres (1 user unit = 1 mm) with four named layers. Reference images
// and construction lines are kept apart from the ornament and the tile edge, so each can be hidden,
// locked or exported on its own.
import { GENERATORS } from "../generators";
import type { Params } from "../generators/types";
import { paletteById } from "../color/palettes";
import { serialize, type SvgNode } from "../ornament/node";

export const LAYERS = {
  reference: "Reference",
  construction: "Construction",
  ornament: "Ornament",
  tile: "Tile edge",
} as const;
export type LayerKey = keyof typeof LAYERS;

export interface DocMeta {
  /** Document (artboard) size in mm. */
  w: number;
  h: number;
  /** Repeat unit (the tile) in mm, from the top left corner. */
  tile: { w: number; h: number };
  units: "mm" | "cm";
  /** Guides in mm. */
  guides: { x: number[]; y: number[] };
  /** Library design this document started from. */
  designId?: string;
  referenceId?: string;
}

export const defaultMeta = (w = 200, h = 200): DocMeta => ({ w, h, tile: { w, h }, units: "mm", guides: { x: [], y: [] } });

let uidCounter = 0;
export const newUid = (prefix = "k") => `${prefix}${Date.now().toString(36).slice(-4)}${(uidCounter++).toString(36)}`;

export interface GeneratedPart { node: SvgNode; defs: SvgNode[]; guides?: SvgNode; size: { w: number; h: number } }

/** Run a generator and wrap the result in a group that remembers how it was made. */
export function generate(genId: string, params: Params, paletteId: string, uid = newUid("g")): GeneratedPart {
  const G = GENERATORS[genId];
  if (!G) throw new Error(`Unknown generator ${genId}`);
  const p = { ...G.defaults, ...params };
  const r = G.build(p, { palette: paletteById(paletteId), uid });
  const size = G.size(p);
  const node: SvgNode = {
    tag: "g",
    attrs: { ...r.art.attrs, id: uid, "data-name": r.art.attrs?.["data-name"] ?? G.name, "data-kashi-gen": genId, "data-kashi-params": JSON.stringify(p), "data-kashi-palette": paletteId, "data-kashi-uid": uid },
    children: r.art.children,
  };
  return { node, defs: r.defs ?? [], guides: r.guides, size };
}

/** A complete document SVG for a generated design, sized to its tile. */
export function documentFor(genId: string, params: Params, paletteId: string): { svg: string; meta: DocMeta } {
  const part = generate(genId, params, paletteId);
  const { w, h } = part.size;
  const meta = defaultMeta(round(w), round(h));
  return { svg: documentSvg(meta, [part.node], part.defs, part.guides ? [part.guides] : []), meta };
}

export function documentSvg(meta: DocMeta, ornament: SvgNode[], defs: SvgNode[] = [], construction: SvgNode[] = [], reference: SvgNode[] = []): string {
  const layer = (key: LayerKey, children: SvgNode[], extra: Record<string, string> = {}): SvgNode => ({
    tag: "g",
    attrs: { class: "layer", "data-kashi-layer": key, ...extra },
    children: [{ tag: "title", text: LAYERS[key] }, ...children],
  });
  const tileEdge: SvgNode = { tag: "rect", attrs: { x: 0, y: 0, width: round(meta.tile.w), height: round(meta.tile.h), fill: "none", stroke: "#c0392b", "stroke-width": 0.3, "stroke-dasharray": "3 2", "data-name": "Tile boundary" } };
  const root: SvgNode = {
    tag: "svg",
    attrs: { xmlns: "http://www.w3.org/2000/svg", "xmlns:xlink": "http://www.w3.org/1999/xlink", width: round(meta.w), height: round(meta.h), viewBox: `0 0 ${round(meta.w)} ${round(meta.h)}` },
    children: [
      { tag: "defs", children: defs },
      layer("reference", reference, { "data-locked": "1", style: "pointer-events:none" }),
      layer("construction", construction, { display: "none" }),
      layer("ornament", ornament),
      layer("tile", [tileEdge], { display: "none" }),
    ],
  };
  return serialize(root, 0).trim();
}

export const round = (v: number, d = 3) => Math.round(v * 10 ** d) / 10 ** d;
