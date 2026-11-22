# CLAUDE.md

Guidance for AI coding assistants (and humans) working in this repo.

## What this is
Kashi Studio: a client-side vector studio for Persian tile design (React 18 + Vite 5 + TypeScript),
deployed to GitHub Pages at /kashi-studio/. No backend, no analytics, no AI, no accounts.

## Architecture rules
- `src/geometry`, `src/ornament`, `src/generators` are pure TypeScript: no DOM, no React, no editor
  state. Generators take params and return an `SvgNode` tree (plus defs and construction guides).
- `src/editor/engine.ts` (KashiEditor) wraps SVG-Edit's svgcanvas. Every document change goes through
  svgcanvas history commands (`BatchCommand`, `InsertElementCommand`, `ChangeElementCommand`) so undo
  works. Do not reimplement editing features svgcanvas already has.
- Document units are millimetres (1 user unit = 1 mm). Physical size is written at export.
- Generated groups carry `data-kashi-gen`, `data-kashi-params`, `data-kashi-palette`; export strips
  all `data-*` attributes.
- Tiles are whole periods of their pattern so they repeat seamlessly; seams and the over/under weave
  are tested (`tests/all.test.ts`).
- Imported SVG and project files always pass `sanitizeSvg` (src/io/sanitize.ts).

## Content rules
- Never invent inscriptions (religious or historical). Text bands stay empty or hold the user's text.
- Every library design states its provenance. Reconstructions and adaptations cite catalogue records
  and say what is not reproduced.
- Only bundle images with public domain, CC0 or CC BY licences, credited in the catalogue.
- User-facing text: no em dashes and no semicolons.

## Commands
```bash
npm run dev | npm test | npm run test:browser | npm run build | npm run typecheck
```
