// Repeat preview: the tile repeated by translation, mirroring or rotation, with a seam test that compares
// the colours on opposite edges of the tile.
import { useEffect, useState } from "react";
import { X, CheckCircle2, AlertTriangle } from "lucide-react";
import { tileImageUrl, seamCheck } from "./previewSource";

export type Arrangement = "translate" | "mirror" | "rotate";
export function RepeatPreview({ onClose }: { onClose: () => void }) {
  const [src, setSrc] = useState<{ url: string; w: number; h: number } | null>(null);
  const [n, setN] = useState(4);
  const [arr, setArr] = useState<Arrangement>("translate");
  const [seams, setSeams] = useState(true);
  const [check, setCheck] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const s = tileImageUrl();
    setSrc(s);
    if (s) seamCheck(s.url, s.w, s.h).then(setCheck).catch(() => setCheck(null));
    return () => { if (s) URL.revokeObjectURL(s.url); };
  }, []);
  if (!src) return null;
  const { w, h } = src;
  const tiles = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let t = `translate(${i * w} ${j * h})`;
    if (arr === "mirror") t += ` translate(${i % 2 ? w : 0} ${j % 2 ? h : 0}) scale(${i % 2 ? -1 : 1} ${j % 2 ? -1 : 1})`;
    if (arr === "rotate" && Math.abs(w - h) < 1e-6) t += ` rotate(${[0, 90, 270, 180][(i % 2) + 2 * (j % 2)]} ${w / 2} ${h / 2})`;
    tiles.push(<image key={`${i}-${j}`} href={src.url} width={w} height={h} transform={t} />);
  }
  const ok = check && check.x < 0.02 && check.y < 0.02;
  return (
    <div className="preview-layer" role="region" aria-label="Repeat preview">
      <div className="preview-bar">
        <strong>Repeat preview</strong>
        <div className="segmented" role="group" aria-label="Arrangement">
          {(["translate", "mirror", "rotate"] as Arrangement[]).map((a) => <button key={a} className={arr === a ? "on" : ""} onClick={() => setArr(a)} aria-pressed={arr === a} disabled={a === "rotate" && Math.abs(w - h) > 1e-6} data-tip={a === "translate" ? "Repeat by translation" : a === "mirror" ? "Mirror every other tile" : "Rotate tiles by quarter turns (square tiles)"}>{a === "translate" ? "Translate" : a === "mirror" ? "Mirror" : "Rotate"}</button>)}
        </div>
        <label className="inline-field" data-tip="Tiles across and down">Tiles <input type="range" min={2} max={8} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="Tiles across" /> {n} × {n}</label>
        <label className="toggle"><input type="checkbox" checked={seams} onChange={(e) => setSeams(e.target.checked)} />Show tile edges</label>
        {check && arr === "translate" && (ok
          ? <span className="ok-text" data-testid="seam-ok"><CheckCircle2 size={15} />Edges match: repeats without seams</span>
          : <span className="warn-text" data-testid="seam-warn"><AlertTriangle size={15} />Edges differ ({Math.round(check.x * 100)}% left/right, {Math.round(check.y * 100)}% top/bottom)</span>)}
        <button className="btn" onClick={onClose}><X size={15} />Back to vector</button>
      </div>
      <div className="preview-canvas">
        <svg viewBox={`0 0 ${w * n} ${h * n}`} role="img" aria-label={`The tile repeated ${n} by ${n}`}>
          {tiles}
          {seams && <path d={Array.from({ length: n + 1 }, (_, i) => `M${i * w} 0V${h * n}M0 ${i * h}H${w * n}`).join("")} stroke="#e5484d" strokeOpacity=".7" strokeWidth={Math.max(w, h) * n * 0.0015} fill="none" strokeDasharray={`${w * 0.03} ${w * 0.02}`} />}
        </svg>
      </div>
    </div>
  );
}
