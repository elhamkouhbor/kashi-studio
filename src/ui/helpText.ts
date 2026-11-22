// Help topics shown by the "?" buttons and the help dialog.
export type HelpTopic = "start" | "library" | "canvas" | "design" | "object" | "layers" | "tools" | "reference" | "export" | "projects";
export const HELP_ORDER: HelpTopic[] = ["start", "library", "canvas", "design", "object", "layers", "tools", "reference", "export", "projects"];
export const HELP: Record<HelpTopic, { title: string; intro: string; items: [string, string][]; tip?: string }> = {
  start: { title: "Getting started", intro: "Kashi Studio is a vector editor for Persian tile design. Everything runs in this browser and nothing is uploaded.", items: [
    ["Pick a design", "in the library on the left. It opens as editable artwork."],
    ["Change it", "with the settings under Design on the right: geometry, motifs, colours and size."],
    ["Edit by hand", "with the tools on the canvas: select, draw, edit nodes, recolour, group and arrange."],
    ["Check the repeat", "with Repeat preview, and see it as glazed tiles with Ceramic preview."],
    ["Export", "as SVG with real millimetre sizes, or PNG."],
  ], tip: "Work is autosaved in this browser. Use Save to keep a named project." },
  library: { title: "Design library", intro: "Curated constructions and compositions, grouped by ornament family. Search works in English and Persian.", items: [
    ["Families", "girih, moarraq, haft-rang, eslimi, khatai, borders, medallions, banna'i, calligraphy, Qajar, lustre and architectural compositions."],
    ["Provenance", "every card says whether it is a reconstruction (geometry follows a documented object), an adaptation, or an original design in a Persian idiom."],
    ["References", "the second tab lists the documented museum objects and buildings with their sources and image rights."],
  ] },
  canvas: { title: "Canvas and tools", intro: "The canvas is a full SVG editor (SVG-Edit's engine).", items: [
    ["Select (V)", "click to select, drag to move, Shift+click to add to the selection, drag on empty space for a box selection. Double-click a group to work inside it."],
    ["Shapes", "rectangle, ellipse, line, regular polygon and star. Polygons and stars use the side count in Tools."],
    ["Pen (P)", "click to place corner nodes, drag to pull curve handles, click the first node to close."],
    ["Nodes", "select a path and press Edit nodes (or double-click it) to move nodes and handles, add or delete nodes and switch segments between straight and curved."],
    ["Zoom and pan", "Ctrl or Cmd with the mouse wheel zooms at the pointer. Hold Space and drag to pan. Pinch on touch screens."],
    ["Snapping", "to the grid, to guides and to the tile and other objects. Toggle each in the bar under the canvas."],
  ] },
  design: { title: "Design settings", intro: "Generated ornament remembers how it was made, so its geometry can be changed later.", items: [
    ["Parameters", "change the construction (tiling, contact angle, petals, scroll turns and so on). The group is rebuilt in place and the change can be undone."],
    ["Palette", "historically inspired glaze colours. Recolour individual colours in Object."],
    ["Make plain", "turns a generated group into ordinary artwork that no longer regenerates."],
  ] },
  object: { title: "Object properties", intro: "Fill, stroke and arrangement of the selection.", items: [
    ["Colours", "change fill and stroke. On a group the colour is applied to everything inside."],
    ["Colours used", "lists the colours in the selection or the whole ornament. Pick one to replace it everywhere at once."],
    ["Arrange", "duplicate, group, ungroup, bring forward or send backward, flip and rotate."],
    ["Align and distribute", "line up two or more objects, or space three or more evenly."],
    ["Boolean", "unite, subtract, intersect or exclude shapes (Paper.js)."],
  ] },
  layers: { title: "Layers", intro: "Every document has four layers: Reference, Construction, Ornament and Tile edge.", items: [
    ["Visibility", "hide a layer with the eye. Hidden layers are not exported."],
    ["Lock", "locked layers cannot be selected. The reference layer is locked so a tracing image never moves by accident."],
    ["Order", "move a layer up or down. Click a layer to draw into it."],
  ] },
  tools: { title: "Ornament tools", intro: "Tools made for Persian ornament.", items: [
    ["Symmetry designer", "turns the selection into one part of a radial or mirrored ornament. The copies are live: edit the first part and every copy follows. Guides show the symmetry axes."],
    ["Ornament brush", "draw or select a path (a vine), choose a motif and place copies along it. Every leaf stays an editable path."],
    ["Border", "frames the tile with a border, with whole motif units on every side and corner blocks."],
    ["Repeat", "fills a larger panel with the tile by translation, mirroring or rotation. The copies are SVG references that stay small."],
    ["Text", "set your own Persian or Arabic text. Convert to outlines with correct letter joining (HarfBuzz)."],
  ] },
  reference: { title: "Reference and tracing", intro: "Work from documented historical tiles.", items: [
    ["Source", "each reference shows its museum, accession number, date, technique, geometry and the source link, and states what is uncertain."],
    ["Tracing", "place the reference or your own photograph in the locked Reference layer. Adjust opacity, scale, rotation and position, then trace with the pen and symmetry tools."],
    ["Honesty", "automatic tracing is not offered: reconstruction is done by eye and checked against the source."],
  ] },
  export: { title: "Export", intro: "SVG files keep real vector paths, groups and layer names.", items: [
    ["Size", "width and height are written in millimetres (or centimetres) and the viewBox is in millimetres, so the file prints at the true size."],
    ["Scope", "the whole document, one tile (the repeat unit, clipped to the tile), or the selection (a motif or border)."],
    ["Copies", "symmetry and repeat copies can be kept as SVG references or expanded into independent paths for editors that prefer them."],
    ["PNG", "a convenience image at a chosen resolution."],
  ] },
  projects: { title: "Projects", intro: "Projects are stored in this browser (IndexedDB). Nothing leaves your device.", items: [
    ["Autosave", "the working copy is saved after every change and restored when you come back."],
    ["Save and Save as", "keep named projects. Open, duplicate or delete them in Projects."],
    ["Project file", "export a .kashi.json file to move a project to another browser or keep a backup, and import it again."],
  ] },
};
