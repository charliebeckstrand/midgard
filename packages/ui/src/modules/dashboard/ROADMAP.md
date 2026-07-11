# Dashboard roadmap

> **Goal: the board under the charting kit** — a canvas of draggable, resizable tiles that the chart module's tiles drop into without configuration, where nothing ever moves on the board's own initiative.

## Status

The foundation is in place. A pure, immutable layout core (`dashboard-layout`) models a fixed-column grid canvas: tiles sit exactly where they are placed — no gravity, no compaction, no displacement — over a 24-column grid whose rows are a quarter of a column's pitch, so a ratio-locked tile's height derives from its width (`round(4·w / ratio)`) and equal ratios at equal spans hold exactly equal heights. Saved layouts persist verbatim: what you save is literally what renders, gaps included.

Geometry is purely proportional: tiles paint at percentages of the grid's own width, the root's height rides `aspect-ratio`, and the gutter insets each cell by a half-gap — so server markup is correct before any measurement, one system serves every width, and resizing the container scales the board in place rather than reshaping it. Each tile's registered `minWidth` (`dashboard-constraints`) draws one line read from two sides: it floors how far the tile can be resized narrower, and it is the tile's vote in the responsive projection (`dashboard-responsive`) — once the container renders any tile under its demand, the board paints a content-first re-pack of the same layout (starved tiles widen, shelves fill in reading order and stretch to the full span, converging on a full-width stack) with editing stood down. The projection is a view, never a mutation: the binding never fires from it, and the canonical layout returns verbatim once the container affords it. There is no breakpoint anywhere.

Dragging simulates from its start snapshot, never the live preview, keyed by the travelling tile's own cell — origin plus delta, rounded, clamped to the occupied rows. A drag reorders (`dashboard-reorder`) against an equal-span tile it mostly covers: a partner in the same row shifts that row's run of tiles open to receive it (an insertion reorder, the sortable feel), a partner on another row trades places, and anything else is blocked — the placeholder clears and nothing changes. Only the tiles the reorder names ever move, and a drag never grows the canvas — only mounting more tiles does. The tile drags itself (no overlay clone), a swap partner glides on a plain CSS transition, the drop snaps home with the transition suppressed for one frame, and Escape reverts. The width measurement is frozen for the duration of a gesture, so a resize that grows the canvas tall enough to trip a page scrollbar can never loop that back into a chart-reflowing width change. Resize rides pointer-captured splitters outside dnd-kit (east always; south on free-form tiles; a pointer-only corner) and grows only until it meets a neighbour or the board edge, with arrow-key steps on the focusable separators and a live span readout chip.

The drag grip crosses into content through the ambient `primitives/drag-handle` channel: the tile mints the handle, a chart header adopts and claims it (the title sliding over on the shared layout spring, scoped to the tile through its content box's `layout layoutRoot`), and unclaimed tiles get the same grip floated on their corner.

## Backlog

- **Tidy action** — compact-on-demand: one explicit click packs the tiles upward, the only sanctioned bulk movement on a canvas that never repacks itself.
- **Item actions slot** — a per-tile affordance row (remove, duplicate, configure) beside the grip; today `header.suffix` carries consumer actions.
- **Grid-unit clamps** — public `minW` / `maxW` / `minH` / `maxH` beyond the `minWidth`-derived floor.
- **`onDragMove` streaming** — a live per-move event for consumers that mirror the preview elsewhere.
- **Layout presets** — save / restore named arrangements over the binding.
- **RTL hardening** — the horizontal delta flip is wired; a full mirrored-interaction pass remains.
