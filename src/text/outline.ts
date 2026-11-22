// Persian and Arabic text to vector outlines with correct shaping. HarfBuzz (harfbuzzjs, loaded on demand)
// performs the full Arabic-script shaping: contextual joining forms, ligatures, marks and right-to-left
// ordering. The glyph outlines then become one SVG path in millimetres.
import vazir400 from "@fontsource/vazirmatn/files/vazirmatn-arabic-400-normal.woff?url";
import vazir700 from "@fontsource/vazirmatn/files/vazirmatn-arabic-700-normal.woff?url";
import naskh400 from "@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-400-normal.woff?url";
import naskh700 from "@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-700-normal.woff?url";
import { getEditor, toast } from "../state/store";

const FONT_URLS: Record<string, Record<number, string>> = { Vazirmatn: { 400: vazir400, 700: vazir700 }, "Noto Naskh Arabic": { 400: naskh400, 700: naskh700 } };
const cache = new Map<string, Uint8Array>();

/** WOFF 1.0 to a plain sfnt (TrueType/OpenType) font, so HarfBuzz can read it. */
export async function woffToSfnt(buf: ArrayBuffer, inflate: (b: Uint8Array) => Promise<Uint8Array> = inflateZlib): Promise<Uint8Array> {
  const v = new DataView(buf);
  if (v.getUint32(0) !== 0x774f4646) return new Uint8Array(buf); // not WOFF: already sfnt
  const flavor = v.getUint32(4), numTables = v.getUint16(12);
  const tables: { tag: number; offset: number; comp: number; orig: number; checksum: number }[] = [];
  for (let i = 0; i < numTables; i++) {
    const o = 44 + i * 20;
    tables.push({ tag: v.getUint32(o), offset: v.getUint32(o + 4), comp: v.getUint32(o + 8), orig: v.getUint32(o + 12), checksum: v.getUint32(o + 16) });
  }
  const datas = await Promise.all(tables.map(async (t) => {
    const raw = new Uint8Array(buf, t.offset, t.comp);
    return t.comp < t.orig ? await inflate(raw) : raw.slice();
  }));
  let size = 12 + 16 * numTables;
  for (const d of datas) size += (d.length + 3) & ~3;
  const out = new Uint8Array(size), ov = new DataView(out.buffer);
  let es = 0; while ((1 << (es + 1)) <= numTables) es++;
  const sr = (1 << es) * 16;
  ov.setUint32(0, flavor); ov.setUint16(4, numTables); ov.setUint16(6, sr); ov.setUint16(8, es); ov.setUint16(10, numTables * 16 - sr);
  let off = 12 + 16 * numTables;
  tables.forEach((t, i) => {
    const o = 12 + i * 16;
    ov.setUint32(o, t.tag); ov.setUint32(o + 4, t.checksum); ov.setUint32(o + 8, off); ov.setUint32(o + 12, datas[i].length);
    out.set(datas[i], off);
    off += (datas[i].length + 3) & ~3;
  });
  return out;
}

async function inflateZlib(b: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate");
  const res = new Response(new Blob([b]).stream().pipeThrough(ds));
  return new Uint8Array(await res.arrayBuffer());
}

async function fontData(family: string, weight: number): Promise<Uint8Array> {
  const url = FONT_URLS[family]?.[weight >= 600 ? 700 : 400] ?? FONT_URLS.Vazirmatn[400];
  if (cache.has(url)) return cache.get(url)!;
  const sfnt = await woffToSfnt(await (await fetch(url)).arrayBuffer());
  cache.set(url, sfnt);
  return sfnt;
}

/** Shape text and return its outline as one path (mm), baseline at y = 0, starting at x = 0. */
export async function textToPath(text: string, family: string, weight: number, sizeMm: number): Promise<{ d: string; width: number; ascent: number }> {
  const hb = await import("harfbuzzjs");
  const data = await fontData(family, weight);
  const blob = new hb.Blob(data), face = new hb.Face(blob, 0), font = new hb.Font(face);
  const buffer = new hb.Buffer();
  buffer.addText(text);
  buffer.guessSegmentProperties();
  hb.shape(font, buffer);
  const infos = buffer.getGlyphInfos(), pos = buffer.getGlyphPositions();
  const k = sizeMm / face.upem;
  let x = 0;
  const parts: string[] = [];
  infos.forEach((g, i) => {
    const p = pos[i];
    const raw = font.glyphToPath(g.codepoint);
    if (raw) parts.push(transformPath(raw, k, x + p.xOffset * k, -p.yOffset * k));
    x += p.xAdvance * k;
  });
  const d = parts.join("");
  if (!d) throw new Error("The font has no outlines for this text.");
  return { d, width: x, ascent: sizeMm * 0.8 };
}

/** Scale glyph path data (font units, y up) into mm (y down) and offset it. */
export function transformPath(d: string, k: number, dx: number, dy: number): string {
  return d.replace(/([MLQCZ])([^MLQCZ]*)/g, (_m, cmd: string, args: string) => {
    const n = args.trim() ? args.trim().split(/[\s,]+/).map(Number) : [];
    const out: string[] = [];
    for (let i = 0; i + 1 < n.length; i += 2) out.push(`${r(n[i] * k + dx)} ${r(-n[i + 1] * k + dy)}`);
    return cmd + out.join(" ");
  });
}
const r = (v: number) => String(Math.round(v * 1000) / 1000);

/** Replace the selected <text> elements by their outlines, keeping position, size and colour. */
export async function convertSelectedText() {
  const ed = getEditor();
  if (!ed) return;
  const texts = ed.selected().filter((e) => e.tagName === "text") as SVGTextElement[];
  if (!texts.length) throw new Error("Select a text first.");
  for (const t of texts) {
    const fam = /Naskh/i.test(t.getAttribute("font-family") ?? "") ? "Noto Naskh Arabic" : "Vazirmatn";
    const size = Number(t.getAttribute("font-size")) || 12;
    const weight = Number(t.getAttribute("font-weight")) || 400;
    const res = await textToPath(t.textContent ?? "", fam, weight, size);
    const bb = t.getBBox();
    const anchor = t.getAttribute("text-anchor");
    const x0 = anchor === "middle" ? bb.x + bb.width / 2 - res.width / 2 : anchor === "end" ? bb.x + bb.width - res.width : bb.x;
    const y0 = bb.y + bb.height * 0.72;
    const tr = [t.getAttribute("transform"), `translate(${r(x0)} ${r(y0)})`].filter(Boolean).join(" ");
    ed.canvas.selectOnly([t]);
    ed.remove();
    ed.insertNode({ tag: "path", attrs: { d: res.d, fill: t.getAttribute("fill") ?? "#000", transform: tr, "data-name": `Text outlines: ${t.textContent}` } }, [], "ornament");
  }
  toast("Text converted to outlines.");
}
