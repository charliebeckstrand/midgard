# Dashboard module — a board that composes widgets it does not know

> **Status.** Closed. Version one landed in [#1243](https://github.com/charliebeckstrand/midgard/pull/1243),
> and version two landed in [#1250](https://github.com/charliebeckstrand/midgard/pull/1250). This design
> replaces the one on `feat/dashboard-module`, which stays as a reference and is not merged.
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
  against it with `:has()`, and no code crosses the boundary. (Built later: at the spark tier,
  the tile header becomes a veil over the content.)

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
| `dashboard-drag.ts` | The drag policy: a move into free cells, else a reorder, else the nearest free origin |
| `dashboard-resize.ts` | The resize clamp: a tile grows until it meets a neighbour or an edge |
| `dashboard-responsive.ts` | The content-first re-pack, when a tile falls under its `minWidth` |
| `dashboard-scope.ts` | Selections, the effective query for a tile, and the row predicate |
| `dashboard-spec.ts` | The saved board as plain data, and the add, remove, and duplicate operations (version two) |
| `dashboard-spec-parse.ts` | The guard for a stored spec: it repairs the spec and reports each change (built later) |
| `dashboard-preset.ts` | The preset type, and the start that checks the spec of a preset (built later) |
| `dashboard-tidy.ts` | The tidy pack: each tile moves straight up to the tile above it or the top edge (built later) |
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

Each tile insets half the gutter on each side, and the canvas reaches half a gutter past the
container on each side. The outer cards therefore line up with the content around the board. The
row unit divides that wider span. The column guides of edit mode draw only on the interior column
boundaries, in the gutters.

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
3. Else the tile snaps to the nearest free origin on the board. A column counts as four rows, so
   the distance is round on screen. The drag therefore needs no precise aim.
4. When that nearest origin is the start cell, a drop changes nothing. The placeholder then shows
   the start cell, so a drag always shows where the tile lands.

A tile can travel one row band below the lowest tile, so a drag can open a new row. That row is
always free, so a free origin always exists. In edit mode a pointer drag starts anywhere on the
card, because the content is inert; the grip is the keyboard activator and the touch handle.

The markup follows the board (built later). The tiles render by row, then by column, from the
saved entries, so the server renders the order too. In edit mode the markup holds still, and the
new order takes effect when edit mode ends. A move in the DOM therefore never happens under a
gesture. A move costs an iframe its document and a scroll box its offset, so it happens at most
once for each edit session.

**Resize.** A pointer-captured splitter on the east edge, on the south edge of a free-form tile,
and on the corner. Each axis grows until it meets a neighbour or the edge, and it never shrinks
under `minWidth`. The two edge splitters also take the arrow keys. The corner takes the pointer
only, because the two edges already serve the keyboard. (Built later: the grid-unit limits
`minSize` and `maxSize` also bound each axis, and a new tile takes its `defaultSize` within them.)

**Right to left** (built later). The CSS grid mirrors the saved layout, so the layout stays in
columns. Each gesture reads the computed `direction` of the canvas, and a horizontal travel in px
changes sign before it becomes columns. The splitters and the grip sit on logical insets.

**Tidy** (built later). One explicit command on the `ref` of the board packs the tiles upward.
Each tile keeps its column and its span, and it moves straight up until it meets a tile or the
top edge. A static tile never moves. The pack commits once through the layout binding, so it is
the one bulk move on a board that never packs itself.

## 8. The filter scope

The scope has two parts:

- **The filter** is a `QueryGroup` from the `query` module. The app edits it, for example with
  `QueryBuilder`, through the `filter` binding.
- **The selections** come from the tiles. A tile calls `select(field, value)`, for example from a
  chart's `onCategoryClick`. Each selection records the tile that made it.

The source chart keeps its selection visible. The app passes `scope.selected(field)` to the
chart's `selectedCategories`, a generic chart prop: the selected marks stay lit, the others
recede, and a hover does not re-light them. The chart does not know about the dashboard. A pie
or donut also takes `categories`, the full category list, so a filter never moves a slice colour.

A tile sees the filter plus the selections of the other tiles. It does not see its own selection,
so a chart does not filter itself down to the bar that the user clicked. `useDashboardRows` applies
that effective query to rows with `evaluateQuery`. The module fetches no data.

## 9. Version two: the registry

> **Status.** Built. `DashboardWidgetProvider`, `DashboardTiles`, and the `mount` and
> `defaultSize` props of `DashboardTile` ship in the `dashboard` module.

The registry follows `ChatEmbedRegistry`. A widget kind is a renderer plus the demands of its
tile. The app registers the kinds by name with `DashboardWidgetProvider`. A spec tile names a
kind, and `DashboardTiles` renders one `DashboardTile` for each spec tile. The dashboard still
imports no widget, because the app writes each renderer. The registry enables "add tile",
presets, and a saved board.

### 9.1 Types

```ts
type DashboardSpecTile = {
  id: string
  widget: string
  title?: string
  description?: string
  options?: unknown // plain data that the renderer reads
}

type DashboardWidgetRenderer = (tile: DashboardSpecTile) => ReactNode

type DashboardWidget = {
  render: DashboardWidgetRenderer
  ratio?: number
  minWidth?: number
  defaultSize?: DashboardTileSize // { w: number; h?: number }
}

type DashboardWidgetRegistry = {
  widgets: Readonly<Record<string, DashboardWidget>>
  fallback?: DashboardWidgetRenderer // draws a spec tile whose kind no widget claims
  mount?: Mount
}

type DashboardSpec = {
  tiles: DashboardSpecTile[]
  layout: DashboardLayoutItem[]
  filter?: QueryGroup
}
```

The renderer gets the spec tile whole, as a chat renderer gets its part. `options` arrives as
`unknown`, because the dashboard cannot know what the app saved. The cast belongs at the
registration, where the kind and the options are agreed. The renderer returns an element, and
the component of that element reads the scope with the hooks, as in a JSX tile.

The plan sketch had a generic `DashboardWidget<Options>`. A registry of mixed kinds erases the
parameter at once, so the generic adds no safety. The chat pattern is also the house pattern.

A widget has no `fallback` of its own. A widget that suspends can hold its own `Suspense`
boundary inside `render`. The registry `fallback` then keeps one meaning: the renderer for a
kind that no widget claims.

### 9.2 Composition

```tsx
const widgets = {
  revenue: { render: (tile) => <Revenue {...(tile.options as RevenueOptions)} />, ratio: 16 / 9 },
  units: { render: () => <Units />, minWidth: 160, defaultSize: { w: 6, h: 16 } },
}

<DashboardWidgetProvider widgets={widgets}>
  <Dashboard
    aria-label="Sales"
    layout={{ value: spec.layout, onValueChange: (layout) => setSpec({ ...spec, layout }) }}
    filter={{ value: spec.filter, onValueChange: (filter) => setSpec({ ...spec, filter }) }}
  >
    <DashboardTiles tiles={spec.tiles} actions={(tile) => <Remove id={tile.id} />} />
  </Dashboard>
</DashboardWidgetProvider>
```

`DashboardTiles` is a child of `Dashboard`, not a `spec` prop on it. A `spec` binding would bind
the layout and the filter a second time, beside the `layout` and `filter` bindings, and the
two could disagree. As a child, each value keeps one binding. JSX tiles and spec tiles can also
share one board.

`DashboardSpec` is therefore a type, not a binding. It names the shape of a saved board: the
app writes the three fields to storage and reads them back.

### 9.3 The provider

Nesting merges, as in `ChatEmbedProvider`. An inner provider adds its widgets to the widgets of
an outer provider, and it wins on a name that they share. Its `fallback` and its `mount` stand
in only where it sets them. A second entry point can then ship the chart adapters, and the app
adds its own kinds around them.

Hoist `widgets` out of the render. A fresh object in each render is a fresh registry, and each
spec tile then renders again.

### 9.4 A kind that no widget claims

A spec tile whose kind no widget claims keeps its cell and its chrome. Its content box states
the gap: "This dashboard cannot show a “forecast” tile." A provider `fallback` replaces that
line. A saved board that outlives a kind therefore still renders, the layout does not shift,
and the user can remove the tile. The tile boundary does not catch it, because nothing threw.

That tile demands no width. The kind that set its `minWidth` is gone, and a line of text needs
no floor. Under the default floor of 320 px, a narrow saved span re-packed the whole board, and
edit mode then stood down, so the user could not rearrange the board or remove the tile.

### 9.5 Mount

`DashboardTile` takes `mount`, the `Mount` policy of its content:

- `always`, the default, renders the content at once, as in version one.
- `lazy` holds the content until the tile comes near the viewport, and then keeps it.
- `active` also unmounts the content when the tile leaves the viewport.

A held tile shows its `fallback`. Its cell already holds the space, so nothing shifts when the
content arrives. The provider `mount` applies to each spec tile.

The server and the hydration render show the fallback of a held tile. `useInView` reports each
target as visible where no observer exists, so the server alone would render the content, and
the first client render would not. The gate therefore opens only after hydration.

The default is `always`, and not the `lazy` of the chat. At load, most of a board is on screen.
A lazy default adds an observer and a placeholder frame to each visible tile, to spare the few
tiles under the fold. A transcript is the opposite case: most of its embeds are off screen.

### 9.6 A tile with no entry

`DashboardTile` takes `defaultSize`: the span of the tile when the layout holds no entry for it.
Without it, the tile takes 8 columns, and a free-form tile takes 18 rows. A widget carries a
`defaultSize`, so an added stat takes a small span and an added grid takes the full width. The
tile still takes a new row under the lowest tile, and the first commit writes its entry. The
engine reads the value in `resolveLayout`, through the tile demands.

### 9.7 Render cost

`DashboardTiles` renders each spec tile through a memoized component, keyed by the tile `id`. A
spec tile that keeps its object, under a registry that keeps its object, does not render again
when the app commits a new layout. A drag preview renders no spec tile, as in version one.

### 9.8 Out of scope

These items stay in the backlog, and the registry enables each of them:

- The tile actions: remove, duplicate, and expand to a dialog. `DashboardTiles` takes an
  `actions` render function, so an app can place its own remove control now. (Built later:
  `onRemove`, `onDuplicate`, and `expandable` on `DashboardTile` and `DashboardTiles`.)
- The pure spec operations. A remove must also drop the layout entry of the tile. Else the
  entry stays in the saved layout, and its space stays open. (Built later in
  `engine/dashboard-spec.ts`.)
- A validator for a spec that the app reads from storage. (Built later: `parseDashboardSpec` in
  `engine/dashboard-spec-parse.ts`. It repairs the spec and reports each change.)
- Presets. (Built later: `DashboardPreset` and `startFromPreset` in `engine/dashboard-preset.ts`.
  A start replaces the board, so the app clears the selection and keys the board with the preset
  id.)

## 10. Verification

- Unit tests for each engine file, with no React.
- Component tests for the SSR markup, the store subscription count, the gestures, `inert`, the
  boundaries, and the scope.
- `biome check`, `turbo run check-types`, and the boundary suites.
- The docs demo in the browser: a drag into free space, a reorder, a resize, and a cross-filter.
- For the registry: component tests for a registered kind, a kind that no widget claims, the
  merge of nested providers, the demands that a widget gives its tile, the SSR markup of a spec
  tile, each `mount` policy, and a commit that renders no unchanged spec tile. A docs demo adds
  a tile from a menu, removes a tile, and shows the spec as plain data.
