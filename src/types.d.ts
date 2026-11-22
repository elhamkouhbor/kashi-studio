declare module "@svgedit/svgcanvas/svgcanvas.js" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SvgCanvas: any;
  export default SvgCanvas;
}
declare module "@svgedit/svgcanvas/core/history.js" {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  export class Command { constructor(...a: any[]); }
  export class BatchCommand { constructor(text?: string); addSubCommand(c: any): void; isEmpty(): boolean; }
  export class ChangeElementCommand { constructor(elem: Element, attrs: Record<string, string | null>, text?: string); }
  export class InsertElementCommand { constructor(elem: Element, text?: string); }
  export class MoveElementCommand { constructor(elem: Element, oldNextSibling: Node | null, oldParent: Node | null, text?: string); }
  export class RemoveElementCommand { constructor(elem: Element, oldNextSibling: Node | null, oldParent: Node | null, text?: string); }
}
declare module "paper/dist/paper-core.js" {
  import paper from "paper";
  export default paper;
}
declare module "*.woff?url" { const url: string; export default url; }
declare module "jsdom" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const JSDOM: any;
}
