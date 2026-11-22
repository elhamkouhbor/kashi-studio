// The design library. Every entry opens as editable artwork built by a generator. Entries are curated
// constructions, not colour variants: each differs in geometry, composition or motif repertoire.
//
// Provenance (shown on every card):
//   reconstruction: the geometric scheme follows a documented object or building (see refs). Painted
//                   details are not reproduced unless the note says so.
//   adaptation:     based on a documented reference with deliberate changes.
//   original:       a new composition in a Persian idiom. Period and place tags then describe the style
//                   it draws on, not an origin.
import type { Family, Params } from "../generators/types";

export type Provenance = "reconstruction" | "adaptation" | "original";
export interface Design {
  id: string;
  title: string;
  titleFa: string;
  family: Family;
  gen: string;
  params: Params;
  palette: string;
  provenance: Provenance;
  /** Style tags: period and place the design draws on. */
  period: string;
  region: string;
  symmetry: string;
  refs?: string[];
  note?: string;
}

const D: Design[] = [];
const add = (d: Design) => D.push(d);

// ------------------------------------------------------------------ girih
const girih: [string, string, string, number, number, string, string, string, string][] = [
  // system, title, titleFa, angle, gap, style, palette, period, symmetry
  ["decagonal", "Ten-pointed stars with bowties", "ستارهٔ ده‌پر و پاپیونی", 54, 0, "interlace", "timurid-moarraq", "Timurid", "10-fold rosettes, rectangular repeat"],
  ["decagonal", "Open ten-pointed stars", "ستارهٔ ده‌پر باز", 72, 0, "strap", "yazd-turquoise", "Seljuk", "10-fold rosettes, rectangular repeat"],
  ["decagonal", "Slender ten-pointed rosettes", "شمسهٔ ده‌پر باریک", 38, 0, "moarraq", "tabriz-blue", "Timurid", "10-fold rosettes, rectangular repeat"],
  ["decagonal", "Doubled-line ten-fold girih", "گره ده دو خط", 54, 0.12, "strap", "safavid-haftrang", "Safavid", "10-fold rosettes, rectangular repeat"],
  ["4.8.8", "Eight-pointed stars and crosses", "ستارهٔ هشت‌پر و چلیپا", 67.5, 0, "interlace", "safavid-haftrang", "Safavid", "p4m, 8-fold stars"],
  ["4.8.8", "Octagon lattice", "شبکهٔ هشت‌ضلعی", 45, 0, "strap", "seljuk-bannai", "Seljuk", "p4m"],
  ["4.8.8", "Eight-fold rosettes", "شمسهٔ هشت", 75, 0, "moarraq", "timurid-moarraq", "Timurid", "p4m, 8-fold rosettes"],
  ["4.8.8", "Woven eight-pointed stars", "ستارهٔ هشت‌پر بافته", 60, 0.1, "interlace", "tabriz-blue", "Ilkhanid", "p4m"],
  ["4.6.12", "Twelve-pointed rosettes", "شمسهٔ دوازده‌پر", 62, 0, "interlace", "timurid-moarraq", "Timurid", "p6m, 12-fold rosettes"],
  ["4.6.12", "Twelve-fold stars and hexagons", "ستارهٔ دوازده و شش‌ضلعی", 70, 0, "moarraq", "yazd-turquoise", "Safavid", "p6m"],
  ["4.6.12", "Narrow twelve-pointed stars", "ستارهٔ دوازده‌پر باریک", 50, 0, "strap", "kerman-ochre", "Safavid", "p6m"],
  ["3.12.12", "Twelve-pointed stars and triangles", "ستارهٔ دوازده‌پر و مثلث", 70, 0, "interlace", "tabriz-blue", "Timurid", "p6m"],
  ["3.12.12", "Dodecagon chain", "زنجیرهٔ دوازده‌ضلعی", 60, 0, "moarraq", "safavid-haftrang", "Safavid", "p6m"],
  ["3.12.12", "Open twelve-fold lattice", "شبکهٔ باز دوازده", 78, 0, "strap", "seljuk-bannai", "Seljuk", "p6m"],
  ["6.6.6", "Six-pointed stars", "ستارهٔ شش‌پر", 60, 0, "interlace", "safavid-haftrang", "Safavid", "p6m"],
  ["6.6.6", "Hexagon and star mosaic", "معرق شش‌ضلعی و ستاره", 40, 0, "moarraq", "yazd-turquoise", "Timurid", "p6m"],
  ["6.6.6", "Woven hexagons", "شش‌ضلعی بافته", 70, 0.12, "interlace", "kashan-lustre", "Ilkhanid", "p6m"],
  ["3.6.3.6", "Stars of the trihexagonal tiling", "ستاره‌های شش و سه", 60, 0, "moarraq", "timurid-moarraq", "Timurid", "p6m"],
  ["3.6.3.6", "Hexagram lattice", "شبکهٔ شش‌پر", 45, 0, "strap", "tabriz-blue", "Safavid", "p6m"],
  ["3.6.3.6", "Woven six-fold stars", "ستارهٔ شش بافته", 72, 0, "interlace", "safavid-haftrang", "Safavid", "p6m"],
  ["3.4.6.4", "Rosettes on hexagons and squares", "شمسه روی شش و چهار", 60, 0, "interlace", "yazd-turquoise", "Timurid", "p6m"],
  ["3.4.6.4", "Twelve-sided rosette mosaic", "معرق شمسهٔ دوازده‌ضلعی", 45, 0, "moarraq", "safavid-haftrang", "Safavid", "p6m"],
  ["3.4.6.4", "Fine six-fold strapwork", "گره ریز شش", 70, 0, "strap", "kerman-ochre", "Qajar", "p6m"],
  ["3.3.4.3.4", "Turned squares and stars", "مربع چرخیده و ستاره", 60, 0, "interlace", "tabriz-blue", "Ilkhanid", "p4g"],
  ["3.3.4.3.4", "Snub square mosaic", "معرق مربع چرخیده", 45, 0, "moarraq", "yazd-turquoise", "Timurid", "p4g"],
  ["4.4.4.4", "Woven squares", "مربع بافته", 30, 0.15, "interlace", "seljuk-bannai", "Seljuk", "p4m"],
  ["4.4.4.4", "Four-pointed stars", "ستارهٔ چهارپر", 60, 0, "moarraq", "kashan-lustre", "Ilkhanid", "p4m"],
  ["3.3.3.3.3.3", "Triangle star lattice", "شبکهٔ ستارهٔ مثلثی", 60, 0, "strap", "safavid-haftrang", "Safavid", "p6m"],
  ["3.3.3.3.3.3", "Pinwheel triangles", "مثلث‌های چرخان", 32, 0, "moarraq", "kerman-ochre", "Qajar", "p6"],
  ["3.3.3.4.4", "Squares and triangles in rows", "ردیف مربع و مثلث", 55, 0, "interlace", "tabriz-blue", "Seljuk", "cmm"],
];
for (const [system, title, titleFa, angle, gap, style, palette, period, symmetry] of girih) {
  add({
    id: `girih-${system}-${angle}-${style}${gap ? "-gap" : ""}`.replace(/\./g, ""), title, titleFa, family: style === "moarraq" ? "moarraq" : "girih", gen: "girih",
    params: { system, angle, gap, style, width: 200, cols: system === "decagonal" ? 1 : system === "3.3.3.4.4" ? 4 : 2, rows: system === "decagonal" || system === "3.3.3.4.4" ? 1 : 2, centred: false, band: style === "moarraq" ? 0.8 : 2.2 },
    palette, provenance: "original", period, region: "Iran", symmetry,
    note: "Constructed with Hankin's polygons in contact method on a periodic tiling. Repeats seamlessly.",
  });
}

// ------------------------------------------------------------------ khatai, eslimi, haft-rang
const khatai: [string, string, Params, string, string][] = [
  ["Khatai rosette with palmettes", "گل ختایی با شاه‌عباسی", {}, "safavid-haftrang", "Safavid"],
  ["Twelve-petal flower tile", "کاشی گل دوازده‌پر", { petals: 12, tip: "round", rings: 3 }, "qajar-shiraz", "Qajar"],
  ["Cleft-petal rosette", "گل پرشکاف", { petals: 10, tip: "cleft", rings: 2, palmettes: false, leaves: true }, "timurid-moarraq", "Timurid"],
  ["Six-petal rosette with leaves", "گل شش‌پر با برگ", { petals: 6, tip: "point", rings: 2, palmettes: false, stem: false }, "kerman-ochre", "Safavid"],
  ["Large rosette, corner flowers", "گل بزرگ و گل گوشه", { petals: 16, tip: "point", rings: 3, flower: 0.3, palmettes: false, leaves: false }, "tabriz-blue", "Safavid"],
  ["Palmette cross", "چلیپای شاه‌عباسی", { petals: 8, rings: 1, flower: 0.14, palmettes: true, leaves: false, stem: false }, "yazd-turquoise", "Safavid"],
  ["Flower ring", "حلقهٔ گل", { petals: 9, tip: "round", rings: 2, palmettes: false, leaves: true, corners: false }, "qajar-shiraz", "Qajar"],
  ["Lustre flower tile", "کاشی گل زرین‌فام", { petals: 8, tip: "cleft", rings: 2 }, "kashan-lustre", "Ilkhanid"],
];
khatai.forEach(([title, titleFa, params, palette, period], i) => add({ id: `khatai-${i + 1}`, title, titleFa, family: "khatai", gen: "khatai-tile", params, palette, provenance: "original", period, region: "Iran", symmetry: "p4m (D4 tile)" }));

const eslimi: [string, string, Params, string, string][] = [
  ["Eslimi scrolls with split palmettes", "اسلیمی با دهان‌اژدری", {}, "safavid-haftrang", "Safavid"],
  ["Eight-fold eslimi with palmettes", "اسلیمی هشت‌گانه", { symmetry: "8", ends: "palmette" }, "timurid-moarraq", "Timurid"],
  ["Tight eslimi spirals", "اسلیمی پیچان", { turns: 1.8, radius: 0.16, leaves: 8, leafSize: 0.07 }, "tabriz-blue", "Timurid"],
  ["Open eslimi with buds", "اسلیمی باز با غنچه", { turns: 0.8, radius: 0.22, ends: "bud", leaves: 4 }, "kerman-ochre", "Safavid"],
  ["Eslimi on turquoise", "اسلیمی بر فیروزه", { symmetry: "8", turns: 1.3, ends: "split" }, "yazd-turquoise", "Safavid"],
  ["Qajar eslimi", "اسلیمی قاجاری", { turns: 1.1, ends: "palmette", leaves: 6 }, "qajar-shiraz", "Qajar"],
];
eslimi.forEach(([title, titleFa, params, palette, period], i) => add({ id: `eslimi-${i + 1}`, title, titleFa, family: "eslimi", gen: "eslimi-tile", params, palette, provenance: "original", period, region: "Iran", symmetry: params.symmetry === "8" ? "D8 tile" : "D4 tile" }));

const motifs: [string, string, Params, string][] = [
  ["Shah-abbasi palmette", "گل شاه‌عباسی", { kind: "palmette", petals: 2 }, "safavid-haftrang"],
  ["Full palmette, three petal pairs", "شاه‌عباسی سه‌جفت", { kind: "palmette", petals: 3, spread: 18, tip: "cleft" }, "timurid-moarraq"],
  ["Rosette (gol)", "گل", { kind: "rosette", petals: 10, tip: "cleft" }, "qajar-shiraz"],
  ["Split palmette (dahan-ejdari)", "دهان‌اژدری", { kind: "split", hook: 0.5 }, "safavid-haftrang"],
  ["Eslimi leaf", "برگ اسلیمی", { kind: "eslimi", hook: 0.4 }, "tabriz-blue"],
  ["Serrated khatai leaf", "برگ ختایی", { kind: "leaf" }, "safavid-haftrang"],
  ["Bud (ghoncheh)", "غنچه", { kind: "bud" }, "qajar-shiraz"],
];
motifs.forEach(([title, titleFa, params, palette], i) => add({ id: `motif-${i + 1}`, title, titleFa, family: params.kind === "eslimi" || params.kind === "split" ? "eslimi" : "khatai", gen: "palmette", params, palette, provenance: "original", period: "Safavid", region: "Iran", symmetry: params.kind === "eslimi" ? "none" : "mirror" }));

const panels: [string, string, Params, string, string][] = [
  ["Haft-rang panel with shamse", "تابلوی هفت‌رنگ با شمسه", {}, "safavid-haftrang", "Safavid"],
  ["Haft-rang panel with toranj", "تابلوی هفت‌رنگ با ترنج", { tilesX: 4, tilesY: 6, medallion: "toranj", border: "scroll" }, "safavid-haftrang", "Safavid"],
  ["Khatai field panel", "تابلوی گل ختایی", { field: "khatai", medallion: "none", border: "guilloche" }, "kerman-ochre", "Safavid"],
  ["Qajar haft-rang panel", "تابلوی هفت‌رنگ قاجاری", { field: "khatai", medallion: "shamse", border: "flowers", tilesX: 5, tilesY: 5 }, "qajar-shiraz", "Qajar"],
  ["Turquoise haft-rang panel", "تابلوی فیروزه‌ای", { field: "eslimi", medallion: "toranj", border: "flowers", tilesX: 3, tilesY: 5 }, "yazd-turquoise", "Safavid"],
];
panels.forEach(([title, titleFa, params, palette, period], i) => add({ id: `haftrang-${i + 1}`, title, titleFa, family: "haftrang", gen: "haftrang-panel", params, palette, provenance: "original", period, region: "Isfahan style", symmetry: "D2 panel" }));

// ------------------------------------------------------------------ medallions
const meds: [string, string, Params, string][] = [
  ["Lobed shamse", "شمسهٔ کنگره‌دار", {}, "safavid-haftrang"],
  ["Toranj with pendants", "ترنج با سرترنج", { shape: "toranj", lobes: 16 }, "kerman-ochre"],
  ["Star medallion", "شمسهٔ ستاره", { shape: "star", lobes: 8 }, "tabriz-blue"],
  ["Sixteen-lobed shamse", "شمسهٔ شانزده‌کنگره", { lobes: 16, depth: 0.05, ring: 16, petals: 12 }, "timurid-moarraq"],
  ["Twelve-pointed star medallion", "شمسهٔ دوازده‌پر", { shape: "star", lobes: 12, ring: 12 }, "yazd-turquoise"],
  ["Qajar shamse", "شمسهٔ قاجاری", { lobes: 10, depth: 0.12, ring: 10, petals: 10 }, "qajar-shiraz"],
];
meds.forEach(([title, titleFa, params, palette], i) => add({ id: `medallion-${i + 1}`, title, titleFa, family: "medallion", gen: "medallion", params, palette, provenance: "original", period: i === 5 ? "Qajar" : "Safavid", region: "Iran", symmetry: params.shape === "toranj" ? "D2" : `D${params.lobes ?? 12}` }));

// ------------------------------------------------------------------ borders
const borders: [string, string, Params, string][] = [
  ["Eslimi scroll border", "حاشیهٔ اسلیمی", {}, "safavid-haftrang"],
  ["Guilloche border, star corners", "حاشیهٔ گیس‌بافت", { motif: "guilloche", corner: "star" }, "timurid-moarraq"],
  ["Flower and bud border", "حاشیهٔ گل و غنچه", { motif: "flowers" }, "qajar-shiraz"],
  ["Reciprocal triangle border", "حاشیهٔ دندانه", { motif: "sawtooth", corner: "plain" }, "seljuk-bannai"],
  ["Chevron border", "حاشیهٔ جناغی", { motif: "chevron", corner: "plain" }, "yazd-turquoise"],
  ["Bead and lozenge border", "حاشیهٔ مروارید و لوزی", { motif: "beads", corner: "rosette" }, "kashan-lustre"],
  ["Octagon lattice border", "حاشیهٔ هشت‌ضلعی", { motif: "lattice", corner: "star" }, "tabriz-blue"],
  ["Mitred scroll frame", "قاب اسلیمی", { motif: "scroll", corner: "none", band: 28 }, "kerman-ochre"],
];
borders.forEach(([title, titleFa, params, palette], i) => add({ id: `border-${i + 1}`, title, titleFa, family: "border", gen: "border", params, palette, provenance: "original", period: "Various", region: "Iran", symmetry: "frieze, mirrored units" }));

// ------------------------------------------------------------------ banna'i
const bannai: [string, string, Params][] = [
  ["Nested lozenges in brick", "لوزی‌های تودرتو", { pattern: "lozenges", step: 4 }],
  ["Nested squares in brick", "مربع‌های تودرتو", { pattern: "squares", step: 2 }],
  ["Brick zigzag bands", "زیگزاگ آجری", { pattern: "zigzag", step: 3 }],
  ["Stepped crosses", "چلیپای پله‌ای", { pattern: "steps", step: 4 }],
  ["Diagonal brick chequer", "شطرنجی اریب", { pattern: "checker", step: 4 }],
  ["Square kufic grid (empty)", "شبکهٔ کوفی بنایی", { pattern: "grid", cells: 15, grid: "" }],
];
bannai.forEach(([title, titleFa, params], i) => add({ id: `bannai-${i + 1}`, title, titleFa, family: "bannai", gen: "bannai", params, palette: "seljuk-bannai", provenance: "original", period: "Timurid", region: "Iran", symmetry: "D4 grid", note: params.pattern === "grid" ? "Paint your own square kufic letters in the cells. No inscription is supplied." : undefined }));
const hazar: [string, string, string][] = [["Herringbone brick (hazarbaf)", "هزارباف جناغی", "herringbone"], ["Basket weave brick", "هزارباف حصیری", "basket"], ["Running bond brick", "آجرچینی رونده", "running"], ["Stretcher and header rows", "آجرچینی راسته و کله", "stack"]];
hazar.forEach(([title, titleFa, bond], i) => add({ id: `hazarbaf-${i + 1}`, title, titleFa, family: "bannai", gen: "hazarbaf", params: { bond }, palette: "seljuk-bannai", provenance: "original", period: "Seljuk", region: "Iran", symmetry: "lattice" }));

// ------------------------------------------------------------------ lustre
add({ id: "lustre-1", title: "Lustre star and cross tiles", titleFa: "ستاره و چلیپای زرین‌فام", family: "lustre", gen: "lustre", params: {}, palette: "kashan-lustre", provenance: "adaptation", period: "Ilkhanid", region: "Kashan", symmetry: "p4m", refs: ["met-kashan-star-cross-panel", "met-kashan-lustre-star-1211"], note: "Star and cross geometry follows the Kashan lustre tiles. The painting is an interpretation and the inscription band is left empty." });
add({ id: "lustre-2", title: "Four stars with palmette crosses", titleFa: "چهار ستاره با چلیپای شاه‌عباسی", family: "lustre", gen: "lustre", params: { repeat: 2, centre: "palmettes", crossFill: "1" }, palette: "kashan-lustre", provenance: "adaptation", period: "Ilkhanid", region: "Kashan", symmetry: "p4m", refs: ["met-kashan-cross-tile-blue", "met-kashan-star-foliage-1264"], note: "After Kashan star and cross tiles with palmette fills and cobalt crosses. Painting interpreted." });
add({ id: "lustre-3", title: "Lustre star with leaf scroll", titleFa: "ستارهٔ زرین‌فام با برگ", family: "lustre", gen: "lustre", params: { centre: "scroll", band: false, dots: 260 }, palette: "kashan-lustre", provenance: "adaptation", period: "Ilkhanid", region: "Kashan", symmetry: "p4m", refs: ["met-kashan-lustre-star-1262"], note: "After a Kashan lustre star with a scrolling leaf field and dotted ground. Painting interpreted." });

// ------------------------------------------------------------------ Qajar
const qajar: [string, string, Params][] = [
  ["Rose and nightingale (gol-o-bolbol)", "گل و بلبل", { scene: "golobolbol" }],
  ["Gol-o-bolbol, mirrored", "گل و بلبل قرینه", { scene: "golobolbol", mirror: true, flowers: 4, seed: 11 }],
  ["Flower vase (goldan)", "گلدان", { scene: "vase", flowers: 5 }],
  ["Small flower vase", "گلدان کوچک", { scene: "vase", flowers: 3 }],
  ["Rose spray", "شاخهٔ گل سرخ", { scene: "roses", flowers: 5 }],
];
qajar.forEach(([title, titleFa, params], i) => add({ id: `qajar-${i + 1}`, title, titleFa, family: "qajar", gen: "qajar", params, palette: "qajar-shiraz", provenance: "original", period: "Qajar", region: "Shiraz and Tehran style", symmetry: params.mirror ? "mirrored" : "none", note: "A hand-constructed template in the manner of Qajar painted tiles, not a copy of a particular tile." }));

// ------------------------------------------------------------------ architecture
const arch: [string, string, Params, string][] = [
  ["Mihrab-inspired niche with girih", "محراب با گره", {}, "safavid-haftrang"],
  ["Mihrab-inspired niche with eslimi", "محراب با اسلیمی", { field: "eslimi" }, "timurid-moarraq"],
  ["Arched panel with khatai", "طاق‌نما با گل ختایی", { layout: "arch", field: "khatai", inscription: false }, "qajar-shiraz"],
  ["Arched panel with girih", "طاق‌نما با گره", { layout: "arch", field: "girih", rise: 0.7 }, "tabriz-blue"],
  ["Plain arched niche", "طاق‌نمای ساده", { layout: "arch", field: "plain", border: true, inscription: false }, "kerman-ochre"],
];
arch.forEach(([title, titleFa, params, palette], i) => add({ id: `arch-${i + 1}`, title, titleFa, family: "architectural", gen: "arch", params, palette, provenance: "original", period: "Safavid", region: "Iran", symmetry: "mirror", note: "A layout combining several ornament systems. The inscription band is left empty for your own text." }));
const bands: [string, string, Params, string][] = [
  ["Eslimi frieze", "کتیبهٔ اسلیمی", { motif: "scroll" }, "safavid-haftrang"],
  ["Girih frieze", "نوار گره", { motif: "girih", depth: 160 }, "timurid-moarraq"],
  ["Flower frieze", "نوار گل", { motif: "flowers" }, "qajar-shiraz"],
  ["Guilloche frieze", "نوار گیس‌بافت", { motif: "guilloche" }, "tabriz-blue"],
];
bands.forEach(([title, titleFa, params, palette], i) => add({ id: `band-${i + 1}`, title, titleFa, family: "architectural", gen: "band", params, palette, provenance: "original", period: "Various", region: "Iran", symmetry: "frieze" }));

// ------------------------------------------------------------------ calligraphy (the user's own text)
const calli: [string, string, Params, string][] = [
  ["Text cartouche", "کتیبهٔ ترنجی", { frame: "cartouche" }, "safavid-haftrang"],
  ["Inscription band", "کتیبهٔ نواری", { frame: "band", width: 600, size: 70 }, "timurid-moarraq"],
  ["Text medallion", "شمسهٔ نوشتاری", { frame: "medallion", width: 200, size: 44 }, "tabriz-blue"],
];
calli.forEach(([title, titleFa, params, palette], i) => add({ id: `calligraphy-${i + 1}`, title, titleFa, family: "calligraphy", gen: "calligraphy", params, palette, provenance: "original", period: "Various", region: "Iran", symmetry: "mirror frame", note: "Type your own text. The default word is کاشی (tile). Convert to outlines before sending the file to someone without the font." }));

// ------------------------------------------------------------------ source-based designs
add({ id: "ref-star-cross-panel", title: "Star and cross panel, Kashan 1260s", titleFa: "تابلوی ستاره و چلیپا، کاشان", family: "lustre", gen: "star-tiles", params: { system: "star-cross", size: 160, repeat: 3, fill: "palmettes", rim: true, alternate: true }, palette: "ref-kashan-star-cross", provenance: "reconstruction", period: "Ilkhanid", region: "Kashan", symmetry: "p4m", refs: ["met-kashan-star-cross-panel", "met-kashan-cross-tile-blue", "met-kashan-lustre-star-1211"], note: "Geometric reconstruction of the tile system: eight-pointed stars of two overlapping squares touching point to point, with four-armed crosses filling the gaps. Colours sampled from the photograph. Each historic star carried its own figural or floral painting, which is not reproduced." });
add({ id: "ref-star-hex-panel", title: "Six-pointed stars and hexagons", titleFa: "ستارهٔ شش‌پر و شش‌ضلعی", family: "girih", gen: "star-tiles", params: { system: "star-hex", size: 120, repeat: 1, fill: "rosette", rim: true }, palette: "ref-star-hex", provenance: "reconstruction", period: "Ilkhanid", region: "Iran (Nishapur attribution per museum)", symmetry: "p6m", refs: ["met-nishapur-star-hex-panel"], note: "Geometric reconstruction of the tile system: hexagrams and regular hexagons, each hexagon sharing its edges with star points. Colours sampled from the photograph. The moulded relief of each tile is represented by a simple rosette." });
add({ id: "ref-kashan-six-star", title: "Lustre six-pointed star", titleFa: "ستارهٔ شش‌پر زرین‌فام", family: "lustre", gen: "star-tiles", params: { system: "star-hex", size: 140, repeat: 1, fill: "rosette", rim: true }, palette: "kashan-lustre", provenance: "adaptation", period: "Ilkhanid", region: "Kashan", symmetry: "p6m", refs: ["cma-kashan-wall-tile-14c"], note: "After a six-pointed lustre star in Cleveland. The star is set in a star and hexagon system, which is an assumption: the single tile does not show its neighbours." });
add({ id: "ref-isfahan-mihrab", title: "Niche after the Isfahan mihrab of 1354", titleFa: "طاق‌نما به سیاق محراب اصفهان", family: "moarraq", gen: "arch", params: { layout: "mihrab", field: "girih", border: true, inscription: true, rise: 0.66 }, palette: "ref-isfahan-mihrab", provenance: "adaptation", period: "Injuid / Muzaffarid", region: "Isfahan", symmetry: "mirror", refs: ["met-isfahan-mihrab-1354"], note: "Follows the layout of the cut tile mihrab (rectangular frame, inscription band, pointed niche with a geometric field) in its colours. The inscription is left empty and the field pattern is a generic girih, not the mihrab's own lattice." });
add({ id: "ref-cuerda-seca-eslimi", title: "Eslimi after a Safavid cuerda seca tile", titleFa: "اسلیمی به سیاق کاشی هفت‌رنگ صفوی", family: "haftrang", gen: "eslimi-tile", params: { ends: "split", turns: 1.1, radius: 0.21, leaves: 5, leafSize: 0.1, stem: 2 }, palette: "ref-cuerda-seca", provenance: "adaptation", period: "Safavid", region: "Isfahan", symmetry: "D4 tile", refs: ["cma-safavid-cuerda-seca-tile"], note: "Scrolling stems with split palmettes on a cobalt ground, in colours sampled from the Cleveland tile. The composition is regularised into a symmetric repeat." });
add({ id: "ref-garden-border", title: "Cartouche border after an Isfahan garden panel", titleFa: "حاشیهٔ ترنجی به سیاق تابلوی باغ", family: "border", gen: "border", params: { motif: "cartouche", corner: "rosette", unit: 1.8, band: 40 }, palette: "ref-isfahan-garden", provenance: "adaptation", period: "Safavid", region: "Isfahan", symmetry: "frieze", refs: ["met-isfahan-garden-panel"], note: "A border of linked lobed cartouches on cobalt, after the frame of the Met garden panel. The panel's painted garden scene is not reproduced." });
add({ id: "ref-qajar-dado", title: "Qajar cartouche tile", titleFa: "کاشی ترنجی قاجاری", family: "qajar", gen: "qajar", params: { scene: "cartouche", size: 220, frame: false, flowers: 3 }, palette: "ref-qajar-dado", provenance: "adaptation", period: "Qajar", region: "Iran", symmetry: "mirror frame", refs: ["met-qajar-dado-tile"], note: "After the layout of a Qajar dado tile: a barbed quatrefoil cartouche with corner scrolls. The original holds a European-style landscape. Here the cartouche holds roses." });
add({ id: "ref-octagon-entrelacs", title: "Eight-fold interlace band", titleFa: "نوار گره هشت بافته", family: "border", gen: "band", params: { motif: "girih", depth: 160, length: 960 }, palette: "ref-octagon-entrelacs", provenance: "adaptation", period: "Timurid", region: "Samarqand (outside present-day Iran)", symmetry: "frieze", refs: ["met-samarqand-octagon-entrelacs"], note: "An interlaced octagon band in the colours of a carved Timurid tile from Samarqand. The band is a generic 4.8.8 girih, not a trace of the tile." });
add({ id: "ref-darb-imam-girih", title: "Ten-fold girih in the manner of Darb-e Imam", titleFa: "گره ده به سیاق درب امام", family: "girih", gen: "girih", params: { system: "decagonal", angle: 54, gap: 0, style: "moarraq", width: 220, cols: 1, rows: 1, band: 1 }, palette: "timurid-moarraq", provenance: "adaptation", period: "Timurid / Qara Qoyunlu", region: "Isfahan", symmetry: "10-fold rosettes, rectangular repeat", refs: ["site-darb-imam"], note: "Darb-e Imam is known for girih built from the five girih tiles. This is a periodic arrangement of the same tiles, not the shrine's own (partly self-similar) pattern." });
add({ id: "ref-jameh-brick", title: "Brick lozenges after the Isfahan Jameh Mosque", titleFa: "لوزی آجری به سیاق مسجد جامع اصفهان", family: "bannai", gen: "bannai", params: { pattern: "lozenges", step: 3, cells: 19, brick: 9 }, palette: "seljuk-bannai", provenance: "adaptation", period: "Buyid and Seljuk", region: "Isfahan", symmetry: "D4 grid", refs: ["site-jameh-isfahan", "site-kharraqan"], note: "The source describes bricks laid in circles, diamonds and zigzags. This is a generic diamond (lozenge) brick pattern in that spirit, not a survey of a particular vault." });

export const DESIGNS: Design[] = D;
export const designById = (id: string) => D.find((d) => d.id === id);
