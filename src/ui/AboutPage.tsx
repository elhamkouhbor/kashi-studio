// About: what Kashi Studio is, how it works, the research behind it, coverage, sources and licences.
import { ArrowLeft, ExternalLink } from "lucide-react";
import { navigate } from "../App";
import { LogoFull } from "./Logo";
import { BRAND } from "../app/brand";
import { COVERAGE } from "../library/coverage";
import { REFERENCES } from "../library/references";
import { DESIGNS } from "../library/designs";

const SOFTWARE: [string, string, string, string][] = [
  ["SVG-Edit svgcanvas", "MIT", "https://github.com/SVG-Edit/svgedit", "The vector editing engine: selection, transforms, pen and nodes, layers, undo."],
  ["islamic-patterns (ported)", "MIT, © 2026 Olivier Giulieri", "https://github.com/evoluteur/islamic-patterns", "Tilings, Hankin construction, strand joining and over/under weave, ported to TypeScript."],
  ["Paper.js", "MIT", "https://github.com/paperjs/paper.js", "Boolean path operations."],
  ["HarfBuzz (harfbuzzjs)", "MIT", "https://github.com/harfbuzz/harfbuzzjs", "Arabic-script text shaping for text to outlines."],
  ["DOMPurify", "MPL 2.0 or Apache 2.0", "https://github.com/cure53/DOMPurify", "Sanitising imported SVG."],
  ["pathseg", "Chromium licence (BSD style)", "https://github.com/progers/pathseg", "SVGPathSeg polyfill needed by svgcanvas."],
  ["React", "MIT", "https://react.dev", "Interface."],
  ["Lucide icons", "ISC", "https://lucide.dev", "Interface icons."],
  ["Vazirmatn", "SIL Open Font License 1.1", "https://github.com/rastikerdar/vazirmatn", "Persian typeface (via Fontsource)."],
  ["Noto Naskh Arabic", "SIL Open Font License 1.1", "https://fonts.google.com/noto/specimen/Noto+Naskh+Arabic", "Naskh typeface (via Fontsource)."],
];

export default function AboutPage() {
  const withImages = REFERENCES.filter((r) => r.imageFile);
  return (
    <div className="about-page">
      <header className="about-head"><button className="btn" onClick={() => navigate("/")}><ArrowLeft size={15} />Back to the studio</button><LogoFull /></header>
      <main className="about-main">
        <h1>Kashi Studio <span className="fa" lang="fa">کاشی</span></h1>
        <p className="lead">A vector studio for Persian and Iranian ornamental tiles, by {BRAND.author}. Choose from {DESIGNS.length} curated designs, change their geometry, edit any path, and export editable SVG at true size. Everything runs in your browser: no account, no server, no AI, nothing uploaded.</p>

        <section className="about-card">
          <h2>How it is built</h2>
          <p>The editor is SVG-Edit's svgcanvas engine, which edits the SVG itself, so the document on screen is the file you export. Kashi Studio adds the ornament generators, the design library, the tile and repeat model, symmetry, the ornament brush, booleans (Paper.js), text shaping (HarfBuzz), the previews and the export pipeline. All geometry is in millimetres.</p>
          <p>Girih patterns use Hankin's polygons in contact method as formalised by Craig S. Kaplan, on periodic tilings and on the girih tiles described by Peter J. Lu and Paul J. Steinhardt (Science 315, 2007). Every pattern tile is a whole number of periods, so it repeats without seams.</p>
        </section>

        <section className="about-card">
          <h2>Provenance of designs</h2>
          <ul>
            <li><b>Reconstruction</b>: the geometric scheme follows a documented object. Painted details are not reproduced unless stated.</li>
            <li><b>Adaptation</b>: based on a documented reference with deliberate changes, described on the design.</li>
            <li><b>Original</b>: a new composition in a Persian idiom. Its period tag names the style it draws on, not an origin.</li>
          </ul>
          <p>No design is presented as an exact historical reproduction. Inscription bands are left empty: no religious or historical text is invented.</p>
        </section>

        <section className="about-card">
          <h2>Coverage of ornament families</h2>
          <div className="table-wrap">
            <table className="coverage">
              <thead><tr><th>Family</th><th>Status</th><th>What works</th><th>Limits</th></tr></thead>
              <tbody>{COVERAGE.map((c) => <tr key={c.family}><td>{c.family} <span className="fa" lang="fa">{c.fa}</span></td><td><span className={`status status-${c.status.replace(" ", "-")}`}>{c.status}</span></td><td>{c.what}</td><td>{c.limits}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section className="about-card">
          <h2>Historical references</h2>
          <p>{REFERENCES.length} documented references: {REFERENCES.filter((r) => r.kind === "object").length} museum objects from the open access collections of The Metropolitan Museum of Art and The Cleveland Museum of Art, and {REFERENCES.filter((r) => r.kind === "site").length} buildings. Facts come from the museum records. Where a museum hedges an attribution, the hedge is kept. Colours are estimates from photographs.</p>
          <h3>Image credits ({withImages.length})</h3>
          <ul className="credits">{withImages.map((r) => <li key={r.id}><a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">{r.title}</a>{r.accession ? `, ${r.accession}` : ""}. {r.imageRights}. {r.imageCredit}</li>)}</ul>
        </section>

        <section className="about-card">
          <h2>Software and fonts</h2>
          <ul>{SOFTWARE.map(([n, l, u, w]) => <li key={n}><a href={u} target="_blank" rel="noopener noreferrer">{n} <ExternalLink size={11} /></a> · {l}. {w}</li>)}</ul>
          <p>Kashi Studio itself is released under the MIT licence. Source: <a href={BRAND.repository}>{BRAND.repository}</a>.</p>
        </section>

        <section className="about-card">
          <h2>Privacy</h2>
          <p>Projects and images you add stay in this browser (IndexedDB). There are no accounts, cookies for tracking, analytics or external services. Opening a source link visits the museum's website.</p>
        </section>
        <p className="muted">Other tools by {BRAND.author}: {BRAND.siblings.map((s, i) => <span key={s.url}>{i ? ", " : ""}<a href={s.url}>{s.name}</a></span>)}. <a href={BRAND.portfolio}>Portfolio</a>.</p>
      </main>
    </div>
  );
}
