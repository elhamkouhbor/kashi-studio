// Builds library thumbnails off the main thread: runs the design's generator and returns plain SVG.
import { designById } from "./designs";
import { generate } from "../editor/document";
import { serialize } from "../ornament/node";

self.onmessage = (e: MessageEvent<{ id: string }>) => {
  const d = designById(e.data.id);
  if (!d) return;
  try {
    const part = generate(d.gen, d.params, d.palette, "t" + d.id.replace(/\W/g, ""));
    const { w, h } = part.size;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${Math.round(w)}" height="${Math.round(h)}"><defs>${part.defs.map((x) => serialize(x, -1)).join("")}</defs>${serialize(part.node, -1)}</svg>`;
    (self as unknown as Worker).postMessage({ id: d.id, svg });
  } catch (err) {
    (self as unknown as Worker).postMessage({ id: d.id, error: String(err) });
  }
};
