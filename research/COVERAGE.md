# Implementation coverage

Which families of Iranian ornament Kashi Studio supports, partly supports, or cannot yet recreate
faithfully. The same table appears on the About page (`src/library/coverage.ts`).

| Family | Status | What works | Limits |
|---|---|---|---|
| Girih گره‌چینی | Supported | Hankin's construction on 10 Archimedean and uniform tilings and on the ten-fold girih tiles (decagon and bowtie), contact angle, doubled lines, interlace solved as periodic parity constraints, seamless repeat units | No quasi-periodic or self-similar girih (as at Darb-e Imam). No 7, 9, 11 or 16-fold systems. Ten-fold girih with doubled lines has no consistent interlace and is drawn as strapwork |
| Moarraq معرق | Supported | Every region between girih lines is a separate recolourable piece with joints. Star and cross, star and hexagon tile systems | Curvilinear floral mosaic is drawn as painted shapes, not cut into pieces with joints |
| Haft-rang هفت‌رنگ | Partial | Panels of many tiles: eslimi or khatai field, medallion, corner quarters, border, tile joints | Figurative garden and court scenes are not generated |
| Eslimi اسلیمی | Supported | Spiral scroll tiles (4 and 8-fold), eslimi leaves, split palmettes, the ornament brush | No automatic two-level interlaced eslimi |
| Khatai ختایی | Supported | Rosettes, palmettes (shah-abbasi), buds, serrated leaves, flower tiles | Stylised flower families, not botanical species |
| Borders and corners حاشیه و لچک | Supported | Ten band motifs, whole units per side, corner blocks, mitred frames, friezes | Continuous scrolls turn corners at corner blocks |
| Medallions ترنج و شمسه | Supported | Lobed shamse and toranj, star medallions, palmette rings, pendants, corner quarters | |
| Banna'i بنایی | Partial | Glazed and plain brick patterns on a grid, hazarbaf bonds, empty square kufic grid for your own lettering | No inscriptions are bundled (by design). No brick relief |
| Calligraphy خط و کتیبه | Partial | Your own text in bands, cartouches and medallions, converted to outlines with HarfBuzz shaping | No thuluth or nasta'liq composition tools. No historical or religious text is invented |
| Qajar tiles کاشی قاجاری | Partial | Templates: rose and nightingale, flower vase, rose spray, cartouche tile | No human figures, portraits or European landscapes |
| Lustre زرین‌فام | Partial | Exact star and cross and star and hexagon geometry, reserved motifs, dotted grounds, empty inscription bands, metallic sheen preview | Figural painting of historic lustre stars is not reproduced |
| Architectural compositions | Partial | Arched panels and a mihrab-inspired niche (border, girih or floral field, spandrels, empty inscription band), repeat panels, friezes | No muqarnas or three-dimensional forms |

## Library
110 designs: 30 girih and moarraq constructions, 8 khatai tiles, 6 eslimi tiles, 7 motifs, 5 haft-rang
panels, 6 medallions, 8 borders, 10 banna'i and hazarbaf patterns, 3 lustre tiles, 5 Qajar templates,
9 architectural compositions, 3 calligraphy frames and 10 further source-based designs. In total
2 designs are geometric reconstructions and 11 are adaptations, each tied to records in `catalogue.json`.
The other 97 are original compositions. Every design can be re-coloured with
any of 16 palettes (9 period palettes and 7 sampled from documented objects), and its construction
parameters can be changed, so the number of distinct results is much larger than the list.
