// A generator turns a small set of parameters into a layered ornament group. Generators are pure: they
// know nothing about the editor or the interface. The parameter specs drive the properties panel.
import type { Palette } from "../color/palettes";
import type { SvgNode } from "../ornament/node";

export type Family =
  | "girih" | "moarraq" | "haftrang" | "eslimi" | "khatai" | "border" | "medallion" | "bannai" | "calligraphy" | "qajar" | "lustre" | "architectural";

export const FAMILIES: Record<Family, { name: string; fa: string; translit: string; blurb: string }> = {
  girih: { name: "Girih", fa: "گره‌چینی", translit: "gereh-chini", blurb: "Interlocking stars, polygons and strapwork grown from a tiling." },
  moarraq: { name: "Moarraq", fa: "معرق", translit: "moarraq", blurb: "Cut-tile mosaic: every piece is a separate coloured shape." },
  haftrang: { name: "Haft-rang", fa: "هفت‌رنگ", translit: "haft-rang", blurb: "Painted tile fields with flowers, leaves and framing lines." },
  eslimi: { name: "Eslimi", fa: "اسلیمی", translit: "eslimi", blurb: "Spiral arabesque scrolls with split palmettes." },
  khatai: { name: "Khatai", fa: "ختایی", translit: "khatai", blurb: "Flowers, rosettes, buds and leaves." },
  border: { name: "Borders and corners", fa: "حاشیه و لچک", translit: "hashiye o lachak", blurb: "Continuous bands with corner solutions." },
  medallion: { name: "Medallions", fa: "ترنج و شمسه", translit: "toranj o shamse", blurb: "Central radial compositions." },
  bannai: { name: "Banna'i", fa: "بنایی", translit: "banna'i", blurb: "Glazed and plain brick patterns on a square grid." },
  calligraphy: { name: "Calligraphic ornament", fa: "خط و کتیبه", translit: "khatt o katibe", blurb: "Persian and Arabic text set as ornament." },
  qajar: { name: "Qajar tiles", fa: "کاشی قاجاری", translit: "kashi-ye qajari", blurb: "Floral and pictorial painted tiles of the Qajar period." },
  lustre: { name: "Lustre", fa: "زرین‌فام", translit: "zarrin-fam", blurb: "Star and cross tiles with lustre painting." },
  architectural: { name: "Architectural compositions", fa: "ترکیب‌های معماری", translit: "tarkib-ha-ye me'mari", blurb: "Panels, arches and mihrab inspired layouts." },
};

export type ParamSpec =
  | { key: string; label: string; type: "range"; min: number; max: number; step: number; unit?: string }
  | { key: string; label: string; type: "int"; min: number; max: number }
  | { key: string; label: string; type: "select"; options: { value: string; label: string }[] }
  | { key: string; label: string; type: "bool" }
  | { key: string; label: string; type: "text"; rtl?: boolean };

export type Params = Record<string, number | string | boolean>;

export interface BuildContext { palette: Palette; /** unique prefix for ids inside the generated group */ uid: string }

export interface Generator {
  id: string;
  family: Family;
  name: string;
  nameFa: string;
  params: ParamSpec[];
  defaults: Params;
  /** Size of the generated tile in mm for these parameters. */
  size(p: Params): { w: number; h: number };
  /** Ornament group; may also return construction geometry for the guides layer. */
  build(p: Params, ctx: BuildContext): { art: SvgNode; guides?: SvgNode; defs?: SvgNode[]; info?: Record<string, string | number | boolean> };
}

export const num = (p: Params, k: string) => Number(p[k]);
export const str = (p: Params, k: string) => String(p[k]);
export const bool = (p: Params, k: string) => p[k] === true || p[k] === "true";
