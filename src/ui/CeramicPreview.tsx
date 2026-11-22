// Ceramic preview: the tile shown as glazed tiles on a wall, with grout joints, a soft directional light,
// a faint glaze sheen and surface variation. A presentation only: the artwork itself stays flat vectors.
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { tileImageUrl } from "./previewSource";
import { rng } from "../geometry/vec";

export function CeramicPreview({ onClose }: { onClose: () => void }) {
  const [src, setSrc] = useState<{ url: string; w: number; h: number } | null>(null);
  const [n, setN] = useState(3);
  const [grout, setGrout] = useState(2);
  const [gloss, setGloss] = useState(0.5);
  const [light, setLight] = useState(225);
  const [lustre, setLustre] = useState(false);
  useEffect(() => { const s = tileImageUrl(); setSrc(s); return () => { if (s) URL.revokeObjectURL(s.url); }; }, []);
  const jitter = useMemo(() => { const r = rng(5); return Array.from({ length: 100 }, () => ({ b: 0.96 + r() * 0.08, dx: (r() - 0.5) * 0.4, dy: (r() - 0.5) * 0.4 })); }, []);
  if (!src) return null;
  const { w, h } = src, g = grout, W = n * (w + g) + g, H = n * (h + g) + g;
  const tiles = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const v = jitter[(j * n + i) % jitter.length];
    const x = g + i * (w + g) + v.dx, y = g + j * (h + g) + v.dy;
    tiles.push(
      <g key={`${i}-${j}`} transform={`translate(${x} ${y})`}>
        <image href={src.url} width={w} height={h} style={{ filter: `brightness(${v.b})` }} />
        <rect width={w} height={h} fill="url(#edge)" />
        <rect width={w} height={h} rx={Math.min(w, h) * 0.006} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth={Math.max(w, h) * 0.004} />
      </g>,
    );
  }
  return (
    <div className="preview-layer ceramic" role="region" aria-label="Ceramic preview">
      <div className="preview-bar">
        <strong>Ceramic preview</strong>
        <label className="inline-field">Tiles <input type="range" min={1} max={8} value={n} onChange={(e) => setN(Number(e.target.value))} aria-label="Tiles across" /> {n} × {n}</label>
        <label className="inline-field">Grout <input type="range" min={0} max={8} step={0.5} value={grout} onChange={(e) => setGrout(Number(e.target.value))} aria-label="Grout joint in mm" /> {grout} mm</label>
        <label className="inline-field">Gloss <input type="range" min={0} max={1} step={0.05} value={gloss} onChange={(e) => setGloss(Number(e.target.value))} aria-label="Glaze gloss" /></label>
        <label className="inline-field">Light <input type="range" min={0} max={359} value={light} onChange={(e) => setLight(Number(e.target.value))} aria-label="Light direction" /></label>
        <label className="toggle" data-tip="A metallic sheen for lustre designs"><input type="checkbox" checked={lustre} onChange={(e) => setLustre(e.target.checked)} />Lustre sheen</label>
        <button className="btn" onClick={onClose}><X size={15} />Back to vector</button>
      </div>
      <div className="preview-canvas wall">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Glazed tile wall preview">
          <defs>
            <linearGradient id="edge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity={0.16 * gloss} />
              <stop offset=".45" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity={0.12} />
            </linearGradient>
            <filter id="glaze" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency={`${18 / Math.max(w, h)} ${18 / Math.max(w, h)}`} numOctaves={2} seed={4} result="noise" />
              <feGaussianBlur in="noise" stdDeviation={Math.max(w, h) * 0.008} result="bump" />
              <feSpecularLighting in="bump" surfaceScale={lustre ? 1.6 : 0.7} specularConstant={0.18 + gloss * (lustre ? 1.1 : 0.7)} specularExponent={lustre ? 14 : 34} lightingColor={lustre ? "#ffe3a8" : "#ffffff"} result="spec">
                <feDistantLight azimuth={light} elevation={38} />
              </feSpecularLighting>
              <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn" />
              <feComposite in="SourceGraphic" in2="specIn" operator="arithmetic" k1={0} k2={1} k3={0.55} k4={0} />
            </filter>
            <linearGradient id="room" gradientTransform={`rotate(${light - 180} .5 .5)`}>
              <stop offset="0" stopColor="#fff" stopOpacity=".10" />
              <stop offset="1" stopColor="#000" stopOpacity=".22" />
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="#cbc3b4" />
          <g filter="url(#glaze)">{tiles}</g>
          <rect width={W} height={H} fill="url(#room)" style={{ mixBlendMode: "multiply" }} />
        </svg>
      </div>
      <p className="preview-note">A presentation of the flat artwork as glazed tiles. The exported files stay editable vectors.</p>
    </div>
  );
}
