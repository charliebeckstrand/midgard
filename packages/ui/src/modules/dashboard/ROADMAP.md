# Dashboard roadmap

> **Goal: a board that composes widgets it does not know.** A tile holds a chart, a grid, a stat, or app content, and the board shares one filter scope between the tiles. A new kind of widget needs no change to the dashboard. The design record is [`docs/plans/2026-09-23-DASHBOARD-PLAN.md`](../../../docs/plans/2026-09-23-DASHBOARD-PLAN.md).

## Status

Version one covers layers 1 to 3 of the plan: the engine, the shell, and the scope.

The dashboard imports no chart, grid, or map, and none of them imports the dashboard. `DashboardTile` owns its chrome: the title, the description, the actions, and the drag grip. In edit mode the tile sets `inert` on its content box, so no widget needs edit-mode code.

The board is a CSS grid inside an inline-size container, and its row unit is a fraction of `100cqi`. Each content box is an inline-size container too, so a container query in a widget reads its tile. The server renders each tile that has a layout entry at its saved cell, with no measurement.

The board never moves a tile by itself. A drag moves a tile into free cells, or it reorders it against an equal tile. Else the tile snaps to the nearest free cell, and a drop changes nothing only when that cell is its start cell. A resize grows a tile until it meets a neighbor or an edge. When the container renders a tile under its `minWidth`, the board paints a re-pack of the same layout, and it never saves the re-pack.

One gesture owns the board at a time. While a drag or a pointer resize is live, the board refuses a second gesture, a keyboard resize step, and `tidy`. Escape cancels only the live gesture, so a dialog, a sheet, or a drawer around the board stays open. During a drag, the whole page shows the grabbing cursor. An edit exit or an unmount ends a live gesture as canceled, and a pointer resize then detaches its listeners. When the layout changes from outside during a gesture, the drop or the release ends as canceled, so the outside change stays.

A store in the engine gives each tile a subscription to its own cell. A drag preview therefore renders only the tiles that it moves, and the root does not render at all. A move glides through a FLIP in grid units; a change of size snaps.

Each tile has its own error boundary and its own Suspense boundary. The scope holds one `QueryGroup` filter that the app owns, and the cross-filter selections that the tiles make. A tile does not see its own selections.

Version two adds layer 4, the widget registry. `DashboardWidgetProvider` registers widget kinds by name, on the `ChatEmbedProvider` pattern. `DashboardTiles` renders one `DashboardTile` for each tile of a `DashboardSpec`, beside any JSX tiles. A spec is plain data, so an app can add a tile, remove a tile, and save the board. A kind that no widget claims keeps its tile and states the gap.

A tile takes a `mount` policy, so a long board can hold back the content of the tiles under the fold. A tile also takes a `defaultSize`, the span that it takes before the layout holds an entry for it.

The tiles with no entry take their new rows in markup order. That order reads a JSX tile by its place among the children, and a spec tile by its place in the spec. A reload therefore gives each of them the same row. In a component, each `DashboardTiles` and each JSX tile takes its place in mount order, and a spec tile keeps its place in the spec. React mounts the elements of one commit in markup order. Only an element that mounts after the others of its component can take another row on a reload.

The spec operations `addSpecTile`, `removeSpecTile`, and `duplicateSpecTile` keep the tiles and the layout in step, and `nextSpecTileId` mints a free id. A remove drops the layout entry of the tile, so a later tile with that id does not take its stale place. The space of the tile stays open, because the board never packs itself. A copy goes right after its source, and it takes the span of its source through its own `defaultSize`.

A tile draws the standard actions in its header row. `onRemove` and `onDuplicate` show controls in edit mode, and `expandable` shows an expand control at rest, which opens the content in a dialog in the scope of the same tile. The app owns the tile list, so it applies each action; `DashboardTiles` hands it the spec tile. A remove moves the focus to the grip of a neighbor tile, and the live region names each change.

The markup follows the board: the tiles render by row, then by column, so the keyboard and assistive tech meet them as the eye reads them. The order comes from the saved entries, so the server renders it too. In edit mode the markup holds still, so a gesture never moves a focused grip in the DOM; the new order takes effect when edit mode ends. Both `DashboardTiles` and each `DashboardTile` child follow it, also a tile inside a Fragment. A component that renders a tile keeps its own slot, and `DashboardTiles` orders only its own tiles. React focuses a moved element again after the commit, so a move keeps the focus.

`parseDashboardSpec` reads a spec from storage. It drops each part that the board cannot use: a tile with no id or kind, a repeated id, a malformed or orphan entry, and a filter that is not a query tree or is deeper than 32 levels. It keeps each other part, and it reports each change with its path, so the app decides whether to log, warn, or reset. It does not check the kinds against a registry, because a kind that no widget claims keeps its tile. A board that puts JSX tiles beside the spec tiles passes their ids in `tileIds`. The parse then keeps the entries of those tiles, and `startFromPreset` passes the ids on.

`parseDashboardSelection` reads a saved selection value in the same way. It drops and reports each selection with no string `source` or `field`, or with `values` that is not a list of strings. It also drops a selection with no values, and a selection that repeats the `source` and the `field` of an earlier one. The board reads the selection value as given, so a malformed selection throws in a scope reader.

A preset is a named spec that an app offers as a start point. `DashboardPreset` holds the id, the label, and the spec, and the app holds its own catalog. `startFromPreset` passes the spec through `parseDashboardSpec`. A start replaces the board, so the app clears the selection value and gives the preset id to the board as its `key`. Else an old selection keeps filtering the board, and a tile that keeps its id keeps the state of its widget.

A tile takes grid-unit limits: `minSize` and `maxSize`, each with an optional `w` and `h`, in the shape of `defaultSize`. A widget kind can set them too. A resize clamps into them, and a new tile takes its `defaultSize` within them. A saved entry renders as saved, so the board never resizes a tile by itself. The width floor is the larger of `minSize.w` and the span that `minWidth` needs. A tile with a fixed ratio ignores the height limits, because its width sets its height.

A tile veils its header when its chart reports the spark tier. The chart writes `data-tier="spark"`, and a `:has()` rule on the card reads it, so no code crosses the module boundary. The header leaves the flow for a veil over the top of the content, as the title of a spark chart does. At rest it shows on hover or focus, so the title and the controls stay reachable. Where the primary pointer cannot hover, as on a phone or a tablet, it stays in view at rest. In edit mode it stays in view for the grip, and the content box keeps one height in both modes. At rest a truncated title shows its full text in a tooltip on hover.

A right-to-left board mirrors the saved layout. The CSS grid puts column `0` at the right edge, so the saved layout stays in columns and renders mirrored with no change. The board reads the computed `direction` of the canvas when each gesture starts, and `inlineSign` turns a horizontal travel in px into columns. A pointer drag, a carried tile, a glide, and a pointer or keyboard resize therefore follow the screen. The end splitter, the corner, the floating grip, and the size chip sit on logical insets.

Tidy is the one bulk move. `tidy` on the `ref` of the board (`DashboardHandle`) packs the tiles upward and commits the result through the layout binding. Each tile keeps its column and its span, and it moves straight up until it meets a tile or the top edge, so each column keeps its order. A static tile never moves, and a tile that is not mounted keeps its saved place. The pack runs in the engine as `tidyCells`, and the live region says how many tiles moved.

A selection applies while the tile that made it is on the board. A remove therefore never leaves a filter that no Clear control can release. The selection stays in the selection value, so a tile that returns gets it back. The server cannot see which tiles mount, so it applies a selection while its tile has a saved entry or the children of the board declare that tile. The board reads each `DashboardTile` child, also inside a Fragment, and each spec tile of a `DashboardTiles` child. Each hydration render reads the same state as the server.

## Engine — the substrate

The domain lives in [`engine/`](engine), a pure functional core: `dashboard-layout`, `dashboard-drag`, `dashboard-resize`, `dashboard-responsive`, `dashboard-scope`, `dashboard-spec`, `dashboard-spec-parse`, `dashboard-preset`, `dashboard-tidy`, `dashboard-announcements`, and `dashboard-store`. Each file is framework-free, and each has its own test suite.

[`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) holds the invariant for this engine. The store is plain JavaScript; the shell reads it through `useSyncExternalStore`.

## Backlog

The backlog is empty. Each item of version two is in the status above.
