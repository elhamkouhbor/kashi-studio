// Clean SVG export. Works on a DOM Document, so it runs in the browser and in tests (jsdom):
//   - physical size: width/height in mm or cm, viewBox in mm (1 user unit = 1 mm)
//   - named layers for Inkscape (inkscape:groupmode/label) and Illustrator (id)
//   - editor-only data removed, unused definitions removed, optional expansion of <use> copies
//   - scopes: the whole document, one tile (repeat unit), or a set of elements (selection)
export interface ExportOptions {
  scope: "document" | "tile" | "elements";
  /** For scope "elements": ids to keep, and their bounding box in mm. */
  ids?: string[];
  box?: { x: number; y: number; width: number; height: number };
  tile?: { w: number; h: number };
  units: "mm" | "cm";
  includeConstruction: boolean;
  includeReference: boolean;
  includeTileEdge: boolean;
  expandUses: boolean;
  title?: string;
  description?: string;
}

const SVGNS = "http://www.w3.org/2000/svg";
const XLINK = "http://www.w3.org/1999/xlink";
const INKSCAPE = "http://www.inkscape.org/namespaces/inkscape";

const slug = (s: string) => s.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").replace(/^(\d)/, "_$1").slice(0, 48) || "layer";
const fmt = (v: number) => String(Math.round(v * 1000) / 1000);

export function exportSvg(svgText: string, o: ExportOptions, parser: DOMParser = new DOMParser(), serializer: XMLSerializer = new XMLSerializer()): string {
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("The document could not be read for export.");
  const root = doc.documentElement;
  const W = Number(root.getAttribute("width")) || 200, H = Number(root.getAttribute("height")) || 200;

  // layers to drop
  const layers = [...root.children].filter((c) => c.getAttribute("class")?.split(/\s+/).includes("layer"));
  for (const l of layers) {
    const key = l.getAttribute("data-kashi-layer");
    const hidden = l.getAttribute("display") === "none";
    const keep = key === "construction" ? o.includeConstruction : key === "reference" ? o.includeReference : key === "tile" ? o.includeTileEdge : !hidden;
    if (!keep || (key !== "construction" && key !== "tile" && hidden)) l.remove();
    else if (key === "construction" || key === "tile") l.removeAttribute("display");
  }

  // expand live copies before anything is removed
  if (o.expandUses) expandUses(doc);

  // selection scope: keep only the chosen elements (and the groups that contain them)
  if (o.scope === "elements" && o.ids?.length) {
    const keep = new Set<Element>();
    for (const id of o.ids) {
      let el = doc.getElementById(id) as Element | null;
      if (!el) continue;
      for (const d of el.querySelectorAll("*")) keep.add(d);
      while (el && el !== root) { keep.add(el); el = el.parentElement; }
    }
    const refs = referencedIds(doc);
    const prune = (el: Element) => {
      for (const c of [...el.children]) {
        if (c.tagName === "defs" || c.tagName === "title" || c.tagName === "desc") continue;
        if (!keep.has(c)) { if (!(c.id && refs.has(c.id))) c.remove(); continue; }
        prune(c);
      }
    };
    prune(root);
  }

  // names: layers get Inkscape labels and ids, named groups get ids
  const used = new Set<string>();
  const unique = (base: string) => { let s = base, i = 2; while (used.has(s) || (doc.getElementById(s) && doc.getElementById(s)!.getAttribute("data-export-id") !== s)) s = `${base}-${i++}`; used.add(s); return s; };
  root.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:inkscape", INKSCAPE);
  for (const l of [...root.children].filter((c) => c.getAttribute("class")?.split(/\s+/).includes("layer"))) {
    const name = l.querySelector(":scope > title")?.textContent ?? "Layer";
    l.querySelector(":scope > title")?.remove();
    const id = unique(slug(name));
    l.setAttribute("id", id);
    l.setAttribute("data-export-id", id);
    l.setAttributeNS(INKSCAPE, "inkscape:groupmode", "layer");
    l.setAttributeNS(INKSCAPE, "inkscape:label", name);
    l.removeAttribute("class");
    l.removeAttribute("style");
    l.removeAttribute("data-locked");
  }
  for (const el of root.querySelectorAll("[data-name]")) {
    const name = el.getAttribute("data-name")!;
    el.setAttributeNS(INKSCAPE, "inkscape:label", name);
    if (el.tagName === "g") { const id = unique(slug(name)); if (!el.id || /^(svg_\d+|[gk][a-z0-9]{3,})$/.test(el.id)) { renameId(doc, el, id); } }
  }
  // remove editor data
  for (const el of [root, ...root.querySelectorAll("*")]) {
    for (const a of [...el.attributes]) {
      if (a.name.startsWith("data-") || a.name.startsWith("se:") || a.name === "xmlns:se" || a.name === "xmlns:oi" || a.name.startsWith("oi:")) el.removeAttribute(a.name);
    }
    if (el !== root && /^svg_\d+$/.test(el.id) && !referencedIds(doc).has(el.id)) el.removeAttribute("id");
  }
  removeUnusedDefs(doc);

  // geometry and physical size
  let vb = { x: 0, y: 0, w: W, h: H };
  if (o.scope === "tile" && o.tile) vb = { x: 0, y: 0, w: o.tile.w, h: o.tile.h };
  if (o.scope === "elements" && o.box) vb = { x: o.box.x, y: o.box.y, w: o.box.width, h: o.box.height };
  if (o.scope === "tile") {
    // clip everything to the tile so nothing spills over the artboard in other editors
    let defs = root.querySelector(":scope > defs");
    if (!defs) { defs = doc.createElementNS(SVGNS, "defs"); root.insertBefore(defs, root.firstChild); }
    const cp = doc.createElementNS(SVGNS, "clipPath");
    cp.setAttribute("id", unique("tile-clip"));
    const r = doc.createElementNS(SVGNS, "rect");
    for (const [k, v] of Object.entries({ x: vb.x, y: vb.y, width: vb.w, height: vb.h })) r.setAttribute(k, fmt(v));
    cp.appendChild(r);
    defs.appendChild(cp);
    const wrap = doc.createElementNS(SVGNS, "g");
    wrap.setAttribute("clip-path", `url(#${cp.id})`);
    for (const c of [...root.children]) if (c.tagName !== "defs" && c.tagName !== "title" && c.tagName !== "desc" && c.tagName !== "metadata") wrap.appendChild(c);
    root.appendChild(wrap);
  }
  const k = o.units === "cm" ? 0.1 : 1;
  root.setAttribute("width", `${fmt(vb.w * k)}${o.units}`);
  root.setAttribute("height", `${fmt(vb.h * k)}${o.units}`);
  root.setAttribute("viewBox", `${fmt(vb.x)} ${fmt(vb.y)} ${fmt(vb.w)} ${fmt(vb.h)}`);
  root.setAttribute("version", "1.1");
  root.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns", SVGNS);
  root.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", XLINK);
  for (const c of [...root.children]) if (c.tagName === "title" || c.tagName === "desc") c.remove();
  const desc = doc.createElementNS(SVGNS, "desc");
  desc.textContent = o.description ?? "Made with Kashi Studio by Elham Kouhbor. Units: millimetres.";
  root.insertBefore(desc, root.firstChild);
  const title = doc.createElementNS(SVGNS, "title");
  title.textContent = o.title ?? "Kashi Studio design";
  root.insertBefore(title, root.firstChild);
  // empty defs
  const d = root.querySelector(":scope > defs");
  if (d && !d.children.length) d.remove();
  for (const el of root.querySelectorAll("[data-export-id]")) el.removeAttribute("data-export-id");
  return `<?xml version="1.0" encoding="UTF-8"?>\n` + serializer.serializeToString(doc).replace(/ xmlns:se="[^"]*"/g, "");
}

function referencedIds(doc: Document): Set<string> {
  const ids = new Set<string>();
  for (const el of doc.querySelectorAll("*")) for (const a of el.attributes) {
    if (a.name === "href" || a.name === "xlink:href") { if (a.value.startsWith("#")) ids.add(a.value.slice(1)); continue; }
    for (const m of a.value.matchAll(/url\(#([^)]+)\)/g)) ids.add(m[1]);
  }
  return ids;
}

function renameId(doc: Document, el: Element, id: string) {
  const old = el.id;
  el.setAttribute("id", id);
  el.setAttribute("data-export-id", id);
  if (!old) return;
  for (const e of doc.querySelectorAll("*")) for (const a of [...e.attributes]) {
    if ((a.name === "href" || a.name === "xlink:href") && a.value === `#${old}`) e.setAttribute(a.name, `#${id}`);
    else if (a.value.includes(`url(#${old})`)) e.setAttribute(a.name, a.value.split(`url(#${old})`).join(`url(#${id})`));
  }
}

export function expandUses(doc: Document): number {
  let n = 0;
  for (let pass = 0; pass < 5; pass++) {
    const uses = [...doc.getElementsByTagName("use")];
    if (!uses.length) break;
    for (const u of uses) {
      const ref = (u.getAttribute("href") ?? u.getAttributeNS(XLINK, "href") ?? u.getAttribute("xlink:href") ?? "").replace(/^#/, "");
      const src = ref ? doc.getElementById(ref) : null;
      if (!src) { u.remove(); continue; }
      const g = doc.createElementNS(SVGNS, "g");
      const tr = [u.getAttribute("transform"), (u.getAttribute("x") || u.getAttribute("y")) ? `translate(${u.getAttribute("x") ?? 0} ${u.getAttribute("y") ?? 0})` : ""].filter(Boolean).join(" ");
      if (tr) g.setAttribute("transform", tr);
      for (const a of ["data-name", "fill", "stroke", "opacity"]) { const v = u.getAttribute(a); if (v) g.setAttribute(a, v); }
      const clone = (src.tagName === "symbol" ? [...src.childNodes] : [src]).map((c) => c.cloneNode(true) as Element);
      for (const c of clone) { if (c.nodeType === 1) { c.removeAttribute?.("id"); for (const e of c.querySelectorAll?.("[id]") ?? []) e.removeAttribute("id"); } g.appendChild(c); }
      u.parentNode!.replaceChild(g, u);
      n++;
    }
  }
  return n;
}

function removeUnusedDefs(doc: Document) {
  const defs = doc.documentElement.querySelector(":scope > defs");
  if (!defs) return;
  for (let pass = 0; pass < 3; pass++) {
    const refs = referencedIds(doc);
    for (const c of [...defs.children]) if (c.id && !refs.has(c.id)) c.remove();
  }
}

/** File name from a title. */
export const fileName = (title: string, ext: string) => `${(title || "kashi-design").normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "kashi-design"}.${ext}`;
