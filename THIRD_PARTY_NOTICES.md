# Third-party notices

Kashi Studio is MIT licensed (see LICENSE). It includes or depends on the following work.

## Code ported into this repository

### islamic-patterns (MIT)
`src/geometry/girih/hankin.ts` is a TypeScript port, with changes, of `js/girih.js` from
https://github.com/evoluteur/islamic-patterns (the tilings, Hankin's motif, strand joining and the
over/under weave). The original licence:

```
MIT License

Copyright (c) 2026 Olivier Giulieri

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Runtime dependencies (bundled in the built app)

| Package | Licence | Use |
|---|---|---|
| @svgedit/svgcanvas (SVG-Edit) | MIT | Vector editing engine |
| paper (Paper.js) | MIT | Boolean path operations (loaded on demand) |
| harfbuzzjs (HarfBuzz) | MIT (HarfBuzz itself: Old MIT) | Text shaping for text to outlines (loaded on demand) |
| dompurify | MPL 2.0 or Apache 2.0 (used under Apache 2.0) | SVG import sanitising |
| pathseg | Chromium licence (BSD 3-clause style), © 2015 The Chromium Authors | SVGPathSeg polyfill required by svgcanvas |
| react, react-dom | MIT | Interface |
| lucide-react | ISC | Icons |
| @fontsource/vazirmatn (Vazirmatn by Saber Rastikerdar) | SIL Open Font License 1.1 | Persian typeface |
| @fontsource/noto-naskh-arabic (Noto Naskh Arabic, Google) | SIL Open Font License 1.1 | Naskh typeface |

svgcanvas imports jsPDF and svg2pdf.js for PDF export. Kashi Studio does not offer PDF export and
replaces both with stubs at build time (`src/editor/stubs`), so neither is bundled.

## Development dependencies (not shipped)
vite, @vitejs/plugin-react, typescript, esbuild (MIT), playwright-core (Apache 2.0),
jsdom (MIT), @resvg/resvg-js (MPL 2.0, used only to render exports in tests).

## Images
Reference images in `public/references/` come from:
- The Metropolitan Museum of Art Open Access (CC0), retrieved from the Met's CC0 uploads on Wikimedia Commons.
- The Cleveland Museum of Art Open Access (CC0).
- Wikimedia Commons photographs of buildings under CC0, CC BY 2.0, CC BY 3.0 or CC BY 4.0, with
  the author and licence of each listed in `research/catalogue.json` and on the About page.
Images were resized and converted to WebP. No image with an unclear or non-redistributable licence is included.

## Methods
Girih construction follows E. H. Hankin's polygons in contact method as formalised by Craig S. Kaplan
("Islamic star patterns from polygons in contact", Graphics Interface 2005) and the girih tiles described
by Peter J. Lu and Paul J. Steinhardt ("Decagonal and Quasi-Crystalline Tilings in Medieval Islamic
Architecture", Science 315, 2007). Colour vision is not part of this app. Glaze colours are approximations.
