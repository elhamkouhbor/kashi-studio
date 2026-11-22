import { buildGirih } from "../src/geometry/girih/pattern";
import { SYSTEMS } from "../src/geometry/girih/systems";
for (const key of Object.keys(SYSTEMS)) {
  const res: string[] = [];
  for (const [c, r] of [[1, 1], [2, 2], [1, 2], [2, 1]]) {
    const g = buildGirih({ system: key, angle: SYSTEMS[key].angle, gap: Number(process.argv[2] || 0), width: 100 * c, cols: c, rows: r, centred: false });
    res.push(`${c}x${r}:${g.weaveSeamless}`);
  }
  console.log(key.padEnd(14), res.join("  "));
}
