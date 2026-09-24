# Dashboard roadmap

> **Goal: a board that composes widgets it does not know.** A tile holds a chart, a grid, a stat, or app content, and the board shares one filter scope between the tiles. A new kind of widget needs no change to the dashboard. The design record is [`docs/plans/2026-09-23-DASHBOARD-PLAN.md`](../../../docs/plans/2026-09-23-DASHBOARD-PLAN.md).

## Status

Version one covers layers 1 to 3 of the plan: the engine, the shell, and the scope.

The dashboard imports no chart, grid, or map, and none of them imports the dashboard. `DashboardTile` owns its chrome: the title, the description, the actions, and the drag grip. In edit mode the tile sets `inert` on its content box, so no widget needs edit-mode code.

The board is a CSS grid inside an inline-size container, and its row unit is a fraction of `100cqi`. The server renders each tile that has a layout entry at its saved cell, with no measurement.

The board never moves a tile by itself. A drag moves a tile into free cells, or it reorders it against an equal tile; anything else is blocked. A resize grows a tile until it meets a neighbour or an edge. When the container renders a tile under its `minWidth`, the board paints a re-pack of the same layout, and it never saves the re-pack.

A store in the engine gives each tile a subscription to its own cell. A drag preview therefore renders only the tiles that it moves, and the root does not render at all. A move glides through a FLIP in grid units; a change of size snaps.

Each tile has its own error boundary and its own Suspense boundary. The scope holds one `QueryGroup` filter that the app owns, and the cross-filter selections that the tiles make. A tile does not see its own selections.

Version two adds layer 4, the widget registry. `DashboardWidgetProvider` registers widget kinds by name, on the `ChatEmbedProvider` pattern. `DashboardTiles` renders one `DashboardTile` for each tile of a `DashboardSpec`, beside any JSX tiles. A spec is plain data, so an app can add a tile, remove a tile, and save the board. A kind that no widget claims keeps its tile and states the gap.

A tile takes a `mount` policy, so a long board can hold back the content of the tiles under the fold. A tile also takes a `defaultSize`, the span that it takes before the layout holds an entry for it.

## Engine — the substrate

The domain lives in [`engine/`](engine), a pure functional core: `dashboard-layout`, `dashboard-drag`, `dashboard-resize`, `dashboard-responsive`, `dashboard-scope`, `dashboard-announcements`, and `dashboard-store`. Each file is framework-free, and each has its own test suite.

[`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds the invariant for this engine. The store is plain JavaScript; the shell reads it through `useSyncExternalStore`.

## Backlog

- **Spec operations.** Pure functions that add, remove, and duplicate a spec tile. A remove also drops the layout entry of the tile; else its space stays open.

- **Spec validation.** A guard for a spec that the app reads from storage.

- **Presets.** Named specs that an app offers as a start point.

- **Reading order.** The tab order follows the order of the tiles in the markup, not their places on the board. Sort the tiles by `(y, x)` for focus, or give the board a roving tab stop.

- **Tile actions.** A standard action set beside the grip: remove, duplicate, and expand to a dialog.

- **Tidy.** One explicit command that packs the tiles upward. It is the only bulk move on a board that never packs itself.

- **Grid-unit limits.** Public `minW`, `maxW`, `minH`, and `maxH` beside the `minWidth` floor.

- **Spark tier.** Hide the tile header when the widget reports `data-tier="spark"`, with a `:has()` rule on the tile.

- **RTL.** Mirror the drag delta and the resize edges.
