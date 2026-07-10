# Dashboard roadmap

> **Goal: the board under the charting kit** — a Grafana-style grid of draggable, resizable, gravity-compacted tiles that the chart module's tiles drop into without configuration.

## Status

The foundation is in place. A pure, immutable layout core (`dashboard-layout`) ports react-grid-layout's battle-tested compaction and displacement math — reading-order gravity with statics pinned, nearest-first push resolution with the `moved` loop guard, upward hops only at the user's own gesture depth — over a 24-column grid whose rows are a quarter of a column's pitch, so a ratio-locked tile's height derives from its width (`round(4·w / ratio)`) and equal ratios at equal spans hold exactly equal heights.

Geometry is purely proportional: tiles paint at percentages of the grid's own width, the root's height rides `aspect-ratio`, and the gutter insets each cell by a half-gap — so server markup is correct before any measurement and one system serves every width. Reflow glides on FLIP transform springs (`ugoki.spring`), skipped under reduced motion.

Every gesture simulates from its start snapshot, never the live preview, so drag-away restores what a pass-through displaced and Escape reverts free. Over another tile, the pointer's band picks the meaning — swap on the middle half, insert above or below on the quarters — debounced by a Schmitt band and a dwell (`dashboard-intent`); over open grid, the travelled rectangle snaps to the nearest cell. Resize rides pointer-captured splitters outside dnd-kit (east always; south on free-form tiles; a pointer-only corner), with arrow-key steps on the focusable separators and a live span readout chip.

The responsive derivation (`dashboard-responsive`) is a pure function from the saved layout and the measured width: tiles whose `minWidth` no longer fits widen and wrap, breakpoint-free, converging on a full-width stack — and editing gestures stand down whenever the derivation is non-identity, since edits apply to the saved layout.

The drag grip crosses into content through the ambient `primitives/drag-handle` channel: the tile mints the handle, a chart header adopts and claims it (the title sliding over on the shared layout spring), and unclaimed tiles get the same grip floated on their corner.

## Backlog

- **Item actions slot** — a per-tile affordance row (remove, duplicate, configure) beside the grip; today `header.suffix` carries consumer actions.
- **Grid-unit clamps** — public `minW` / `maxW` / `minH` / `maxH` beyond the `minWidth`-derived floor.
- **`onDragMove` streaming** — a live per-move event for consumers that mirror the preview elsewhere.
- **Ghost overlay** — a lightweight rendering for the drag overlay when a second live chart proves too heavy on dense boards.
- **Layout presets** — save / restore named arrangements over the binding.
- **RTL hardening** — the horizontal delta flip is wired; a full mirrored-interaction pass remains.
