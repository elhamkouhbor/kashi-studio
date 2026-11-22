// A tiny SVG node tree that every generator returns. It serialises to clean, readable SVG with named
// groups, so the result opens as layered, editable artwork in the editor and in other vector apps.
import { Path } from "../geometry/path";
import { fmt, type Mat, matToSvg, isIdentity, type Pt } from "../geometry/vec";

export type Attrs = Record<string, string | number | undefined | null>;
export interface SvgNode {
  tag: string;
  attrs?: Attrs;
  children?: SvgNode[];
  /** Text content (for <text>, <title>). */
  text?: string;
}

export const g = (name: string, children: SvgNode[], attrs: Attrs = {}): SvgNode => ({
  tag: "g",
  attrs: { "data-name": name, ...attrs },
  children: children.filter(Boolean),
});

export const path = (d: Path | string, attrs: Attrs = {}): SvgNode => ({ tag: "path", attrs: { d: typeof d === "string" ? d : d.toString(), ...attrs } });

export const poly = (pts: Pt[], attrs: Attrs = {}, close = true): SvgNode => path(Path.poly(pts, close), attrs);

export const rect = (x: number, y: number, w: number, h: number, attrs: Attrs = {}): SvgNode => ({ tag: "rect", attrs: { x: fmt(x), y: fmt(y), width: fmt(w), height: fmt(h), ...attrs } });

export const circle = (c: Pt, r: number, attrs: Attrs = {}): SvgNode => ({ tag: "circle", attrs: { cx: fmt(c[0]), cy: fmt(c[1]), r: fmt(r), ...attrs } });

export const withTransform = (n: SvgNode, m: Mat): SvgNode => (isIdentity(m) ? n : { ...n, attrs: { ...n.attrs, transform: matToSvg(m) } });

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function serialize(n: SvgNode, indent = 0): string {
  const pad = indent >= 0 ? "\n" + "  ".repeat(indent) : "";
  const attrs = Object.entries(n.attrs ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => ` ${k}="${esc(String(v))}"`)
    .join("");
  if (n.text !== undefined) return `${pad}<${n.tag}${attrs}>${esc(n.text)}</${n.tag}>`;
  if (!n.children?.length) return `${pad}<${n.tag}${attrs}/>`;
  const inner = n.children.map((c) => serialize(c, indent >= 0 ? indent + 1 : -1)).join("");
  return `${pad}<${n.tag}${attrs}>${inner}${pad}</${n.tag}>`;
}

/** Count leaf elements (for tests and complexity budgets). */
export function countLeaves(n: SvgNode): number {
  if (!n.children?.length) return n.tag === "g" ? 0 : 1;
  return n.children.reduce((s, c) => s + countLeaves(c), 0);
}

/** Merge many path nodes with identical style into one path (keeps files small where pieces need no individual editing). */
export function mergePaths(nodes: SvgNode[]): SvgNode[] {
  const by = new Map<string, { attrs: Attrs; d: string[] }>();
  for (const n of nodes) {
    if (n.tag !== "path") continue;
    const { d, ...rest } = n.attrs ?? {};
    const k = JSON.stringify(rest);
    if (!by.has(k)) by.set(k, { attrs: rest, d: [] });
    by.get(k)!.d.push(String(d));
  }
  return [...by.values()].map((v) => ({ tag: "path", attrs: { d: v.d.join(""), ...v.attrs } }));
}
