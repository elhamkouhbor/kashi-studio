// Historically inspired colour sets for Persian tilework. Values are approximations sampled from
// documented objects in the reference catalogue (research/catalogue.json) and are labelled "inspired"
// for that reason: glaze colours vary with kiln, body, age and photography.
export interface Swatch { hex: string; name: string; nameFa: string }
export interface Palette {
  id: string;
  name: string;
  nameFa: string;
  note: string;
  /** Background, ground lines, then accents in order of use. */
  ground: string;
  line: string;
  colors: string[];
}

export const GLAZES: Record<string, Swatch> = {
  lajvardi: { hex: "#1d3c86", name: "Cobalt (lajvardi)", nameFa: "لاجوردی" },
  lajvardiDeep: { hex: "#152c66", name: "Deep cobalt", nameFa: "لاجوردی سیر" },
  firoozei: { hex: "#2fa3b0", name: "Turquoise (firoozei)", nameFa: "فیروزه‌ای" },
  sefid: { hex: "#f3ede0", name: "White glaze (sefid)", nameFa: "سفید" },
  zard: { hex: "#e0ac3e", name: "Yellow (zard)", nameFa: "زرد" },
  sabz: { hex: "#4a873c", name: "Green (sabz)", nameFa: "سبز" },
  siyah: { hex: "#22201f", name: "Black (siyah)", nameFa: "سیاه" },
  badenjani: { hex: "#5e3049", name: "Manganese purple (badenjani)", nameFa: "بادنجانی" },
  ajori: { hex: "#b5683f", name: "Brick (ajori)", nameFa: "آجری" },
  khesht: { hex: "#c9a27a", name: "Unglazed brick", nameFa: "خشتی" },
  kerem: { hex: "#ead9b6", name: "Cream", nameFa: "کرم" },
  zarinfam: { hex: "#9a6a2c", name: "Lustre brown (zarinfam)", nameFa: "زرین‌فام" },
  narenji: { hex: "#d9822b", name: "Orange", nameFa: "نارنجی" },
  sorkh: { hex: "#b33a3a", name: "Red", nameFa: "سرخ" },
  sorati: { hex: "#d9707e", name: "Qajar pink (sorati)", nameFa: "صورتی" },
  asemani: { hex: "#6fb0d2", name: "Sky blue", nameFa: "آسمانی" },
};

const c = (...k: (keyof typeof GLAZES)[]) => k.map((x) => GLAZES[x].hex);

export const PALETTES: Palette[] = [
  { id: "safavid-haftrang", name: "Safavid haft-rang, Isfahan inspired", nameFa: "هفت‌رنگ صفوی، الهام از اصفهان", note: "Cuerda seca colours of seventeenth century Isfahan panels: cobalt ground, white, turquoise, yellow, green and manganese.", ground: GLAZES.lajvardi.hex, line: GLAZES.siyah.hex, colors: c("sefid", "firoozei", "zard", "sabz", "badenjani", "narenji") },
  { id: "timurid-moarraq", name: "Timurid moarraq inspired", nameFa: "معرق تیموری", note: "Cut-tile mosaic: deep cobalt and turquoise with white, black, ochre and green.", ground: GLAZES.lajvardiDeep.hex, line: GLAZES.sefid.hex, colors: c("firoozei", "sefid", "zard", "sabz", "siyah", "badenjani") },
  { id: "yazd-turquoise", name: "Turquoise and cobalt, Yazd inspired", nameFa: "فیروزه و لاجورد، الهام از یزد", note: "A cooler mosaic balance with more turquoise and white.", ground: GLAZES.firoozei.hex, line: GLAZES.sefid.hex, colors: c("lajvardi", "sefid", "siyah", "zard", "sabz") },
  { id: "kashan-lustre", name: "Kashan lustre inspired", nameFa: "زرین‌فام کاشان", note: "Lustre brown on an opaque white glaze, with cobalt and turquoise touches (Ilkhanid star and cross tiles).", ground: GLAZES.sefid.hex, line: GLAZES.zarinfam.hex, colors: c("zarinfam", "lajvardi", "firoozei", "kerem") },
  { id: "seljuk-bannai", name: "Brick and glaze, banna'i", nameFa: "آجر و کاشی، بنایی", note: "Unglazed brick with glazed turquoise and cobalt brick ends.", ground: GLAZES.khesht.hex, line: GLAZES.ajori.hex, colors: c("firoozei", "lajvardi", "ajori", "kerem", "siyah") },
  { id: "qajar-shiraz", name: "Qajar, Shiraz and Tehran inspired", nameFa: "قاجاری، الهام از شیراز و تهران", note: "Underglaze and haft-rang Qajar colours: yellow, pink, rose red, green and cobalt on white.", ground: GLAZES.sefid.hex, line: GLAZES.siyah.hex, colors: c("zard", "sorati", "sorkh", "sabz", "lajvardi", "asemani") },
  { id: "kerman-ochre", name: "Ochre and cobalt, Kerman inspired", nameFa: "اخرایی و لاجوردی، الهام از کرمان", note: "Warm yellows and ochres with cobalt, as in the Safavid tiles of the Ganjali Khan complex.", ground: GLAZES.zard.hex, line: GLAZES.lajvardiDeep.hex, colors: c("lajvardi", "sefid", "sabz", "sorkh", "firoozei") },
  { id: "tabriz-blue", name: "Cobalt and black, Tabriz inspired", nameFa: "لاجورد و سیاه، الهام از تبریز", note: "Deep cobalt fields with black and white, after the fifteenth century Blue Mosque of Tabriz.", ground: GLAZES.lajvardiDeep.hex, line: GLAZES.siyah.hex, colors: c("firoozei", "sefid", "lajvardi", "zard", "siyah") },
  // colours sampled from documented objects in the reference catalogue (approximate, from photographs)
  { id: "ref-kashan-star-cross", name: "Kashan star and cross panel, Met 41.165.22", nameFa: "ستاره و چلیپای کاشان، موزهٔ متروپولیتن", note: "Sampled from the photograph of the Met panel of star and cross tiles (1260 to 1270): white glaze, lustre brown, buff and a reddish brown.", ground: "#ede8e0", line: "#6b3a22", colors: ["#6b3a22", "#9a5a4a", "#c9a27a", "#4fb8b4"] },
  { id: "ref-star-hex", name: "Star and hexagon panel, Met 37.40.26", nameFa: "ستاره و شش‌ضلعی، موزهٔ متروپولیتن", note: "Sampled from the Met panel of six-pointed star and hexagonal tiles: dark blue stars, turquoise hexagons.", ground: "#e8e2d4", line: "#2b2440", colors: ["#3a2f8a", "#3db8b0", "#4a3a6a", "#e8e2d4"] },
  { id: "ref-isfahan-mihrab", name: "Isfahan mihrab of 1354, Met 39.20", nameFa: "محراب اصفهان، ۷۵۵ ق، موزهٔ متروپولیتن", note: "Sampled from the cut tile mosaic mihrab: cobalt, turquoise, white and ochre.", ground: "#233a8c", line: "#edede6", colors: ["#edede6", "#3ea3b5", "#a88a3a", "#1d2a5c", "#2e6f4e"] },
  { id: "ref-cuerda-seca", name: "Safavid cuerda seca tile, Cleveland 1915.650", nameFa: "کاشی هفت‌رنگ صفوی، موزهٔ کلیولند", note: "Sampled from the Cleveland wall tile: cobalt ground, turquoise stems, white and green palmettes outlined in red-brown.", ground: "#23268a", line: "#8b4a2e", colors: ["#f0ede3", "#45b5d0", "#c8a84a", "#9acd4a", "#8b4a2e"] },
  { id: "ref-isfahan-garden", name: "Isfahan garden panel, Met 03.9a", nameFa: "تابلوی باغ، اصفهان، موزهٔ متروپولیتن", note: "Sampled from the haft-rang garden panel of the early seventeenth century.", ground: "#1f3c9a", line: "#1e1a1a", colors: ["#f2efe6", "#5bc0c8", "#e6c230", "#7cb342", "#6b4a5a"] },
  { id: "ref-qajar-dado", name: "Qajar dado tile, Met 2015.292", nameFa: "کاشی ازارهٔ قاجاری، موزهٔ متروپولیتن", note: "Sampled from the moulded Qajar dado tile: cobalt with white scrollwork, green, sky blue and yellow.", ground: "#1e3a9a", line: "#6a5a6a", colors: ["#ededed", "#e8d46a", "#4caf50", "#8ec5e8", "#d86c7a", "#6a5a6a"] },
  { id: "ref-octagon-entrelacs", name: "Octagon entrelacs tile, Met 1972.88", nameFa: "کاشی گره هشت، موزهٔ متروپولیتن", note: "Sampled from the carved interlace tile from Samarqand: turquoise ground, pale turquoise and aubergine bands.", ground: "#2ea6a6", line: "#3e2420", colors: ["#a8e0e6", "#3e2420", "#2ea6a6", "#f0ede3"] },
  { id: "ink", name: "Ink on paper (construction)", nameFa: "مرکب روی کاغذ", note: "Neutral colours for studying a construction.", ground: "#f7f3ea", line: "#1d1d1d", colors: ["#ffffff", "#e7e1d3", "#cfc6b4", "#9d9484", "#1d1d1d"] },
];

export const paletteById = (id: string) => PALETTES.find((p) => p.id === id) ?? PALETTES[0];

/** Readable text colour on a ground (simple luminance test). */
export function onColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const l = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return l > 140 ? "#1d1d1d" : "#ffffff";
}
