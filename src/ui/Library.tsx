// Left panel: the design library (search in English and Persian, filters by family, period, place,
// provenance, symmetry and palette) and the documented reference catalogue.
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, BookOpen, Shapes, Landmark } from "lucide-react";
import { DESIGNS, type Design } from "../library/designs";
import { REFERENCES, referenceImage } from "../library/references";
import { FAMILIES, type Family } from "../generators/types";
import { PALETTES, paletteById } from "../color/palettes";
import { thumbnail } from "../library/thumbs";
import { openDesign } from "../state/actions";
import { setState, useStore } from "../state/store";
import { HelpButton } from "./Help";

const PROV: Record<string, string> = { reconstruction: "Reconstruction", adaptation: "Adaptation", original: "Original" };
const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[ً-ٰٟ]/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/‌/g, " ");

function Thumb({ id, alt }: { id: string; alt: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); thumbnail(id, setUrl); } }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [id]);
  return <div className="thumb" ref={ref}>{url ? <img src={url} alt={alt} loading="lazy" decoding="async" /> : <span className="thumb-wait" aria-hidden="true" />}</div>;
}

export function Library() {
  const [tab, setTab] = useState<"designs" | "references">("designs");
  const [q, setQ] = useState("");
  const [family, setFamily] = useState<Family | "all">("all");
  const [period, setPeriod] = useState("all");
  const [prov, setProv] = useState("all");
  const [palette, setPalette] = useState("all");
  const current = useStore((s) => s.designId);
  const refId = useStore((s) => s.referenceId);

  const periods = useMemo(() => [...new Set(DESIGNS.map((d) => d.period))].sort(), []);
  const list = useMemo(() => {
    const nq = norm(q.trim());
    return DESIGNS.filter((d) => (family === "all" || d.family === family) && (period === "all" || d.period === period) && (prov === "all" || d.provenance === prov) && (palette === "all" || d.palette === palette)
      && (!nq || norm([d.title, d.titleFa, FAMILIES[d.family].name, FAMILIES[d.family].fa, FAMILIES[d.family].translit, d.period, d.region, d.symmetry, paletteById(d.palette).name, d.provenance].join(" ")).includes(nq)));
  }, [q, family, period, prov, palette]);
  const refs = useMemo(() => {
    const nq = norm(q.trim());
    return REFERENCES.filter((r) => (family === "all" || r.families.includes(family === "haftrang" ? "haft-rang" : family)) && (!nq || norm([r.title, r.institution, r.accession ?? "", r.origin, r.date, r.technique, r.elements.join(" ")].join(" ")).includes(nq)));
  }, [q, family]);

  return (
    <div className="lib">
      <div className="lib-head">
        <div className="segmented lib-tabs" role="tablist" aria-label="Library">
          <button role="tab" aria-selected={tab === "designs"} className={tab === "designs" ? "on" : ""} onClick={() => setTab("designs")}><Shapes size={14} />Designs <span className="count">{DESIGNS.length}</span></button>
          <button role="tab" aria-selected={tab === "references"} className={tab === "references" ? "on" : ""} onClick={() => setTab("references")}><Landmark size={14} />References <span className="count">{REFERENCES.length}</span></button>
          <HelpButton topic="library" />
        </div>
        <label className="search"><Search size={15} aria-hidden="true" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, e.g. girih, شمسه, Kashan" aria-label="Search designs in English or Persian" data-tip="Search in English or Persian: names, families, periods, places, palettes" /></label>
        <div className="cat-chips" role="group" aria-label="Ornament family">
          <button className={`chip ${family === "all" ? "on" : ""}`} onClick={() => setFamily("all")}>All</button>
          {(Object.keys(FAMILIES) as Family[]).map((f) => (
            <button key={f} className={`chip ${family === f ? "on" : ""}`} onClick={() => setFamily(family === f ? "all" : f)} data-tip={`${FAMILIES[f].name}, ${FAMILIES[f].fa} (${FAMILIES[f].translit}): ${FAMILIES[f].blurb}`}>
              {FAMILIES[f].name.replace(" and corners", "").replace("Architectural compositions", "Architecture").replace("Calligraphic ornament", "Calligraphy")}
            </button>
          ))}
        </div>
        {tab === "designs" && (
          <div className="filter-grid">
            <label className="field">Period style<select value={period} onChange={(e) => setPeriod(e.target.value)} data-tip="Period the design draws on"><option value="all">All periods</option>{periods.map((p) => <option key={p}>{p}</option>)}</select></label>
            <label className="field">Provenance<select value={prov} onChange={(e) => setProv(e.target.value)} data-tip="Reconstruction, adaptation or original"><option value="all">All</option><option value="reconstruction">Reconstructions</option><option value="adaptation">Adaptations</option><option value="original">Originals</option></select></label>
            <label className="field span2">Colours<select value={palette} onChange={(e) => setPalette(e.target.value)} data-tip="Designs shown in a palette"><option value="all">All palettes</option>{PALETTES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          </div>
        )}
      </div>
      <div className="lib-scroll">
        {tab === "designs" ? (
          <>
            <p className="lib-count" aria-live="polite">{list.length} designs</p>
            <ul className="cards">
              {list.map((d) => <DesignCard key={d.id} d={d} current={d.id === current} />)}
            </ul>
            {!list.length && <p className="legend-note empty">No designs match. Clear the search or filters.</p>}
          </>
        ) : (
          <>
            <p className="lib-count">{refs.length} documented references</p>
            <ul className="ref-cards">
              {refs.map((r) => {
                const img = referenceImage(r);
                return (
                  <li key={r.id} className={`rcard ${r.id === refId ? "current" : ""}`}>
                    <button className="rcard-open" onClick={() => setState({ referenceId: r.id, tab: "reference", pane: "inspector" })} data-tip="Show the source, history and tracing options">
                      {img ? <img src={img} alt={r.title} loading="lazy" decoding="async" /> : <span className="noimg"><BookOpen size={18} /></span>}
                      <span className="rcard-text"><span className="rcard-title">{r.title}</span><span className="rcard-meta">{r.kind === "site" ? "Building" : r.institution.replace("The Metropolitan Museum of Art, New York", "The Met").replace("The Cleveland Museum of Art", "Cleveland")}{r.accession ? ` · ${r.accession}` : ""}</span><span className="rcard-meta">{r.date}</span></span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function DesignCard({ d, current }: { d: Design; current: boolean }) {
  return (
    <li className={`dcard ${current ? "current" : ""}`}>
      <button className="dcard-open" onClick={() => void openDesign(d)} aria-label={`Open ${d.title}`}>
        <Thumb id={d.id} alt="" />
        <span className="dcard-title">{d.title}</span>
        <span className="dcard-fa fa" lang="fa" dir="rtl">{d.titleFa}</span>
        <span className="dcard-meta"><span className={`prov prov-${d.provenance}`}>{PROV[d.provenance]}</span>{FAMILIES[d.family].name} · {d.period}</span>
      </button>
    </li>
  );
}
