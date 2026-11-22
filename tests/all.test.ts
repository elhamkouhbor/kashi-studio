import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { JSDOM } from "jsdom";
import { Resvg } from "@resvg/resvg-js";
import { Path, smoothThrough } from "../src/geometry/path";
import { rotateM, reflectM, apply, matMul, polygonArea, fmt, type Pt, dist } from "../src/geometry/vec";
import { faces, clipPolygon, clipPolyline } from "../src/geometry/planar";
import { SYSTEMS, GIRIH_TILES, girihTile } from "../src/geometry/girih/systems";
import { buildGirih, girihSize } from "../src/geometry/girih/pattern";
import { motif, LATTICES, rectPeriod } from "../src/geometry/girih/hankin";
import { GENERATORS } from "../src/generators";
import { DESIGNS } from "../src/library/designs";
import { REFERENCES } from "../src/library/references";
import { PALETTES, paletteById } from "../src/color/palettes";
import { symmetric, type Shape } from "../src/ornament/shapes";
import { starOutline, crossOutline } from "../src/generators/lustre";
import { borderUnit } from "../src/generators/border";
import { documentFor, generate } from "../src/editor/document";
import { serialize, countLeaves } from "../src/ornament/node";
import { exportSvg, expandUses } from "../src/export/svg";
import { sanitizeSvg, svgSizeMm, ImportError } from "../src/io/sanitize";
import { projectFile, readProjectFile, putProject, listProjects, deleteProject, getProject } from "../src/storage/db";
import { woffToSfnt, transformPath } from "../src/text/outline";
import { COVERAGE } from "../src/library/coverage";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
const win = dom.window as unknown as Window & typeof globalThis;
const parser = new win.DOMParser(), ser = new win.XMLSerializer();
const near = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) <= tol;

// ------------------------------------------------------------------ geometry
test("affine transforms: rotation and reflection", () => {
  const p = apply(rotateM(Math.PI / 2, [1, 1]), [2, 1]);
  assert.ok(near(p[0], 1) && near(p[1], 2));
  const q = apply(reflectM(0, [0, 3]), [5, 1]);
  assert.ok(near(q[0], 5) && near(q[1], 5));
  const m = matMul(reflectM(Math.PI / 4), reflectM(Math.PI / 4));
  assert.ok(m.every((v, i) => near(v, [1, 0, 0, 1, 0, 0][i], 1e-12)), "two reflections are the identity");
  assert.equal(fmt(-0.00001), "0");
  assert.equal(fmt(1.23456), "1.235");
});

test("cubic circle stays within 0.03% of the radius", () => {
  const pts = Path.circle([10, 10], 50).flatten(64)[0];
  for (const p of pts) assert.ok(Math.abs(dist(p, [10, 10]) - 50) < 50 * 3e-4);
});

test("smooth curves pass through their points", () => {
  const pts: Pt[] = [[0, 0], [10, 5], [20, -3], [30, 8]];
  const p = smoothThrough(pts);
  const ends = p.segs.filter((s) => s.k !== "Z").map((s) => (s as { p: Pt }).p);
  pts.forEach((q, i) => assert.ok(near(ends[i][0], q[0]) && near(ends[i][1], q[1])));
});

test("planar faces of a square with its diagonals", () => {
  const s: [Pt, Pt][] = [[[0, 0], [10, 0]], [[10, 0], [10, 10]], [[10, 10], [0, 10]], [[0, 10], [0, 0]], [[0, 0], [10, 10]], [[10, 0], [0, 10]]];
  const f = faces(s);
  assert.equal(f.length, 4);
  assert.ok(near(f.reduce((a, x) => a + Math.abs(polygonArea(x)), 0), 100));
});

test("clipping polygons and polylines to a rectangle", () => {
  const c = clipPolygon([[-5, -5], [5, -5], [5, 5], [-5, 5]], 0, 0, 10, 10);
  assert.ok(near(Math.abs(polygonArea(c)), 25));
  const runs = clipPolyline([[-5, 5], [15, 5], [15, 20]], 0, 0, 10, 10);
  assert.equal(runs.length, 1);
  assert.ok(near(runs[0][0][0], 0) && near(runs[0][1][0], 10));
});

// ------------------------------------------------------------------ girih
test("girih tiles close and have the documented angles", () => {
  for (const [k, def] of Object.entries(GIRIH_TILES)) {
    const t = girihTile(k);
    assert.equal(t.v.length, def.angles.length, k);
    for (let i = 0; i < t.v.length; i++) assert.ok(near(dist(t.v[i], t.v[(i + 1) % t.v.length]), 1, 1e-9), `${k} edge ${i}`);
    assert.ok(near(def.angles.reduce((a, b) => a + b, 0), (def.angles.length - 2) * 180), `${k} angle sum`);
  }
});

test("Hankin on the decagon at 54° gives a regular 10-pointed star", () => {
  const dec = { ...girihTile("decagon"), kind: "regular-10" };
  const m = motif(dec, 54, 0);
  assert.equal(m.segs.length, 20);
  const c = dec.c;
  const tips = m.star.filter((_, i) => i % 2 === 1).map((p) => dist(p, c));
  assert.ok(tips.every((r) => near(r, tips[0], 1e-9)), "all star points at the same radius");
});

test("lattices have rectangular periods", () => {
  for (const [k, L] of Object.entries(LATTICES)) { const p = rectPeriod(L); assert.ok(p.w > 0 && p.h > 0, k); }
});

for (const key of Object.keys(SYSTEMS)) for (const gap of [0, 0.12]) {
  test(`girih ${key}, gap ${gap}: pieces cover the tile and lines continue across every edge`, () => {
    const g = buildGirih({ system: key, angle: SYSTEMS[key].angle, gap, width: 100, cols: key === "decagonal" ? 1 : 2, rows: key === "decagonal" ? 1 : 2, centred: false });
    const area = g.pieces.reduce((a, p) => a + Math.abs(polygonArea(p.pts)), 0);
    assert.ok(Math.abs(area - g.w * g.h) / (g.w * g.h) < 1e-6, `pieces cover the tile (${area.toFixed(3)} of ${(g.w * g.h).toFixed(3)})`);
    // every line that leaves through one edge comes back through the opposite edge at the same place
    const ends = (pred: (p: Pt) => boolean, coord: 0 | 1) => g.strands.flatMap((r) => [r[0], r[r.length - 1]]).filter(pred).map((p) => Math.round(p[coord] * 1e4)).sort((a, b) => a - b);
    const L = ends((p) => near(p[0], 0, 1e-7), 1), R = ends((p) => near(p[0], g.w, 1e-7), 1);
    const T = ends((p) => near(p[1], 0, 1e-7), 0), B = ends((p) => near(p[1], g.h, 1e-7), 0);
    assert.deepEqual([...new Set(L)], [...new Set(R)], "left and right edges meet");
    assert.deepEqual([...new Set(T)], [...new Set(B)], "top and bottom edges meet");
  });
}

test("the over/under weave repeats with the tile in every system", () => {
  for (const key of Object.keys(SYSTEMS)) for (const gap of [0, 0.1]) for (const [c, r] of [[1, 1], [2, 1]]) {
    const g = buildGirih({ system: key, angle: SYSTEMS[key].angle, gap, width: 100 * c, cols: c, rows: r, centred: false });
    // ten-fold girih with doubled lines has no consistent alternation at all: it is detected and drawn as strapwork
    if (key === "decagonal" && gap > 0) { assert.equal(g.weaveConsistent, false); continue; }
    assert.ok(g.weaveSeamless, `${key} gap ${gap} ${c}x${r}`);
  }
  const r = GENERATORS.girih.build({ ...GENERATORS.girih.defaults, gap: 0.1, style: "interlace" }, { palette: PALETTES[0], uid: "w" });
  assert.equal(r.info?.interlaceFallback, true);
});

test("girih tile size follows the rectangular period", () => {
  const s = girihSize({ system: "6.6.6", width: 120, cols: 2, rows: 3 });
  assert.ok(near(s.h / s.w, (3 * SYSTEMS["6.6.6"].period.h) / (2 * SYSTEMS["6.6.6"].period.w)));
});

test("star and cross tiles fill the plane exactly", () => {
  const a = 100;
  const star = Math.abs(polygonArea(starOutline([a / 2, a / 2], a / 2)));
  const cross = Math.abs(polygonArea(crossOutline([0, 0], a)));
  assert.ok(near(star + cross, a * a, 1e-6), `${star} + ${cross}`);
});

// ------------------------------------------------------------------ symmetry and repetition
test("dihedral symmetry: 8 rotations with mirrors give 16 congruent copies", () => {
  const leaf: Shape = { d: Path.poly([[50, 40], [60, 20], [55, 10]]), name: "x" };
  const copies = symmetric([leaf], 8, true, [50, 50]);
  assert.equal(copies.length, 16);
  const areas = copies.map((c) => Math.abs(polygonArea(c.d.flatten()[0].slice(0, 3))));
  assert.ok(areas.every((x) => near(x, areas[0], 1e-9)));
  const radii = copies.map((c) => dist(c.d.flatten()[0][0], [50, 50]));
  assert.ok(radii.every((r) => near(r, radii[0], 1e-9)), "copies stay at the same distance from the centre");
});

test("border units are mirror symmetric and fit each side exactly", () => {
  const pal = paletteById("safavid-haftrang");
  for (const kind of ["scroll", "flowers", "guilloche", "chevron", "sawtooth", "beads", "lattice", "cartouche"]) {
    const shapes = borderUnit(kind, 60, 30, pal);
    assert.ok(shapes.length > 0, kind);
    for (const s of shapes) for (const ring of s.d.flatten()) for (const p of ring) assert.ok(Number.isFinite(p[0]) && Number.isFinite(p[1]), kind);
  }
  const r = GENERATORS.border.build({ ...GENERATORS.border.defaults, width: 311, height: 207, band: 30 }, { palette: paletteById("timurid-moarraq"), uid: "b" });
  assert.ok(countLeaves(r.art) > 20);
});

// ------------------------------------------------------------------ generators and library
test("every generator builds with its defaults", () => {
  for (const G of Object.values(GENERATORS)) {
    const r = G.build(G.defaults, { palette: PALETTES[0], uid: "u" });
    const svg = serialize(r.art, -1);
    assert.ok(countLeaves(r.art) > 0, G.id);
    assert.ok(!/NaN|Infinity|undefined/.test(svg), `${G.id} output is clean`);
    const s = G.size(G.defaults); assert.ok(s.w > 0 && s.h > 0, G.id);
  }
});

test("library: distinct, buildable designs with provenance", () => {
  assert.ok(DESIGNS.length >= 100, `${DESIGNS.length} designs`);
  const ids = new Set(DESIGNS.map((d) => d.id));
  assert.equal(ids.size, DESIGNS.length, "unique ids");
  const recipes = new Set(DESIGNS.map((d) => d.gen + JSON.stringify(d.params)));
  assert.equal(recipes.size, DESIGNS.length, "no two designs share the same construction");
  for (const d of DESIGNS) {
    assert.ok(GENERATORS[d.gen], d.id);
    assert.ok(PALETTES.some((p) => p.id === d.palette), `${d.id} palette`);
    for (const r of d.refs ?? []) assert.ok(REFERENCES.some((x) => x.id === r), `${d.id} reference ${r}`);
    if (d.provenance !== "original") assert.ok(d.refs?.length && d.note, `${d.id} cites its source`);
    assert.ok(!/[—;]/.test(d.title + (d.note ?? "")), `${d.id} text style`);
  }
  const fams = new Set(DESIGNS.map((d) => d.family));
  for (const f of ["girih", "moarraq", "haftrang", "eslimi", "khatai", "border", "medallion", "bannai", "calligraphy", "qajar", "lustre", "architectural"]) assert.ok(fams.has(f as never), f);
});

test("library designs build (all of them) within a time budget", () => {
  const t0 = performance.now();
  for (const d of DESIGNS) { const p = generate(d.gen, d.params, d.palette); assert.ok(countLeaves(p.node) > 0, d.id); }
  const ms = performance.now() - t0;
  assert.ok(ms < 20000, `${Math.round(ms)} ms for ${DESIGNS.length} designs`);
});

test("large pattern: 8 × 8 octagon girih builds fast", () => {
  const t0 = performance.now();
  const g = buildGirih({ system: "4.8.8", angle: 67.5, gap: 0, width: 800, cols: 8, rows: 8, centred: false });
  const ms = performance.now() - t0;
  assert.ok(g.pieces.length > 300 && ms < 3000, `${g.pieces.length} pieces in ${Math.round(ms)} ms`);
});

test("references: documented, rights recorded, images only when redistributable", () => {
  assert.ok(REFERENCES.length >= 40);
  for (const r of REFERENCES) {
    assert.ok(r.sourceUrl.startsWith("https://"), r.id);
    assert.ok(r.imageRights.length > 5, r.id);
    if (r.imageFile) assert.ok(/public domain|cc0|cc by/i.test(r.imageRights), `${r.id}: ${r.imageRights}`);
  }
  assert.equal(COVERAGE.length, 12);
});

// ------------------------------------------------------------------ document and export
const docOf = (gen: string, params = {}, pal = "safavid-haftrang") => documentFor(gen, params, pal);

test("document carries the physical size", () => {
  const { svg, meta } = docOf("khatai-tile", { size: 150 });
  assert.equal(meta.w, 150);
  assert.match(svg, /width="150"/);
  assert.match(svg, /data-kashi-layer="ornament"/);
});

test("SVG export: millimetres, named layers, clean output, renders independently", () => {
  const { svg } = docOf("girih", { system: "4.8.8", angle: 67.5, width: 180, cols: 2, rows: 2, style: "interlace" });
  const out = exportSvg(svg, { scope: "document", units: "mm", includeConstruction: false, includeReference: false, includeTileEdge: false, expandUses: false, title: "Test" }, parser, ser);
  assert.match(out, /width="180mm"/);
  assert.match(out, /viewBox="0 0 180 180"/);
  assert.match(out, /inkscape:groupmode="layer"/);
  assert.match(out, /inkscape:label="Ornament"/);
  assert.doesNotMatch(out, /data-kashi|data-name=|class="layer"/);
  assert.doesNotMatch(out, /inkscape:label="Construction"/, "construction left out");
  const srcDoc = parser.parseFromString(svg, "image/svg+xml");
  const src = srcDoc.querySelectorAll('[data-kashi-layer="ornament"] path').length;
  const dst = (out.match(/<path /g) ?? []).length;
  assert.ok(dst > 20 && dst === src, `every ornament path kept (${dst} of ${src})`);
  const png = new Resvg(out, { fitTo: { mode: "width", value: 300 } }).render();
  assert.equal(png.width, 300);
  assert.equal(png.height, 300);
});

test("SVG export: centimetres, tile scope and selection scope", () => {
  const { svg } = docOf("medallion", { size: 240 });
  const cm = exportSvg(svg, { scope: "document", units: "cm", includeConstruction: false, includeReference: false, includeTileEdge: false, expandUses: false }, parser, ser);
  assert.match(cm, /width="24cm"/);
  const tile = exportSvg(svg, { scope: "tile", tile: { w: 120, h: 120 }, units: "mm", includeConstruction: false, includeReference: false, includeTileEdge: false, expandUses: false }, parser, ser);
  assert.match(tile, /width="120mm"/);
  assert.match(tile, /clipPath id="tile-clip"/);
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const id = doc.querySelector('[data-kashi-gen]')!.getAttribute("id")!;
  const sel = exportSvg(svg, { scope: "elements", ids: [id], box: { x: 10, y: 20, width: 100, height: 50 }, units: "mm", includeConstruction: true, includeReference: false, includeTileEdge: false, expandUses: false }, parser, ser);
  assert.match(sel, /viewBox="10 20 100 50"/);
});

test("export expands live copies into independent geometry", () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="100" height="100"><g class="layer" data-kashi-layer="ornament"><title>Ornament</title><g id="src"><path d="M0 0L10 0L10 10Z"/></g><use href="#src" transform="rotate(90 50 50)"/><use xlink:href="#src" x="5" y="5"/></g></svg>`;
  const out = exportSvg(svg, { scope: "document", units: "mm", includeConstruction: false, includeReference: false, includeTileEdge: false, expandUses: true }, parser, ser);
  assert.doesNotMatch(out, /<use/);
  assert.equal((out.match(/<path/g) ?? []).length, 3);
  const d = parser.parseFromString(svg, "image/svg+xml");
  assert.equal(expandUses(d), 2);
});

test("round trip: export, sanitise, re-import keeps size and geometry", () => {
  const { svg } = docOf("lustre", { size: 160 }, "kashan-lustre");
  const out = exportSvg(svg, { scope: "document", units: "mm", includeConstruction: false, includeReference: false, includeTileEdge: false, expandUses: false }, parser, ser);
  const clean = sanitizeSvg(out, win).svg;
  const root = parser.parseFromString(clean, "image/svg+xml").documentElement;
  const s = svgSizeMm(root);
  assert.ok(near(s.w, 160) && near(s.h, 160) && near(s.scale, 1));
  assert.equal((clean.match(/<path/g) ?? []).length, (out.match(/<path/g) ?? []).length);
});

// ------------------------------------------------------------------ import sanitising
test("sanitiser removes active content and external references", () => {
  const evil = `<svg xmlns="http://www.w3.org/2000/svg" onload="x()"><script>alert(1)</script><a href="javascript:alert(1)"><rect width="5" height="5" onclick="y()"/></a><image href="https://tracker.example/p.png"/><foreignObject><p>x</p></foreignObject><rect style="fill:url(https://e.example/x)"/><use href="#ok"/></svg>`;
  const { svg, removed } = sanitizeSvg(evil, win);
  assert.doesNotMatch(svg, /script|onload|onclick|javascript:|tracker|foreignObject|e\.example/i);
  assert.match(svg, /href="#ok"/, "internal references stay");
  assert.ok(removed.length >= 3);
});

test("sanitiser rejects DOCTYPE, malformed and oversized files", () => {
  assert.throws(() => sanitizeSvg(`<!DOCTYPE svg [<!ENTITY x "y">]><svg xmlns="http://www.w3.org/2000/svg">&x;</svg>`, win), ImportError);
  assert.throws(() => sanitizeSvg(`<svg xmlns="http://www.w3.org/2000/svg"><g>`, win), ImportError);
  assert.throws(() => sanitizeSvg(`<html><body>no</body></html>`, win), ImportError);
  assert.throws(() => sanitizeSvg(" ".repeat(26 * 1024 * 1024), win), ImportError);
});

test("physical size of imported SVG in any unit", () => {
  const el = (w: string, h: string, vb?: string) => parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" ${vb ? `viewBox="${vb}"` : ""}/>`, "image/svg+xml").documentElement;
  assert.ok(near(svgSizeMm(el("2in", "1in")).w, 50.8));
  assert.ok(near(svgSizeMm(el("10cm", "5cm")).h, 50));
  assert.ok(near(svgSizeMm(el("96", "48")).w, 25.4));
  assert.ok(near(svgSizeMm(el("72pt", "72pt", "0 0 100 100")).scale, 25.4 / 100));
});

// ------------------------------------------------------------------ storage
test("project file round trip and validation", () => {
  const { svg, meta } = docOf("bannai");
  const f = projectFile({ name: "Brick", svg, meta, designId: "bannai-1" });
  const r = readProjectFile(f);
  assert.equal(r.name, "Brick");
  assert.equal(r.svg, svg);
  assert.equal(r.meta.w, meta.w);
  assert.throws(() => readProjectFile("{"), /not a valid/);
  assert.throws(() => readProjectFile(JSON.stringify({ format: "other" })), /not a Kashi/);
  assert.throws(() => readProjectFile(JSON.stringify({ format: "kashi-studio/project", svg: 1, meta: {} })), /incomplete/);
});

test("local project store: save, list, open, delete (memory fallback)", async () => {
  const { svg, meta } = docOf("medallion");
  const now = new Date().toISOString();
  await putProject({ id: "a", name: "A", svg, meta, createdAt: now, updatedAt: now });
  await putProject({ id: "b", name: "B", svg, meta, createdAt: now, updatedAt: new Date(Date.now() + 1000).toISOString() });
  assert.deepEqual((await listProjects()).map((p) => p.id), ["b", "a"]);
  assert.equal((await getProject("a"))?.svg, svg);
  await deleteProject("a");
  assert.deepEqual((await listProjects()).map((p) => p.id), ["b"]);
});

// ------------------------------------------------------------------ text
test("WOFF fonts convert to sfnt for HarfBuzz", async () => {
  const buf = readFileSync("node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-400-normal.woff");
  const sfnt = await woffToSfnt(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), async (b) => new Uint8Array(inflateSync(b)));
  const v = new DataView(sfnt.buffer);
  assert.ok([0x00010000, 0x4f54544f].includes(v.getUint32(0)), "sfnt version");
  const n = v.getUint16(4);
  const tags = Array.from({ length: n }, (_, i) => String.fromCharCode(...sfnt.slice(12 + i * 16, 16 + i * 16)));
  for (const t of ["cmap", "glyf", "GSUB"]) assert.ok(tags.includes(t), t);
  assert.equal(transformPath("M0 0L1000 500Z", 0.01, 5, 10), "M5 10L15 5Z");
});

test("Persian text is shaped with joining forms (HarfBuzz)", async () => {
  const hb = await import("harfbuzzjs");
  const buf = readFileSync("node_modules/@fontsource/vazirmatn/files/vazirmatn-arabic-400-normal.woff");
  const sfnt = await woffToSfnt(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), async (b) => new Uint8Array(inflateSync(b)));
  const shape = (text: string) => {
    const face = new hb.Face(new hb.Blob(sfnt), 0), font = new hb.Font(face), b = new hb.Buffer();
    b.addText(text); b.guessSegmentProperties(); hb.shape(font, b);
    return b.getGlyphInfos().map((g: { codepoint: number }) => g.codepoint);
  };
  const joined = shape("کاشی"), isolated = ["ک", "ا", "ش", "ی"].flatMap((c) => shape(c));
  assert.notDeepEqual(joined.slice().sort(), isolated.slice().sort(), "contextual forms differ from isolated forms");
});
