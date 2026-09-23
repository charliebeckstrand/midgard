# Dashboard module — a board that composes widgets it does not know

> **Status.** Version one is in build on `feat/dashboard-redesign`. It replaces the design on
> `feat/dashboard-module`, which stays as a reference and is not merged.
>
> **Read §2 first.** The decoupling rule is the reason for this redesign. Each other decision
> follows from it.

## 1. Goal

A dashboard is a board of tiles. Each tile holds a widget: a chart, a grid, a stat, a map, or
the content of an app. The board arranges the tiles, and it shares one filter scope between them.

The module must be extendable. A new kind of widget must need no change to the dashboard, and
the dashboard must need no change to a widget.

## 2. The decoupling rule

The dashboard imports no chart, grid, or map. No chart, grid, or map imports the dashboard.

The old branch broke this rule. The chart header took the drag grip, the legend went inert in
edit mode, and the spark veil read a tile context. Each merge of `main` then conflicted in the
chart engine, and 16 of 16 conflicts were there. The chat module already holds this rule for its
embeds (`ChatEmbedProvider`), so the rule extends a house pattern.

Three mechanisms keep the rule:

- **The tile owns its chrome.** `DashboardTile` draws the title, the description, the actions,
  and the drag grip. A chart inside a tile gets no `title`, so it draws no header of its own.
- **The platform does the edit-mode standby.** In edit mode the tile sets `inert` on its content.
  The attribute stops pointer, focus, and assistive-tech access for any content.
- **CSS reads the widget state.** The chart writes `data-tier` on its root. A tile can co-style
  against it with `:has()`, and no code crosses the boundary.

## 3. What carries over from the old design

- The board never moves a tile by itself. There is no gravity and no compaction.
- A saved layout is four integers for each tile, and it renders exactly as saved.
- A tile with a fixed `ratio` derives its height from its width. Equal ratios at equal spans give
  equal heights.
- Rows are a quarter of a column's pitch, over 24 columns by default.
- The responsive re-pack is a view. It never writes to the saved layout.
- A gesture works from a frozen snapshot. It commits once, and Escape reverts it.
- The layout binding is the house `value` / `defaultValue` / `onValueChange` triad.

## 4. Defects the redesign closes

1. **The server rendered an empty board.** A tile returned `null` until a layout effect
   registered it. Now a tile resolves its cell during render, from its layout entry and its own
   `ratio`.
2. **A drag could not reach open space.** The old policy only swapped or shifted tiles of equal
   span, and it clamped travel to the occupied rows. Now a drag into free cells moves the tile.
3. **Every tile re-rendered on each preview frame.** One context held the whole cell map. Now a
   store gives each tile a subscription to its own cell.
4. **One broken widget broke the board.** Now each tile has an error boundary and a Suspense
   boundary.

## 5. Architecture

Each layer depends only on the layers under it.

1. **Engine** (`engine/`): pure functions and a framework-free store. It joins `PURE_ENGINES`, so
   the boundary test keeps React out.
2. **Shell**: `Dashboard`, `DashboardTile`, and the hooks. They compose with JSX children.
3. **Scope**: `useDashboardScope` and `useDashboardRows`, which read and write the shared filter.
4. **Registry** (version two): widget kinds and a serializable `DashboardSpec`, built on layer 2.

### 5.1 Engine files

| File | Content |
| --- | --- |
| `dashboard-layout.ts` | The cell type, collision, fit, move, swap, shift, append, and resolution |
| `dashboard-drag.ts` | The drag policy: a move into free cells, else a reorder, else blocked |
| `dashboard-resize.ts` | The resize clamp: a tile grows until it meets a neighbour or an edge |
| `dashboard-responsive.ts` | The content-first re-pack, when a tile falls under its `minWidth` |
| `dashboard-scope.ts` | Selections, the effective query for a tile, and the row predicate |
| `dashboard-announcements.ts` | The live-region text for the gestures |
| `dashboard-store.ts` | The state container, and the derived cells that the tiles paint |

### 5.2 The store

The store holds the saved layout, the registered tile demands, the measured width, the live
gesture, the edit flag, the filter, and the selections. It derives the painted cells: the gesture
preview, else the responsive projection, else the saved layout. The derivation keeps a cell object
when its geometry does not change, so a selector with `Object.is` wakes only the tiles that moved.

The `Dashboard` root does not re-render on a preview. Its `children` element does not change, so
React skips the tiles, and each tile re-renders only through its own subscription.

## 6. Geometry

The board is a CSS grid inside an inline-size container. The rows are `calc(100cqi / (columns ×
4))` high, so the browser derives each row from the width. A tile sets `grid-area` from its cell.
The board height follows the lowest tile, with no JavaScript. The server markup is therefore
correct for each tile that has a layout entry.

CSS cannot animate a change of grid position. A tile animates its own move with a FLIP. It
computes the offset in grid units, multiplies it by the pitch that it measures on itself, and
plays one transform through the Web Animations API. It animates a move only. A change of size, a
responsive re-pack, and reduced motion all snap.

## 7. Gestures

**Drag.** dnd-kit supplies the sensors, the keyboard, and the announcements. The policy reads the
snapshot and the target cell of the travelling tile:

1. The target cell is free. The tile moves there.
2. An equal-span tile covers at least half of the target. The two reorder: a shift in the same
   row, else a swap.
3. Anything else is blocked. The preview clears, and a drop changes nothing.

A tile can travel one row band below the lowest tile, so a drag can open a new row.

**Resize.** A pointer-captured splitter on the east edge, on the south edge of a free-form tile,
and on the corner. Each axis grows until it meets a neighbour or the edge, and it never shrinks
under `minWidth`. The splitters also take the arrow keys.

## 8. The filter scope

The scope has two parts:

- **The filter** is a `QueryGroup` from the `query` module. The app edits it, for example with
  `QueryBuilder`, through the `filter` binding.
- **The selections** come from the tiles. A tile calls `select(field, value)`, for example from a
  chart's `onCategoryClick`. Each selection records the tile that made it.

A tile sees the filter plus the selections of the other tiles. It does not see its own selection,
so a chart does not filter itself down to the bar that the user clicked. `useDashboardRows` applies
that effective query to rows with `evaluateQuery`. The module fetches no data.

## 9. Version two: the registry

The registry follows `ChatEmbedRegistry`. A widget kind is a renderer plus its default `ratio`
and `minWidth`. A `DashboardSpec` holds the tiles, the layout, and the scope as plain data. It
enables "add tile", presets, and a saved board. Tiles then mount through the `Mount` primitive.

```ts
type DashboardWidget<Options> = {
  render: (options: Options) => ReactNode
  ratio?: number
  minWidth?: number
}
type DashboardSpec = {
  tiles: { id: string; widget: string; title?: string; options: unknown }[]
  layout: DashboardLayoutItem[]
  filter?: QueryGroup
}
```

## 10. Verification

- Unit tests for each engine file, with no React.
- Component tests for the SSR markup, the store subscription count, the gestures, `inert`, the
  boundaries, and the scope.
- `biome check`, `turbo run check-types`, and the boundary suites.
- The docs demo in the browser: a drag into free space, a reorder, a resize, and a cross-filter.
