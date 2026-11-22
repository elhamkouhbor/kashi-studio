// All generators, by id.
import type { Generator } from "./types";
import { girihGenerator } from "./girih";
import { khataiTile, eslimiTile, palmetteMotif, medallion } from "./floral";
import { borderGenerator } from "./border";
import { bannaiGenerator, hazarbafGenerator } from "./bannai";
import { lustreGenerator } from "./lustre";
import { qajarGenerator } from "./qajar";
import { archGenerator, bandGenerator } from "./architecture";
import { haftrangPanel } from "./haftrang";
import { calligraphyGenerator } from "./calligraphy";
import { starTiles } from "./stars";

export const GENERATORS: Record<string, Generator> = Object.fromEntries(
  [girihGenerator, khataiTile, eslimiTile, palmetteMotif, medallion, borderGenerator, bannaiGenerator, hazarbafGenerator, lustreGenerator, qajarGenerator, archGenerator, bandGenerator, haftrangPanel, calligraphyGenerator, starTiles].map((g) => [g.id, g]),
);
