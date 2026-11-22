// Imported SVG is untrusted. Before anything reaches the editor it is parsed as XML (no DOCTYPE or
// entities), stripped of scripts, event handlers, foreign content, external references and active
// styles by DOMPurify's SVG profile plus explicit checks, and limited in size.
import DOMPurify from "dompurify";

export const MAX_SVG_BYTES = 25 * 1024 * 1024;
const SAFE_HREF = /^(#[\w.:-]+|data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=\s]+)$/i;

export class ImportError extends Error {}

export function sanitizeSvg(text: string, win: Window & typeof globalThis = window): { svg: string; removed: string[] } {
  if (text.length > MAX_SVG_BYTES) throw new ImportError("This SVG is larger than 25 MB.");
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new ImportError("SVG files with a DOCTYPE or entities are not accepted.");
  // well-formed XML first: a broken file is rejected, not repaired into something unexpected
  const probe = new win.DOMParser().parseFromString(text, "image/svg+xml");
  if (probe.getElementsByTagName("parsererror").length || probe.documentElement?.localName !== "svg") throw new ImportError("This SVG file is not well-formed and could not be read.");
  const removed: string[] = [];
  const purify = DOMPurify(win);
  purify.addHook("uponSanitizeElement", (node, data) => {
    if (["script", "foreignObject", "iframe", "object", "embed", "audio", "video", "animate", "set", "animateMotion", "animateTransform", "handler", "listener"].includes(data.tagName)) removed.push(data.tagName);
    void node;
  });
  purify.addHook("afterSanitizeAttributes", (node) => {
    for (const a of ["href", "xlink:href"]) {
      const v = node.getAttribute(a);
      if (v !== null && !SAFE_HREF.test(v.trim())) { node.removeAttribute(a); removed.push(`${a}="${v.slice(0, 40)}"`); }
    }
    const style = node.getAttribute("style");
    if (style && /url\s*\(\s*['"]?(?!#)|expression|@import|javascript:/i.test(style)) { node.removeAttribute("style"); removed.push("style with external reference"); }
    if (node.nodeName.toLowerCase() === "style" && /@import|url\s*\(\s*['"]?(?!#)/i.test(node.textContent ?? "")) { node.textContent = ""; removed.push("<style> with external reference"); }
  });
  const clean = purify.sanitize(text, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["use", "symbol", "title", "desc", "metadata"],
    ADD_ATTR: ["xlink:href", "href", "data-name", "data-kashi-gen", "data-kashi-params", "data-kashi-palette", "data-kashi-uid", "data-kashi-layer", "data-kashi-sym", "data-locked", "inkscape:label", "inkscape:groupmode"],
    FORBID_TAGS: ["script", "foreignObject", "iframe", "animate", "set", "animateMotion", "animateTransform"],
    FORBID_ATTR: ["onload", "onclick", "onerror", "onmouseover", "onfocus", "onbegin", "onend"],
    WHOLE_DOCUMENT: false,
    RETURN_TRUSTED_TYPE: false,
  }) as string;
  purify.removeAllHooks();
  if (!/<svg[\s>]/i.test(clean)) throw new ImportError("No SVG content was found in this file.");
  // DOMPurify keeps prefixed attributes (inkscape:label) but drops their namespace declarations:
  // declare the known ones again, and drop any other prefixed attribute, so the result is valid XML
  let out = clean;
  const NS: Record<string, string> = { inkscape: "http://www.inkscape.org/namespaces/inkscape", sodipodi: "http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd", xlink: "http://www.w3.org/1999/xlink" };
  for (const [prefix, uri] of Object.entries(NS)) {
    if (new RegExp(`\\s${prefix}:[\\w-]+=`).test(out) && !new RegExp(`xmlns:${prefix}=`).test(out)) out = out.replace(/<svg\b/, `<svg xmlns:${prefix}="${uri}"`);
  }
  out = out.replace(/\s(?!xlink:|xml:|xmlns:|inkscape:|sodipodi:)[A-Za-z_][\w.-]*:[\w.-]+="[^"]*"/g, "");
  if (new win.DOMParser().parseFromString(out, "image/svg+xml").getElementsByTagName("parsererror").length) throw new ImportError("This SVG could not be cleaned into valid SVG.");
  return { svg: out, removed };
}

/** Physical size of an SVG in mm from width/height (units) or the viewBox at 96 px per inch. */
export function svgSizeMm(svgEl: Element): { w: number; h: number; scale: number } {
  const vb = (svgEl.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  const toMm = (v: string | null, fallback: number): number => {
    if (!v) return fallback;
    const m = /^([\d.]+)\s*(mm|cm|in|pt|pc|px)?$/.exec(v.trim());
    if (!m) return fallback;
    const n = Number(m[1]);
    return { mm: n, cm: n * 10, in: n * 25.4, pt: (n * 25.4) / 72, pc: (n * 25.4) / 6, px: (n * 25.4) / 96 }[m[2] ?? "px"] ?? (n * 25.4) / 96;
  };
  const vbw = vb.length === 4 && vb[2] > 0 ? vb[2] : 0, vbh = vb.length === 4 && vb[3] > 0 ? vb[3] : 0;
  const w = toMm(svgEl.getAttribute("width"), vbw * (25.4 / 96) || 200);
  const h = toMm(svgEl.getAttribute("height"), vbh * (25.4 / 96) || 200);
  return { w, h, scale: vbw ? w / vbw : 25.4 / 96 };
}
