// Shapes are coloured paths in a composition. Transforms are baked into the path data, so the exported
// artwork contains plain, editable outlines rather than stacks of nested transforms.
import { Path } from "../geometry/path";
import { type Mat, type Pt, TAU, matMul, reflectM, rotateM } from "../geometry/vec";
import { g, path, type SvgNode } from "./node";

export interface Shape { d: Path; fill?: string; stroke?: string; sw?: number; name: string; layer?: string }

export const xf = (shapes: Shape[], m: Mat): Shape[] => shapes.map((s) => ({ ...s, d: s.d.transform(m) }));

/** Copies for a dihedral (mirror and rotation) or cyclic symmetry about c. */
export function symmetric(shapes: Shape[], n: number, mirror: boolean, c: Pt = [0, 0], a0 = 0): Shape[] {
  const out: Shape[] = [];
  for (let k = 0; k < n; k++) {
    const R = rotateM((k / n) * TAU, c);
    out.push(...xf(shapes, R));
    if (mirror) out.push(...xf(shapes, matMul(R, reflectM(a0, c))));
  }
  return out;
}

/** Group shapes by layer name, merging shapes with identical style inside a layer when asked. */
export function toNodes(shapes: Shape[], merge = false): SvgNode[] {
  const layers = new Map<string, Shape[]>();
  for (const s of shapes) {
    const k = s.layer ?? s.name;
    if (!layers.has(k)) layers.set(k, []);
    layers.get(k)!.push(s);
  }
  const attrsOf = (s: Shape) => ({
    fill: s.fill ?? "none",
    stroke: s.stroke,
    "stroke-width": s.stroke ? s.sw ?? 0.5 : undefined,
    "stroke-linejoin": s.stroke ? "round" : undefined,
    "stroke-linecap": s.stroke ? "round" : undefined,
  });
  const out: SvgNode[] = [];
  for (const [name, list] of layers) {
    if (merge) {
      const by = new Map<string, Path>();
      const attrs = new Map<string, ReturnType<typeof attrsOf>>();
      for (const s of list) {
        const a = attrsOf(s), k = JSON.stringify(a);
        if (!by.has(k)) { by.set(k, new Path()); attrs.set(k, a); }
        by.get(k)!.append(s.d);
      }
      out.push(g(name, [...by.entries()].map(([k, d]) => path(d, attrs.get(k)!))));
    } else out.push(g(name, list.map((s) => path(s.d, { ...attrsOf(s), "data-name": s.name }))));
  }
  return out;
}
