# Existing tile and pattern generators

Reviewed on 22 November 2026. The question for each project: what is already solved, can the code be reused, and what does Kashi Studio still have to add?

| Project | What it is | Licence | Method | Export | Reuse |
|---|---|---|---|---|---|
| [evoluteur/islamic-patterns](https://github.com/evoluteur/islamic-patterns) | Browser generator, 10 Archimedean and uniform tilings | MIT (© 2026 Olivier Giulieri) | Hankin's polygons in contact (per Kaplan), contact angle, gap, strands joined across tiles, alternating over/under weave | SVG, PNG | **Reused.** The tilings, the Hankin motif, strand joining and the over/under weave are ported to TypeScript in `src/geometry/girih/hankin.ts`, with attribution. |
| [hermes98761234/geometric-pattern-generator](https://github.com/hermes98761234/geometric-pattern-generator) | Hankin on 5 tilings, plus Celtic knotwork | MIT | Same method, separate angle per polygon type | SVG (with mm), PNG | Not reused. Same algorithm as above, fewer tilings. The idea of one contact angle *per polygon type* is adopted, because it allows the classical rosettes. |
| [Wsh7Ash/hadara](https://github.com/Wsh7Ash/hadara) | Flask app with a canvas generator | No licence file | Simple star drawing, not a tiling construction | SVG | Not reusable (no licence) and not a girih construction. |
| [girihdesigner.com](https://girihdesigner.com/) | Online editor for placing the five girih tiles | Closed | Manual tile placement | Not inspected beyond the public page | Idea only: an editable girih tile patch. No code. |
| [zakhraf.studio](https://zakhraf.studio/) | Commercial ornament app ("derived, not generated", built from documented tessellations) | Proprietary | Not public | SVG | Nothing reused. It confirms that a library of documented constructions is the valuable part. |

## Already solved elsewhere, reused

- Hankin's construction on periodic tilings of regular polygons, with the contact angle (islamic-patterns).
- Joining line segments into continuous strands across tile boundaries, and alternating over/under weaving (islamic-patterns).

## What Kashi Studio adds

- **Ten-fold girih.** None of the reviewed open projects produces 10-point stars, which are central to Iranian girih. Kashi Studio adds the five Lu and Steinhardt girih tiles (decagon, pentagon, hexagon, bowtie, rhombus) and their strapwork, which is Hankin's construction at a 54° contact angle on those tiles. It also adds periodic patches built from them, plus a generalised Hankin solver for non-regular and non-convex tiles (greedy ray pairing, after Kaplan).
- **Exact repeat units.** Pattern output is a rectangular repeat cell (a lattice period), clipped to the tile, so tiles connect without seams. The seams are tested numerically.
- **Filled pieces.** For moarraq, each region between the lines becomes its own closed, recolourable piece, extracted from the planar line arrangement.
- **Everything that is not a star pattern:** eslimi scrolls, khatai flowers, borders with corner solutions, medallions, banna'i brick grids, Qajar floral templates, lustre templates, arches and panels. None of the reviewed tools touches these.
- **Editing.** All reviewed generators output a picture. Kashi Studio places the result as layered, named, editable SVG in a vector editor, and keeps the generator settings on the group so it can be regenerated.
