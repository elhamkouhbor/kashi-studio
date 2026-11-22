// Boolean path operations with Paper.js (curve-preserving), loaded only when a boolean command is used.
// Paper.js runs headless here: no canvas view, only its path model.
import paper from "paper/dist/paper-core.js";

let ready = false;
function setup() {
  if (ready) return;
  paper.setup(new paper.Size(1, 1));
  ready = true;
}

/** Combine path data strings with unite, subtract (first minus the rest), intersect or exclude. */
export function booleanPathData(datas: string[], op: "unite" | "subtract" | "intersect" | "exclude"): string {
  setup();
  const items = datas.map((d) => {
    const m = /^__M([^_]+)__/.exec(d);
    const item = new paper.CompoundPath(m ? d.slice(m[0].length) : d);
    if (m) { const [a, b, c, dd, e, f] = m[1].split(",").map(Number); item.transform(new paper.Matrix(a, b, c, dd, e, f)); }
    return item;
  });
  let acc: paper.PathItem = items[0];
  for (const it of items.slice(1)) acc = acc[op](it, { insert: false }) as paper.PathItem;
  const d = acc.pathData;
  for (const it of items) it.remove();
  if (!d) throw new Error("The operation produced an empty shape.");
  return d;
}
