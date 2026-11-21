# Dashboard roadmap

> **Goal: a board that every reader can arrange, and that filters on more than equal values.** The board composes widgets that it does not know, and it shares one filter scope between the tiles. No app uses the module yet, so the WCAG gap and the peer gaps set the order.

## Status

The module has four layers. The engine (`engine/`) holds pure functions. The shell is `Dashboard`, `DashboardTile`, and their hooks. The scope is `useDashboardScope` and `useDashboardRows`. The registry is `DashboardWidgetProvider` and `DashboardTiles`. Each layer reads only the layers under it.

The dashboard imports no chart, grid, or map, and none of them imports the dashboard. `DashboardTile` owns its chrome: the title, the description, the actions, the standard controls, and the drag grip. In edit mode the tile sets `inert` on its content box, so no widget needs edit-mode code. A widget puts its own header controls in the tile through `primitives/header-actions`, and it claims the height of its content through `primitives/content-height`.

The board is a CSS grid inside an inline-size container, and its row unit is a fraction of `100cqi`. Each content box is an inline-size container too, so a container query in a widget reads its tile. The server renders each tile that has a layout entry at its saved cell, in reading order. [`dashboard-order.test.tsx`](../../__tests__/modules/dashboard-order.test.tsx) holds the server order, and [`dashboard-order.test.tsx`](../../__tests__/browser/dashboard-order.test.tsx) in the browser suite holds the DOM moves.

The board never moves a tile by itself. A drag moves a tile into free cells, or it swaps the tile with an equal tile. Else the tile snaps to the nearest free cell. A resize grows a tile until it meets a neighbor or an edge, inside the `minSize` and `maxSize` of the tile. `tidy` on the `ref` (`DashboardHandle`) is the one bulk move, and it runs `tidyCells` in the engine. [`dashboard-layout-properties.test.ts`](../../__tests__/geometry/dashboard-layout-properties.test.ts), [`dashboard-limits.test.tsx`](../../__tests__/modules/dashboard-limits.test.tsx), and [`dashboard-handle.test.tsx`](../../__tests__/modules/dashboard-handle.test.tsx) hold these rules.

When the container renders a tile under its `minWidth`, the board paints a re-pack of the same layout, and it never saves the re-pack. The board writes each step of the re-pack as a container query, so the first paint is the re-pack that the first measurement keeps. [`dashboard-first-paint.test.tsx`](../../__tests__/browser/dashboard-first-paint.test.tsx) holds this. The re-pack holds for 24 px past its threshold, so a classic scrollbar cannot switch it on each frame. [`dashboard-projection-hold.test.tsx`](../../__tests__/browser/scrollbars/dashboard-projection-hold.test.tsx) holds the hold.

One gesture owns the board at a time. While a drag or a pointer resize is live, the board refuses a second gesture, a keyboard resize step, and `tidy`. Escape cancels only the live gesture, so a dialog, a sheet, or a drawer around the board stays open. An edit exit or an unmount ends a live gesture as canceled. [`dashboard.test.tsx`](../../__tests__/modules/dashboard.test.tsx) and [`dashboard-resize-pointer.test.tsx`](../../__tests__/modules/dashboard-resize-pointer.test.tsx) hold these rules.

A store in the engine gives each tile a subscription to its own cell. A drag preview therefore renders only the tiles that it moves, and the root does not render. [`dashboard-card-render.test.tsx`](../../__tests__/boundary/dashboard-card-render.test.tsx) holds this. A move glides through a FLIP in grid units, and a change of size snaps. [`dashboard-glide.test.tsx`](../../__tests__/browser/motion/dashboard-glide.test.tsx) holds the glide.

A right-to-left board mirrors the saved layout with no change to the data. The board reads the computed `direction` when each gesture starts, and `inlineSign` turns a horizontal travel into columns. [`dashboard-rtl.test.tsx`](../../__tests__/modules/dashboard-rtl.test.tsx) and its browser twin in `browser/geometry/` hold this.

The scope holds one `QueryGroup` filter that the app owns, and the cross-filter selections that the tiles make. A tile does not see its own selections. A selection applies while its tile is on the board, and it stays in the selection value when the tile leaves. A selection is a set of text values for one field, and it becomes `equals` rules. [`dashboard-scope.test.ts`](../../__tests__/modules/dashboard-scope.test.ts) holds the scope.

A spec is plain data: the tiles, the layout, and the filter. `addSpecTile`, `removeSpecTile`, and `duplicateSpecTile` keep the tiles and the layout in step. `parseDashboardSpec` and `parseDashboardSelection` read stored values, drop each part that the board cannot use, and report each change with its path. `startFromPreset` passes a preset through the same parse. [`dashboard-spec.test.ts`](../../__tests__/modules/dashboard-spec.test.ts), [`dashboard-spec-parse.test.ts`](../../__tests__/modules/dashboard-spec-parse.test.ts), and [`dashboard-preset.test.tsx`](../../__tests__/modules/dashboard-preset.test.tsx) hold them.

Each tile has its own error boundary and its own Suspense boundary, and so do its description and its actions. A tile takes a `mount` policy, so a long board can hold back the content under the fold. [`dashboard-mount.test.tsx`](../../__tests__/modules/dashboard-mount.test.tsx) holds the policy.

## Engine

The domain lives in [`engine/`](engine), a pure functional core: `dashboard-layout`, `dashboard-drag`, `dashboard-resize`, `dashboard-responsive`, `dashboard-scope`, `dashboard-spec`, `dashboard-spec-parse`, `dashboard-preset`, `dashboard-tidy`, `dashboard-announcements`, and `dashboard-store`. Each file is framework-free, and each has its own test suite.

The store is plain JavaScript, and the shell reads it through `useSyncExternalStore`. [`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds the invariant for this engine.

## Features

1. **Range selection (*P2*).** A selection today holds text values and becomes `equals` rules, so a widget cannot select a span of dates or numbers. A click on a month of a line chart needs a range. The cross-filters of Superset and Power BI give one. Add a `range: [min, max]` form to `DashboardSelection` in `engine/dashboard-scope.ts`, and turn it into the `between` rule that the `query` engine already evaluates. Add `selectRange` to `DashboardScope`, and teach `parseDashboardSelection` the new form. Prove it in `dashboard-scope.test.ts` and `dashboard-spec-parse.test.ts`, and with the `Trend` widget of the docs page.

2. **Typed widget options (*P3*).** A renderer gets `options` as `unknown` and casts it, so a saved spec of an old shape throws inside the tile. Grafana gives each panel plugin a migration step for this reason. Add an optional `parseOptions` to `DashboardWidget` in `types.ts` that returns the options or an issue. `DashboardTiles` then shows the stated fallback with the issue, and not the error state. The open question is whether `parseDashboardSpec` takes the registry to report these issues. Prove it in `dashboard-registry.test.tsx` and `dashboard-registry.test-d.ts`.

3. **Place a new tile at a cell (*P3*).** A new tile always takes a row under the lowest tile, so the user must drag it to its place. react-grid-layout and Grafana let the user drop a new tile from a palette onto a free cell. The open question is the drag source: `DndContext` lives inside `Dashboard`, so a palette outside the board needs a seam. Start with an `at` cell option on `addSpecTile` in `engine/dashboard-spec.ts`, which a palette can fill. Prove it in `dashboard-spec.test.ts` and in the "Build and save" example.

## Pattern cleanup

1. **The tile takes no native base (*P2*).** `DashboardTileProps` in `dashboard-tile.tsx` renders a `<div>` but takes no `ComponentProps<'div'>`, against CONVENTIONS.md §4.3. A consumer thus cannot put a `data-*` attribute, an `aria-*` attribute, or a `ref` on a tile. `props-base-boundary.test.ts` does not see it, because `propsWithNoBase` skips each props type that has an `id` key, and the tile `id` names its layout entry. Give the tile `Omit<ComponentProps<'div'>, 'id' | 'title' | 'children'>`, and merge `style` under the cell paint as §3.9 says. Then make the gate look for a native base node, not for an `id` key, so a module `id` cannot hide a gap again.

2. **Function names that misread (*P3*).** In `dashboard.tsx`, `inReadingOrder` returns elements, but §8.5 keeps the `in` prefix for a boolean. In `use-dashboard-scope.ts`, `appliedTo` makes a selector that keeps a cache, which §8.5 names with `create`. Rename them to `orderTiles` and `createAppliedSelector`. The other modules have the same drift in other noun names. A sweep of those names belongs to a pass over the repository.

## Performance

1. **A benchmark for the board (*P2*).** No benchmark under `src/__benchmarks__` measures the dashboard. The render rules hold through `dashboard-card-render.test.tsx`, but no number shows the cost of a mount, a drag frame, or a projection change. Add a browser bench for the board on the pattern of `kanban.bench.tsx`, for a mount and a store preview step at a large board. Add the engine calls `resolveLayout`, `dragPreview`, `tidyCells`, and `projectionSteps` to it. Record the first numbers in a dated section of the browser benchmark README, as CONVENTIONS.md §12.6 says.

2. **Load dnd-kit only for edit mode (*P3*).** `dashboard.tsx`, `use-dashboard-drag.ts`, and `use-dashboard-tile-drag.ts` import `@dnd-kit/core` statically, so a board that never edits still loads it. CONVENTIONS.md §9.4 loads such a layer in a chunk, as `Grid` and `List` do. The open question is the seam. Each tile calls the draggable hook of dnd-kit, so the tile needs a drag part that mounts only in edit mode. The first switch to edit mode then waits for the chunk. A boundary test on the pattern of `list-dnd-boundary.test.ts` can hold the result.

## Accessibility and testing

1. **A move and a resize with no drag (*P1*).** WCAG 2.2 criterion 2.5.7 requires a single-pointer path for each action that a drag does. A pointer user can move a tile only by a drag of the grip, and resize it only by a drag of a splitter. The keyboard steps do not count, because the criterion is about a pointer. In edit mode, give the grip a menu: Move up, Move down, Move to start, Move to end, and a size step for each axis. Each item runs the engine step that the arrow keys run, so the live region and the limits stay the same. Prove it in `dashboard.test.tsx` and in a browser test that moves and resizes a tile with clicks only.

2. **The board is not in the shared corpus (*P2*).** The corpus in `__tests__/a11y/cases` holds `Kanban` but no `Dashboard` subject, so the shared sweeps do not read the board. CONVENTIONS.md §10.5 puts each shared guarantee there. Add a `dashboard` subject at rest and in edit mode to `data-complex.tsx`, with a pass-through subject for the `<section>`. The axe baseline, the focus sweep, and the pass-through sweep then hold the board.

## Not planned

- A saved layout for each breakpoint, as react-grid-layout gives. The board derives the re-pack from one saved layout, so what the app saves is what renders.

- Automatic compaction, as the `compactType` of react-grid-layout gives. The board never moves a tile by itself, and `tidy` is the explicit pack.

- An undo stack in the board. The layout is a controlled binding, and each gesture event gives the layout at its start, so the app holds the history.

- A data fetch in the module, or a built-in catalog of widgets. The board fetches no data and imports no widget, so a new kind of widget needs no change to the dashboard.

---

**See also:** [`index.ts`](index.ts) (the public surface) · [`docs/MODULES.md`](../../../docs/MODULES.md) · [`query` roadmap](../query/ROADMAP.md).
