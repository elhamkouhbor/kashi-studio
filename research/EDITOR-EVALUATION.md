# Vector editor foundation: technical evaluation

Kashi Studio needs a real SVG editor (selection, transforms, pen and node editing, layers, undo, import and export) plus specialised ornament generators. The question is which existing open-source project provides the editor, so that Kashi Studio only builds what is specific to Persian tile design.

Facts below were checked on 22 November 2026 with `npm view` and the GitHub API. Bundle sizes were measured with esbuild (minified, then gzip).

## Candidates

| | SVG-Edit (svgcanvas engine) | SVG.js | Paper.js | Fabric.js | Konva | Graphite | Penpot |
|---|---|---|---|---|---|---|---|
| Licence | MIT | MIT | MIT | MIT | MIT | Apache 2.0 | MPL 2.0 |
| Latest release | 7.4.2, Jul 2026 | 3.2.8, Aug 2026 | 0.17.0, Nov 2026 | 7.4.0, Oct 2026 | 10.10, Nov 2026 | app, no library | app with server |
| Rendering model | Live SVG DOM | Live SVG DOM | Canvas, own scene graph | Canvas, own scene graph | Canvas | WebGPU/WASM app | App |
| SVG fidelity | Edits the SVG itself, sanitised whitelist, keeps `data-*` | Exact (it is the DOM) | Import converts to its model, unknown attributes lost | Import is lossy (groups, defs, clip paths) | No SVG export of vectors | Own format | Own format |
| Node and Bézier editing | Yes: pen tool, node grips, handles, segment type, add and delete nodes | No (plugins for move, select, resize only) | Yes in API, no UI | No built-in UI (custom controls demo only) | No | Yes (not embeddable) | Yes (not embeddable) |
| Groups and layers | Yes, SVG layers as `<g class="layer">` with titles, visibility | Groups only | Layers and groups | Groups | Layers | Yes | Yes |
| Transforms | Move, resize, rotate, flip, baked into geometry | API only | API | Yes, strong | Yes | Yes | Yes |
| Boolean path operations | No | No | Yes, curve-preserving | No | No | Yes | Yes |
| Undo and redo | Yes, command history | No | No | No | No | Yes | Yes |
| Align, distribute, z-order | Align and z-order built in | No | No | z-order | z-order | Yes | Yes |
| Grid snapping | Yes (`gridSnapping`, `snappingStep`) | No | No | Plugins | Plugins | Yes | Yes |
| Touch | Touch to mouse bridge (`core/touch.js`) | n/a | Yes | Yes | Yes | Partial | Yes |
| Extensibility | `addExtension`, events (`selected`, `changed`), all methods public | High | High | High | High | Rust nodes | Plugins |
| Size, min / gzip | 241 kB / 65 kB (engine only, PDF export stubbed) | about 70 kB | 320 kB / 112 kB | about 300 kB | about 150 kB | many MB | server |
| Static hosting | Yes | Yes | Yes | Yes | Yes | No | No |

Also reviewed: Method Draw (an SVG-Edit fork, repository no longer available), ShapeShifter (an animation tool, Apache 2.0, not an editor library), and Moveable (transform handles only, last release 2023).

## Decision

**Editor engine: `@svgedit/svgcanvas`**, the editing core of SVG-Edit, used without SVG-Edit's own interface.

- It already implements most of the required editing work: select and multi-select, rubber band, move, resize, rotate, rectangles, ellipses, lines, polygons, the pen tool, node and handle editing, add and remove nodes, segment types, groups, layers, z-order, alignment, snapping, zoom, undo and redo, and SVG import and export. Kashi Studio does not reimplement any of these.
- It edits the SVG DOM directly, so the document *is* the SVG that gets exported. Nothing is lost in a translation step, and `data-*` attributes survive. That lets generated ornament groups carry their generator settings.
- Its imports pass through a whitelist sanitiser. Kashi Studio adds a stricter pre-pass (DOMPurify plus its own reference checks) before anything reaches the editor.
- The full SVG-Edit application was not chosen. Its interface is a fixed set of web components with its own look, and embedding it would mean fighting that interface. It would not let the app share the family's layout.
- The engine statically imports jsPDF and svg2pdf for PDF export. Kashi Studio does not offer PDF, so those imports are aliased to stubs at build time (1.1 MB less). The engine needs the `pathseg` polyfill (Chromium licence, BSD style).

**Boolean operations: Paper.js**, loaded only when a boolean command is used. It is the only candidate with reliable curve-preserving union, subtraction, intersection and exclusion. Paper.js is used headlessly on path data, and its own rendering is not used.

**Persian and Arabic text to outlines: harfbuzzjs** (MIT), loaded on demand. HarfBuzz performs the complete Arabic-script shaping (joining forms, ligatures, marks). It is the only option that converts text to outlines without breaking letter joins. opentype.js does not shape Arabic script completely.

**Pattern geometry: own TypeScript modules**, based on the MIT-licensed `evoluteur/islamic-patterns` girih code (see `PATTERN-GENERATORS.md`), and kept independent from the editor.

Not used: SVG.js (it would require writing the node editor, pen, undo and layers ourselves), Fabric.js and Konva (canvas based, with lossy SVG round trips), Graphite and Penpot (applications, not embeddable libraries).

## Integration test (research/spike)

A girih pattern produced by the islamic-patterns generator (4.8.8 tiling, contact angle 67.5°, interlaced, 26 kB of SVG) was loaded into svgcanvas in a headless Chromium. The test (`research/spike`, run with playwright-core) verified:

| Step | Result |
|---|---|
| `setSvgString` import | ok, 7 paths and 1 layer |
| Select a path, move by (20, 10) | transform baked into the path data |
| Undo | original path data restored exactly |
| Draw a rectangle with the mouse | new `rect` created |
| Pen tool, 3 clicks and close | `M 100 500 L 200 450 L 260 560 L 100 500 z` |
| Enter node editing | mode `pathedit`, 5 node grips |
| Drag node 1 by (30, −40) with the mouse | `L 230 410`, node moved |
| Convert a segment to a cubic curve | `C 143.3 470 186.7 440 230 410` |
| Group, create layer "Ornament" | 2 layers |
| Export `getSvgString` | 22 kB of clean SVG with the layer titles |
| Zoom 2× | ok |
| Console errors | none |

The engine is the foundation. Specialised Kashi Studio work goes into the generators, the library, the tile and repeat model, the symmetry and brush tools, the export pipeline and the interface.
