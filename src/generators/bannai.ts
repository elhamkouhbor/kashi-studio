// Banna'i (بنایی): patterns of plain and glazed bricks laid on a square grid, and hazarbaf (هزارباف)
// brick bonds. Patterns are computed cell by cell. The square kufic grid takes its cells from the user,
// so lettering is always the user's own text and never an invented inscription.
import { Path } from "../geometry/path";
import { g, path, rect, type SvgNode } from "../ornament/node";
import { bool, num, str, type Generator } from "./types";

export const BANNAI_PATTERNS = [
  { value: "lozenges", label: "Nested lozenges" },
  { value: "squares", label: "Nested squares" },
  { value: "zigzag", label: "Zigzag bands" },
  { value: "steps", label: "Stepped crosses" },
  { value: "checker", label: "Diagonal chequer" },
  { value: "grid", label: "Square kufic grid (paint your own)" },
] as const;

export function bannaiCell(kind: string, i: number, j: number, n: number, k: number): number {
  const c = (n - 1) / 2;
  switch (kind) {
    case "lozenges": return (Math.abs(i - c) + Math.abs(j - c)) % k === 0 ? 1 : 0;
    case "squares": return Math.max(Math.abs(i - c), Math.abs(j - c)) % k === 0 ? 1 : 0;
    case "zigzag": { const p = 2 * k; const z = Math.abs((j % p) - k); return (i + z) % (k + 1) === 0 ? 1 : 0; }
    case "steps": { const a = Math.abs(i - c), b = Math.abs(j - c); return (Math.min(a, b) % k === 0 && Math.max(a, b) % k !== 0) || (a % k === 0 && b % k === 0) ? 1 : 0; }
    case "checker": return (i + j) % k === 0 || Math.abs(i - j) % k === 0 ? 1 : 0;
    default: return 0;
  }
}

export const bannaiGenerator: Generator = {
  id: "bannai",
  family: "bannai",
  name: "Banna'i brick pattern",
  nameFa: "بنایی",
  params: [
    { key: "pattern", label: "Pattern", type: "select", options: [...BANNAI_PATTERNS] },
    { key: "cells", label: "Bricks across", type: "int", min: 5, max: 41 },
    { key: "step", label: "Spacing", type: "int", min: 2, max: 8 },
    { key: "brick", label: "Brick size", type: "range", min: 2, max: 60, step: 0.5, unit: "mm" },
    { key: "joint", label: "Mortar joint", type: "range", min: 0, max: 0.3, step: 0.01 },
    { key: "grid", label: "Kufic cells (rows of 0, 1 and 2)", type: "text" },
    { key: "bond", label: "Show brick bond in plain areas", type: "bool" },
  ],
  defaults: { pattern: "lozenges", cells: 17, step: 4, brick: 10, joint: 0.12, grid: "", bond: true },
  size: (p) => { const n = num(p, "cells"); return { w: n * num(p, "brick"), h: n * num(p, "brick") }; },
  build(p, ctx) {
    const n = num(p, "cells"), b = num(p, "brick"), j = num(p, "joint") * b, k = num(p, "step"), pal = ctx.palette;
    const glazed = [new Path(), new Path()], plain = new Path();
    const rows = String(p.grid ?? "").split(/[\s,;|]+/).filter(Boolean);
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        let v = str(p, "pattern") === "grid" ? Number(rows[r]?.[c] ?? 0) : bannaiCell(str(p, "pattern"), r, c, n, k);
        if (!Number.isFinite(v)) v = 0;
        const cell = Path.poly([[c * b + j / 2, r * b + j / 2], [(c + 1) * b - j / 2, r * b + j / 2], [(c + 1) * b - j / 2, (r + 1) * b - j / 2], [c * b + j / 2, (r + 1) * b - j / 2]]);
        if (v > 0) glazed[(v - 1) % 2].append(cell);
        else if (bool(p, "bond")) {
          // plain cells as two half bricks, alternating direction, like a basket bond
          const horiz = (r + c) % 2 === 0;
          const x0 = c * b + j / 2, y0 = r * b + j / 2, s = b - j;
          if (horiz) { plain.append(Path.poly([[x0, y0], [x0 + s, y0], [x0 + s, y0 + s / 2 - j / 4], [x0, y0 + s / 2 - j / 4]])).append(Path.poly([[x0, y0 + s / 2 + j / 4], [x0 + s, y0 + s / 2 + j / 4], [x0 + s, y0 + s], [x0, y0 + s]])); }
          else { plain.append(Path.poly([[x0, y0], [x0 + s / 2 - j / 4, y0], [x0 + s / 2 - j / 4, y0 + s], [x0, y0 + s]])).append(Path.poly([[x0 + s / 2 + j / 4, y0], [x0 + s, y0], [x0 + s, y0 + s], [x0 + s / 2 + j / 4, y0 + s]])); }
        } else plain.append(cell);
      }
    const W = n * b;
    const parts: SvgNode[] = [
      rect(0, 0, W, W, { fill: pal.line, "data-name": "Mortar" }),
      path(plain, { fill: pal.ground, "data-name": "Plain bricks" }),
      path(glazed[0], { fill: pal.colors[0], "data-name": "Glazed bricks" }),
    ];
    if (glazed[1].segs.length) parts.push(path(glazed[1], { fill: pal.colors[1], "data-name": "Glazed bricks, second colour" }));
    const guides = new Path();
    for (let i = 0; i <= n; i++) guides.M([i * b, 0]).L([i * b, W]).M([0, i * b]).L([W, i * b]);
    return { art: g("Banna'i", parts), guides: g("Brick grid", [path(guides, { fill: "none", stroke: "#c0392b", "stroke-width": 0.2 })]) };
  },
};

/** A small hazarbaf (brick bond) generator: herringbone, basket and running bond. */
export const hazarbafGenerator: Generator = {
  id: "hazarbaf",
  family: "bannai",
  name: "Hazarbaf brick bond",
  nameFa: "هزارباف",
  params: [
    { key: "bond", label: "Bond", type: "select", options: [{ value: "herringbone", label: "Herringbone" }, { value: "basket", label: "Basket weave" }, { value: "running", label: "Running bond" }, { value: "stack", label: "Stretcher and header rows" }] },
    { key: "size", label: "Panel size", type: "range", min: 60, max: 1200, step: 1, unit: "mm" },
    { key: "brick", label: "Brick length", type: "range", min: 8, max: 120, step: 1, unit: "mm" },
    { key: "joint", label: "Joint", type: "range", min: 0.5, max: 8, step: 0.1, unit: "mm" },
    { key: "glaze", label: "Glazed accents every", type: "int", min: 0, max: 9 },
  ],
  defaults: { bond: "herringbone", size: 240, brick: 40, joint: 2.5, glaze: 5 },
  size: (p) => ({ w: num(p, "size"), h: num(p, "size") }),
  build(p, ctx) {
    const S = num(p, "size"), L = num(p, "brick"), J = num(p, "joint"), pal = ctx.palette, H = L / 2;
    const plain = new Path(), glaze = new Path();
    let count = 0;
    const brick = (x: number, y: number, w: number, h: number) => {
      if (x > S || y > S || x + w < 0 || y + h < 0) return;
      const r = Path.poly([[x + J / 2, y + J / 2], [x + w - J / 2, y + J / 2], [x + w - J / 2, y + h - J / 2], [x + J / 2, y + h - J / 2]]);
      count++;
      const gEvery = num(p, "glaze");
      (gEvery && count % gEvery === 0 ? glaze : plain).append(r);
    };
    const bond = str(p, "bond");
    if (bond === "running") for (let r = 0; r * H < S; r++) for (let x = -(r % 2) * H; x < S; x += L) brick(x, r * H, L, H);
    else if (bond === "stack") for (let r = 0; r * H < S; r++) { const w = r % 2 ? H : L; for (let x = -(r % 4 === 1 ? H / 2 : 0); x < S; x += w) brick(x, r * H, w, H); }
    else if (bond === "basket") for (let i = 0; i * L < S; i++) for (let j = 0; j * L < S; j++) { if ((i + j) % 2) { brick(i * L, j * L, L, H); brick(i * L, j * L + H, L, H); } else { brick(i * L, j * L, H, L); brick(i * L + H, j * L, H, L); } }
    else {
      // herringbone: staircases of one horizontal and one vertical brick, repeated by (2, −2) half bricks
      const n = Math.ceil(S / H) + 4;
      for (let st = -n; st <= n; st++) for (let k = -n; k <= 2 * n; k++) {
        const x = (k + 2 * st) * H, y = (k - 2 * st) * H;
        brick(x, y, L, H);
        brick(x, y + H, H, L);
      }
    }
    const parts: SvgNode[] = [rect(0, 0, S, S, { fill: pal.line, "data-name": "Mortar" }), path(plain, { fill: pal.ground, "data-name": "Bricks" }), path(glaze, { fill: pal.colors[0], "data-name": "Glazed bricks" })];
    return { art: g("Hazarbaf", parts, { "clip-path": `url(#${ctx.uid}-clip)` }), defs: [{ tag: "clipPath", attrs: { id: `${ctx.uid}-clip` }, children: [rect(0, 0, S, S)] }] };
  },
};
