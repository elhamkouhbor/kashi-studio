// The documented reference catalogue (research/catalogue.json, compiled from the Met and Cleveland
// open access APIs and documented sites). Images are bundled only when their licence allows it
// (public domain, CC0 or CC BY) and live in public/references as WebP.
import catalogue from "./catalogue.json";

export interface Reference {
  id: string;
  kind: "object" | "site";
  title: string;
  institution: string;
  accession: string | null;
  origin: string;
  period: string;
  date: string;
  technique: string;
  elements: string[];
  colours: { name: string; hex: string }[];
  geometry: string;
  symmetry: string;
  families: string[];
  sourceUrl: string;
  apiUrl: string | null;
  imageFile: string | null;
  imageRights: string;
  imageCredit: string;
  notes: string;
  uncertainty: string;
}

export const REFERENCES: Reference[] = catalogue as Reference[];
export const referenceById = (id: string) => REFERENCES.find((r) => r.id === id);
/** URL of the bundled WebP image, if the reference has a redistributable image. */
export const referenceImage = (r: Reference) => (r.imageFile ? `${import.meta.env.BASE_URL}references/${r.imageFile.replace(/^images\//, "").replace(/\.\w+$/, ".webp")}` : null);
