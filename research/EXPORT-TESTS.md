# Export compatibility tests

Run on 22 November 2026.

## Automated (every `npm test` and `npm run test:browser`)
- Exported SVG carries `width`/`height` in mm or cm and a millimetre `viewBox`.
- Layers are `<g inkscape:groupmode="layer" inkscape:label="…">` with readable ids (Illustrator uses ids as layer names).
- No `data-*` editor attributes, scripts or embedded raster images in exports.
- Every ornament path in the document is present in the export.
- Exports render in an independent renderer, resvg (`@resvg/resvg-js`), at the expected pixel size.
- Round trip: export, sanitise and re-import gives the same physical size and the same number of paths.
- Live copies (`<use>`) can be expanded into independent geometry.

## Inkscape 1.4.4 (command line, flatpak)
| Export | Inkscape width × height at 96 px/in | Expected | Objects |
|---|---|---|---|
| Ten-fold girih, interlace, 200 mm wide, mm | 755.906 × 549.199 px | 200 × 145.3 mm | 38 |
| Medallion, 15 cm, exported in cm | 566.929 × 566.929 px | 150 × 150 mm | 60 |
| Eslimi tile, tile scope, 120 mm | 453.543 × 453.543 px | 120 × 120 mm | 70 |
| Mihrab layout 900 × 1400 mm | page renders at 1701 × 2646 px at 48 dpi = 900 × 1400 mm | 900 × 1400 mm | 693 |

All four files open, render to PNG with the expected appearance (checked visually, including the
interlace crossings) and show the `Ornament` layer as a layer. For the mihrab layout the query of the
drawing's bounding box is slightly larger than the page because edge strokes overhang the artboard.

## Adobe Illustrator
Not tested: no Illustrator installation was available. The files use plain SVG 1.1 features
(paths, groups, clip paths, `<use>` only when copies are not expanded) and mm units, which Illustrator
imports. For maximum compatibility, export with "Expand symmetry and repeat copies".
