# Kashi Studio · کاشی

A browser-based vector studio for Persian and Iranian ornamental tiles, by Elham Kouhbor.

**https://www.elhamkouhbor.com/kashi-studio/**

Choose from 110 curated designs (girih, moarraq, haft-rang, eslimi, khatai, borders, medallions,
banna'i, calligraphy, Qajar, lustre and architectural compositions), change their construction, edit
any path by hand, and export editable SVG at its true size in millimetres. Everything runs in the
browser: no account, no server, no AI, nothing uploaded.

## What it does
- **A real vector editor.** Built on SVG-Edit's `svgcanvas` engine: select and multi-select, move,
  resize, rotate, rectangles, ellipses, lines, regular polygons, stars, pen and Bézier curves, node and
  handle editing, add and delete nodes, fill and stroke, joins, duplicate, group and ungroup, z-order,
  layers (show, hide, lock, reorder), align, distribute, grid snapping, snapping to points and guides,
  zoom and pan, undo and redo, SVG import and export. Booleans (unite, subtract, intersect, exclude)
  with Paper.js.
- **Ornament generators** that stay editable: every generated group remembers its parameters and can
  be rebuilt, or turned into plain artwork.
  - Girih by Hankin's polygons in contact on 11 tilings, including the ten-fold girih tiles, with
    interlacing solved so the over/under weave repeats across tiles.
  - Moarraq pieces: every region between the lines is its own closed, recolourable path.
  - Khatai flowers, eslimi scrolls with split palmettes, palmette and leaf motifs, medallions, borders
    with exact corner fitting, banna'i and hazarbaf brickwork, lustre star and cross tiles, Qajar
    templates, arched panels and a mihrab-inspired layout, friezes and text frames.
- **Ornament tools**: a symmetry designer with live copies, an ornament brush that places motifs along
  any path, borders around a tile, repeat into panels (translate, mirror, rotate), guides, and
  Persian or Arabic text converted to outlines with correct joining (HarfBuzz).
- **Historical references**: 56 documented objects and buildings (The Met and Cleveland open access,
  plus documented sites) with accession numbers, dates, techniques, geometry notes, sources and image
  rights. Place a reference, or your own photograph, in a locked tracing layer.
- **Previews**: a repeat preview with an automatic seam test, and a ceramic preview of glazed tiles on
  a wall (grout, light direction, gloss, lustre sheen). The artwork stays flat vectors.
- **Projects**: autosave, named projects, duplicate, delete, portable `.kashi.json` project files,
  all in IndexedDB in this browser.
- **Export**: SVG of the whole design, one tile (clipped repeat unit) or the selection, in mm or cm,
  with named layers for Illustrator and Inkscape, optional expansion of live copies. PNG at a chosen dpi.

## Provenance
Every design states whether it is a **reconstruction** (the geometric scheme follows a documented
object), an **adaptation** (based on a documented reference, with changes described) or **original**
(a new composition in a Persian idiom). No design claims to be an exact historical reproduction, and
inscription bands are left empty: no religious or historical text is invented. See
`research/COVERAGE.md` for what is supported and what is not yet possible.

## Research
- `research/EDITOR-EVALUATION.md`: comparison of SVG-Edit, SVG.js, Paper.js, Fabric.js, Konva and
  others, and the integration test that chose the editor engine.
- `research/PATTERN-GENERATORS.md`: existing girih and pattern generators, what was reused and what
  Kashi Studio adds.
- `research/catalogue.json` and `research/CATALOGUE.md`: the historical reference catalogue.
- `research/COVERAGE.md`: implementation coverage matrix.

## Develop
```bash
npm ci
npm run dev            # http://localhost:5200
npm test               # unit tests (geometry, seams, weave, generators, export, sanitising, storage, text)
npm run test:browser   # end-to-end checks in headless Chromium (start the dev server first)
npm run build          # typecheck and production build into dist/
```
`npm run test:browser` uses playwright-core and needs a Chromium (`npx playwright install chromium`).

## Architecture
```
src/geometry/      pure geometry: vectors, paths, planar arrangements, clipping, girih (Hankin, tilings, weave)
src/ornament/      motif primitives (petals, leaves, eslimi, palmettes, spirals) and the SVG node model
src/generators/    one generator per ornament system (params -> layered SVG node)
src/color/         historically inspired palettes
src/library/       curated designs, reference catalogue, coverage
src/editor/        svgcanvas wrapper (KashiEditor), document model, snapping, booleans
src/io, src/export import sanitising, clean SVG export
src/storage/       IndexedDB projects and autosave
src/text/          HarfBuzz text to outlines
src/ui/            React interface (library, stage, inspector, tools, previews, dialogs)
```
Generators never touch the interface or editor state, and the editor never contains ornament logic.

## Deployment
GitHub Actions builds with `KASHI_BASE=/kashi-studio/` and deploys to GitHub Pages
(Settings → Pages → Source: GitHub Actions). The site is served under the existing custom domain of
the account at `/kashi-studio/`.

## Licence
MIT for the code (see `LICENSE`). Third-party code, fonts and images are listed in
`THIRD_PARTY_NOTICES.md` and on the About page.
