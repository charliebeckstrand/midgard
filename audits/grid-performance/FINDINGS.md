# Grid Module — Performance Audit (Interim, Paused)

> **Status: PAUSED mid-scan — findings below are mostly UNVERIFIED candidates.** The audit reached the end of the *Find* phase but was stopped at the start of *Verify*. Treat every finding as a hypothesis to confirm, not a confirmed defect.

## Run state

| Item | Value |
|---|---|
| Workflow | `grid-perf-audit` |
| Run ID | `wf_34e8ec6c-b1d` |
| Phases complete | **Map** (5/5 subsystems), **Find** (11/11 dimensions) |
| Phases partial | **Verify** (2 of ~101 findings checked) |
| Phases not started | **Critic**, **Synthesize** |
| Candidate findings | **101** (🔴 8 critical · 🟠 40 high · 🟡 45 medium · ⚪ 8 low) |
| Verified so far | 2 — **both downgraded to Low** under scrutiny (see below) |

### What "candidate" means here

The Find phase is deliberately high-recall: each finder reports anything that *might* scale badly. The Verify phase is where claims are adversarially checked against the real code — is it truly on a hot path, and not already neutralized by React/TanStack memoization? Only 2 findings cleared that gate before the pause, and **both top-severity candidates collapsed to Low** once verified. Expect similar attrition across the rest: the raw severities below are finder-assigned and will move.

### How to resume

Same container/session (workflow journal still warm): re-run the workflow with `resumeFromRunId: "wf_34e8ec6c-b1d"` — completed Map/Find agents return cached results instantly, and Verify continues from where it stopped.

Fresh session (journal gone with the ephemeral container): the structured candidates are preserved in `grid-perf-audit-state.json` beside this file. Relaunch verification over those candidates, then run the Critic and Synthesize phases.

## Partial verification results (2 findings)

Both verified candidates were filed at high/critical severity and **downgraded to Low** — a useful calibration signal for the unverified remainder.

### V1. use-grid-truncation.ts — per-commit re-measure

- **Verdict:** isReal=`True` · onHotPath=`False` · alreadyMitigated=`True` · confidence=`high`
- **Adjusted severity:** ⚪ Low (finder filed it higher)

<details><summary>Verifier reasoning</summary>

The cited code is accurate: use-grid-truncation.ts:76 `useLayoutEffect(measure)` has no dep array, so `measure()` runs after every commit of a mounted GridCellContent/GridHeaderTitle, and `isOverflowing` (lines 34-46) does forced layout reads (createRange + getBoundingClientRect x2) on the sub-pixel path. GridCellContent and GridDataCell are not memoized (grid-cell-content.tsx:38, grid-row.tsx:323), so a re-rendering row does re-measure all its cells. That much is real.

But nearly every hot-path trigger the finding cites is neutralized:

1) "Selection toggle triggers V forced layout reads": FALSE for a single-row toggle. GridRow is memo'd on `selected` (grid-row.tsx:303, comment 132-134), and the `cells` prop is TanStack's memoized getVisibleCells (verified in table-core 8.21.3 ColumnVisibility.ts:215 — same array identity unless visibility/order/pinning change). So a single toggle re-measures only the toggled row's cells. Select-all flips every visible row's `selected` and does cause a one-shot burst across *visible* cells — but bounded by V (virtualization caps it), not by total rows.

2) "Cursor move that bubbles a parent render": FALSE. Navigation uses an external store (use-grid-navigation.ts:157-187, useSyncExternalStore-style) that re-renders only the two cells whose active flag flips — and those are the cursor cell markers, not GridCellContent. The `active` useState does re-render GridData/GridBody, but GridRow's memo wall (stable cells/selection/toggleRow) blocks it from reaching the truncation cells.

3) "Typing in editors": FALSE — the editable grid passes `truncate={false}` (grid-editable.tsx:226) and its cells use a plain CSS `truncate` class (grid-editable-cell.tsx:89), never useGridTruncation. The hook is exclusively the read-only data-cell and header path.

4) "Typing in search": the body legitimately re-renders with a *changed* row set, so re-measuring changed content is correct, not redundant.

5) "ResizeObserver re-created on every virtualized scroll as rows recycle": that is inherent to virtualization (new cells mount with new keys → new observers + one mount-time measure), not a pathology of the missing dep array. The depless effect's only added cost is at most one redundant measure on a commit where content/width didn't change.

So the genuine residual cost is: rows that re-render without a content/width change (a `selected` flip, a select-all burst) re-measure their visible cells redundantly. This is bounded by visible-cell count, capped by virtualization, gated by the GridRow memo wall, and the setState content-bail prevents any re-render loop. The claimed "dominant per-cell/per-scroll cost at scale / critical" is not supported. The recommended `[content, width]` deps are also imperfect here (width isn't a prop, and the ResizeObserver already handles width). Real but minor — downgraded from critical to low.

</details>

### V2. grid-data.tsx — `selection` in head context value

- **Verdict:** isReal=`False` · onHotPath=`True` · alreadyMitigated=`False` · confidence=`high`
- **Adjusted severity:** ⚪ Low (finder filed it higher)

<details><summary>Verifier reasoning</summary>

The finding's individual mechanics are all verifiably true, but the load-bearing causal claim is false, so the cited fix is a no-op.

Verified true: (1) toggleRow calls setSelection((prev) => toggleItem(prev, key)) and toggleItem returns `new Set(set)` (utilities/toggle-item.ts:5-12), so the `selection` Set's identity changes on every toggle. (2) The head-facing context memo includes `selection` in deps (grid-data.tsx:766-789), so the context value identity changes per toggle. (3) GridContext is a plain React context via `use(Context)` (core/create-context.ts:64-72), so all consumers re-render on identity change. (4) GridHeaderCell calls useGrid() (grid-head.tsx:162) and is NOT memoized (plain `function GridHeaderCell` at grid-head.tsx:151); GridHead is also NOT memoized (`export function GridHead` at grid-head.tsx:71). Only the leaf GridColumnHeader (grid-head.tsx:448) and GridReorderableColumnHeader (grid-head.tsx:541) are memo'd. So each header-cell body does re-run columnSort + resize.getSize/isResizing + builds the `shared` object, O(columns), and bails at the memoized leaf. The hot-path cost the finding describes (O(columns) header work per selection toggle) genuinely exists.

Why isReal=false: the finding attributes that O(columns) header churn to `selection`'s membership in the context value, and recommends removing it from the memo deps as the cure. But `selection` is local state of the Grid component itself (grid-data.tsx:658, `const { selection, setSelection } = useGridSelectionState(...)`). Every toggle re-renders the entire Grid body. Grid builds `tableContent` — which contains `<GridHead .../>` inline (grid-data.tsx:856-889, 879) — fresh on every render with no useMemo and no memo boundary; it is passed straight into `<GridContext value={context}>` (line 929). Because GridHead is rendered inline by an un-memoized parent that re-renders on every toggle, GridHead and all GridHeaderCells re-render on every toggle REGARDLESS of whether `selection` is in the context value. Removing `selection` from the head-facing context therefore eliminates none of the cited O(columns) work. The only thing context membership of `selection` could gate is a consumer otherwise insulated from the parent re-render (i.e., a memoized GridHead with stable props) — and no such insulation exists here. The finding misidentifies the cause and prescribes an ineffective fix.

Severity downgraded to low: a real fix would require memoizing the head subtree (stable props + React.memo), which the finding does not propose; and even the actual churn bails immediately at the memoized header leaves, so the per-toggle cost is a few cheap array scans per column, not a render of the header content. Confidence high — the inline, un-memoized render path of GridHead is unambiguous in the source.

</details>

## Architecture & hot-path map

### grid table-engine (useGridTable + TanStack Table adapters, column order/visibility/pinning/fit, sorting, reorder)

The table engine is a TanStack Table v8 instance built once per Grid in `useGridTable` (use-grid-table.ts:337) and re-evaluated every GridData render. It adapts `GridColumn[]` to `ColumnDef[]` with referentially-stable per-id cell renderers (use-grid-table.ts:165 `useStableColumnDefs`) so cells don't remount, and routes rows through the row model only when a client-side transform (client pagination/filter/sort) is active (use-grid-table.ts:378-389). Controllable state (pagination, sizing, global filter, column filters, sort, order, visibility) lives in React state above the engine and is mirrored into TanStack's controlled `state` via a freshly-allocated object each render (`buildState`, grid-table-options.ts:271). Most derived view models (resize/pinning/filter controls) are memoized and read the engine live, so they're cheap. The genuinely hot, data-size-scaling work is: (1) the `state` object identity churning every render forcing TanStack to re-diff and frequently rebuild memoized row models; (2) `renderRows`/`rowKeys`/`rowIndexMap` rebuilt over ALL rendered rows every render even when virtualizing; (3) `toRowSelectionState` rebuilding an object over the entire selection Set on every render; (4) `compareSmart` doing regex-heavy numeric parsing per comparison during client sort. Column-scaling work (visibleColumns derivation, navColumns augmentation) is bounded by column count and mostly memoized/reference-stabilized.

**Render/recompute model:** The engine is constructed once (useReactTable) and its options object is rebuilt on every GridData render. TanStack's `state` prop (buildState, grid-table-options.ts:289) is a NEW object literal each render; combined with `rowSelection`/`columnPinning`/`sorting` arrays/objects that are memoized but `columnVisibility` passed straight through, this drives TanStack's internal state-change detection. Memoized row models (`getRowModel`, `getSortedRowModel`, `getFilteredRowModel`, `getPrePaginationRowModel`) recompute only when their structural inputs change (data ref, sorting, filters, pagination) — but `renderRows = table.getRowModel().rows.map(r => r.original)` (use-grid-table.ts:386-389) allocates a new array every render whenever pagination or any client transform is on. Per-render, non-memoized: `renderRows` array (O(visible rows)), `pagination` view model (use-grid-table.ts:394, intentionally unmemoized, calls `getPrePaginationRowModel().rows.length` = O(filtered rows)), `hasColumnFilters`/`columnPinning`-feeding `columns.some`/`toColumnPinningState`. In GridData: `rowKeys` (memo on renderRows), `rowIndexMap` (memo on renderRows, O(rows) Map build), `colIndexMap`, `dataColumns` (memo on visibleColumns). `visibleColumns` (useVisibleColumns, grid-table-views.ts:183) recomputes from live engine leaf-column getters every render but is reference-stabilized by element-wise compare. Sorting comparators (compareSmart) run O(n log n) per client sort, each comparison invoking regex parsing.

**Hot paths:**

- use-grid-table.ts:386-389 — renderRows = table.getRowModel().rows.map(modelRow => modelRow.original): new array allocated every GridData render when paginated or any client transform active; scales with rendered-row count, runs even under virtualization (it maps the full page/filtered set, not the visible window)
- grid-table-options.ts:51-61 — toRowSelectionState rebuilds a fresh {[id]:true} object iterating the ENTIRE selection Set on every render (memoized only on `selection` identity, but selection is a new Set on each selection change); O(selected rows) per selection mutation
- grid-table-options.ts:289 — buildState returns a brand-new state object literal every render, handed to useReactTable; forces TanStack to re-run its state reconciliation each render
- grid-table-views.ts:288-289 — buildPaginationView calls table.getPrePaginationRowModel().rows.length every render (pagination view is intentionally non-memoized, use-grid-table.ts:391-403); O(filtered rows) length access plus model dependency
- grid-sorting-utilities.ts:99-115 / 31-54 — compareSmart→parseNumeric runs 3 regex replaces + a test per value, twice per comparison, during every client sort of the full row set (O(n log n) comparisons)
- grid-data.tsx:716-719 — rowIndexMap = new Map(renderRows.map(...)) rebuilds an O(rows) Map keyed by row object on every renderRows change; feeds navigation index lookups
- use-grid-navigation-columns.tsx:108-142 — under `navigable`, every data column's cellProps/cell is wrapped so each cell render does two Map.get lookups (rowIndexMapRef/colIndexMapRef) per cell; O(visible cells) per render, and each GridNavCell subscribes via useSyncExternalStore

**Preliminary concerns:**

- use-grid-table.ts:386-389: `renderRows` is recomputed and reallocated on every render whenever pagination or a client transform is active. Because it's a new array reference, every downstream memo keyed on `renderRows` (rowKeys grid-data.tsx:705, rowIndexMap grid-data.tsx:716, the body's row list) invalidates each render even when the underlying rows are unchanged. With large pages this is repeated O(rows) work plus cascading memo busts. Under virtualization the body only renders a window, but this map still walks the entire page.
- grid-table-options.ts:51-61 + use-grid-table.ts:329: `rowSelection = useMemo(toRowSelectionState(selection), [selection])` rebuilds an object over the whole selection Set whenever the Set identity changes. Large-selection workflows (select-all of thousands) allocate an O(selected) object on each selection change, and that new object feeds the per-render `buildState`, contributing to TanStack state churn.
- grid-table-options.ts:289 / use-grid-table.ts:344-361: `buildState` allocates a fresh state object every render. Even when nothing changed, TanStack receives a new `state` reference and must reconcile it. This is the central per-render cost multiplier for the whole engine and interacts badly with any frequently-rerendering parent (e.g. resize drag with columnResizeMode:'onChange', rapid typing into search/filter).
- use-grid-table.ts:391-403 + grid-table-views.ts:288-289: the pagination view is intentionally not memoized and calls `getPrePaginationRowModel().rows.length` every render. The comment says 'the footer is cheap' — true for the view object, but `getPrePaginationRowModel` ties the footer's existence to the filtered row model and the `.length` read forces the engine to keep that model materialized; combined with the non-memoization, every grid render touches it.
- grid-sorting-utilities.ts:31-54: `parseNumeric` runs `.replace(CURRENCY)`, `.replace(NUMERIC_NOISE)`, `.replace(/%$/)` and a `DECIMAL.test` for each string value, and `compareSmart` calls it for both operands on every comparison. During a client sort of N rows that's ~O(N log N) regex passes with no per-value memoization; on wide/large datasets sorting will be visibly costly versus a precomputed sort key.
- grid-data.tsx:716-719 / use-grid-navigation-columns.tsx:108-142: navigation builds a per-render `rowIndexMap` keyed by row object (O(rows)) and, under `navigable`, every cell's cellProps/cell closure does two Map lookups per render. For a wide navigable grid this is O(visible cells) Map.get calls per render on top of one useSyncExternalStore subscription per cell — fine windowed, but heavy if `navigable` is combined with no virtualization on many rows.
- grid-table-views.ts:183-193 (useVisibleColumns): recomputes `deriveVisibleColumns` (three getLeftVisible/Center/Right leaf-column calls into the engine) on EVERY render, then element-compares to stabilize the reference. The stabilization protects downstream memos, but the derivation itself (live engine leaf-column resolution + array build) runs unconditionally each render; bounded by column count so only a concern with very many columns.

### grid core-render (grid.tsx, grid-data.tsx, grid-body.tsx, grid-virtualized-body.tsx, grid-row.tsx, grid-head.tsx, grid-cell-content.tsx, context.ts, grid-constants.ts, index.ts)

Grid (grid.tsx:45) is a thin dispatcher to GridData (read-only) or GridEditable. GridData (grid-data.tsx:552) is the monolithic owner: every controllable state hook lives here — sort (useGridSort), selection (useGridSelectionState), pin overrides (useState), column order/visibility (useGridColumns), and the entire TanStack engine (useGridTable) — so ANY state change re-renders the whole GridData tree (head + body + footer). Rendering then fans out: GridHead -> per-column GridHeaderCell (NOT memoized, routes to memoized GridColumnHeader/GridReorderableColumnHeader); GridBody branches to plain map or GridVirtualizedBody, both calling renderGridRow -> GridRow (memoized, re-renders only when its own props change). Inside a row, GridDataCell (NOT memoized) maps cells through flexRender. The render path is well-memoized at the row boundary (GridRow via memo, selected passed as prop) and stable-identity engine view objects (resize/pinning/filter methods read the engine live). The main scaling risks are in per-row work that runs on every GridData render and in two ResizeObserver-driven write paths. virtualize requires maxHeight (throws otherwise, grid-data.tsx:589).

Render-trigger map: MOUNT — engine build, column-def stabilization, ResizeObservers (column-fit, resize-height, per-cell/per-header truncation). EVERY GridData RENDER — resolveSortable/applyPinOverrides/useStableColumnDefs memos (deps-gated), useVisibleColumns recompute (element-wise stabilized), rowKeys/rowIndexMap/colIndexMap memos rebuild on renderRows identity change, full head re-render, full visible-row-window re-render. PER-ROW (every GridData render, for each rendered/windowed row) — renderGridRow calls table.getRow(key).getVisibleCells() and the rowLoading/rowClassName/rowLabel callbacks; GridRow memo absorbs this unless a prop changed. PER-CELL — flexRender + cell.getContext(), col.cellProps(row), resolveCellTooltip(col,row), and a useGridTruncation hook (useState + useLayoutEffect measure on every commit + ResizeObserver) per truncated data cell and per header title. PER-KEYSTROKE (search/filter input) — engine re-filters, renderRows identity changes, all parallel-array memos rebuild, whole body re-renders. PER-SCROLL (virtualized) — useVirtualWindow recomputes virtualItems; only the windowed row slice + 2 spacer rows re-render. ON SELECTION CHANGE — selection Set identity changes -> GridData context value (grid-data.tsx:766) changes -> every useGrid() consumer (each GridHeaderCell) re-renders, and each GridRow re-renders via its selected prop diff (intended, scoped to the toggled key, but toggleAll touches all).

**Render/recompute model:** Single owning component (GridData) holds all grid state; React re-renders the entire GridData subtree on any state change. Two memo boundaries contain the blast radius: (1) GridRow = memo(GridRowImpl) re-renders only when its props (cells, selected, className, etc.) change — selection is passed per-row as a boolean prop so a single-row toggle re-renders one row; (2) the engine view objects (GridColumnResize/GridColumnPinning/GridColumnFilter) are stable references whose methods read the live TanStack table, so header cells reading resize.getSize()/pinning.side() don't churn identity. visibleColumns is reference-stabilized element-wise (useVisibleColumns, grid-table-views.ts:183). Virtualization (useVirtualWindow over @tanstack/react-virtual) windows the body to viewport+overscan rows and pads with two spacer <tr>s; the header is never virtualized. renderRows is the engine row model only when a client-side transform (pagination/client filter/client sort) is active, else it is the raw rows array passed through.

**Hot paths:**

- grid-row.tsx:97 renderGridRow calls props.table.getRow(String(key)).getVisibleCells() once per rendered row, every GridData render — O(rows_in_view x columns) cell-array resolution from the engine on each render pass (memoized internally by TanStack but invalidated by any visibility/order/pinning/sizing state change)
- grid-row.tsx:244-297 GridRowImpl maps every visible cell per row; GridDataCell (grid-row.tsx:323) is NOT memoized so all cells in a row re-render whenever the memoized row re-renders — O(visible_columns) per re-rendered row
- grid-cell-content.tsx:38-57 + use-grid-truncation.ts:63 useGridTruncation runs per truncated data cell AND per header title: useLayoutEffect(measure) with no deps fires after EVERY commit, plus a per-element ResizeObserver — O(visible_cells) layout reads (scrollWidth/clientWidth + document.createRange + getBoundingClientRect) on every render and every column resize
- grid-row.tsx:332,336,340 per-cell: col.cellProps?.(row), flexRender(...cell.getContext()), resolveCellTooltip(col,row) (which invokes col.cellTooltip(row)) — all run per cell on each row re-render
- grid-data.tsx:705-724 rowKeys/rowIndexMap/colIndexMap rebuilt (new Map over all renderRows) whenever renderRows identity changes — O(rows) on every data/sort/filter/page change; renderRows is full (not windowed) even when virtualized
- use-grid-column-fit.ts:100-104 + use-grid-resize-height.ts:41-43 two ResizeObservers fire on container/table size changes; column-fit recomputes fitSizes (O(columns)) and calls table.setColumnSizing on every container resize, resize-height writes a CSS var measuring table.offsetHeight (forced layout) on every table size change
- grid-data.tsx:759 exportCsv memo body maps table.getSortedRowModel().rows over ALL rows (every page) — only runs on invocation, but materializes the full sorted model

**Preliminary concerns:**

- grid-data.tsx:766 — the shared context value embeds `selection` (a Set whose identity changes on every toggle). Every GridHeaderCell calls useGrid() (grid-head.tsx:162), so each selection change re-renders all header cells (then bails at the memoized GridColumnHeader children). A toggleAll on a large selection also forces all GridRow re-renders via the selected prop. Splitting selection out of the head-facing context (head only needs allSelected/someSelected/toggleAll, not the raw Set) would decouple header re-renders from per-row selection churn.
- grid-row.tsx:97 — getVisibleCells() is called per rendered row on every GridData render. For a non-virtualized grid with thousands of rows this is O(rows x columns) engine work each render even when rows are memo-stable; the memo on GridRow saves the React reconciliation but the cells array is still computed before the memo can compare. Pairing a non-virtualized grid with frequent state changes (e.g. typing in a search box) scales badly. Virtualization bounds this to the window, so the concern is the unvirtualized large-row path.
- use-grid-truncation.ts:76 useLayoutEffect(measure) has no dependency array — it re-measures (layout read via createRange/getBoundingClientRect in isOverflowing, use-grid-truncation.ts:34-46) after EVERY commit for EVERY truncated cell and header. With many visible columns x windowed rows this is a synchronous layout pass on each render; combined with the per-element ResizeObserver it is the most layout-thrash-prone path during column resize and fast scrolling (new windowed rows each mount a fresh observer + measure).
- grid-data.tsx:846 resolveResizeLayout builds the <colgroup> (col per visible column) every render, and grid-head.tsx:197 / grid-row.tsx pinnedOffsetStyle call resize.getSize()/pinning.side()/leftOffset() live per header cell and per body cell each render — these hit table.getColumn(...).getSize()/getStart() per cell. Cheap individually, but O(visible_cells) live engine reads per render; during an active drag-resize (isResizingAny re-renders GridData continuously) this compounds with the truncation re-measure above.
- grid-virtualized-body.tsx:51 + grid-data.tsx:910 — virtualization is opt-in and the header is never windowed, so a very wide table (hundreds of columns) renders every header cell and every windowed row's full cell set with no column virtualization; per-cell truncation observers and flexRender then scale with column count regardless of row windowing. No horizontal virtualization exists.
- grid-data.tsx:740,827 hasData/ariaRowCount and several derived scalars are recomputed inline each render (cheap), but renderRows.length and pagination?.rowCount drive aria-rowcount on a path where renderRows for a client-paginated grid is the post-pagination slice while the engine still materializes getRowModel() — confirm the full row-model materialization (use-grid-table.ts:386-389) isn't run twice with the exportCsv getSortedRowModel() on large datasets.

### grid interaction (keyboard navigation, selection, truncation, resize-height, context menu, column manager, column filter)

The interaction subsystem is mostly well-architected for scale: the keyboard cursor and active-cell flag both use external-store subscription (useSyncExternalStore / hand-rolled listener set) so a cursor move re-renders only the two cells whose active flag flipped, not the whole grid (use-grid-navigation.ts:158-187, use-grid-navigation-columns.tsx:37-55); navigation callbacks read bounds/rows through refs so they stay referentially stable; selection toggles use functional updaters against a rowKeys ref so they don't churn the memoized rows (use-grid-selection.ts:63-84); the context menu builds items lazily on right-click, not per render. The clearest scaling concern is the truncation hook, which mounts one ResizeObserver per visible data cell and re-measures (forcing layout via Range/getBoundingClientRect) on EVERY commit — this is the dominant per-cell, per-scroll cost in a virtualized grid. Secondary concerns: selection flag derivation is O(rows) every render, the context menu rebuilds two Maps over all rows/columns whenever rows change, and uniqueValues sorts+dedupes faceted values each filter-button render.

Render/recompute timing by file:
- use-grid-navigation.ts: hook lives at grid-data level (one instance). setActive on key/focus/blur triggers a parent re-render of the table subtree, but the layout effect (168-172) fans the new coord to subscribed cells via the store, so individual cells update through subscription not prop diffing. moveTo/onKeyDown/onFocus/onBlur are stable (ref-backed deps). navTableProps object is rebuilt every render (286-294) but only spread onto the single <table>.
- use-grid-navigation-columns.tsx: augmented columns memoized on [enabled, columns, refs, cellId, moveTo] (95-145); GridNavCell subscribes per cell and toggles data-active imperatively in a layout effect (43-55), plus scrollIntoView on the newly-active cell.
- use-grid-selection.ts: allSelected (rowKeys.every) and someSelected (rowKeys.some) recompute O(rowKeys) on every Grid render (59-61). toggleRow/toggleAll stable.
- use-grid-truncation.ts: per-cell hook. useLayoutEffect(measure) with NO dep array (76) runs after every commit of every mounted cell; effect (78-92) registers a ResizeObserver per cell and a document.fonts.ready callback. measure() calls isOverflowing which constructs a Range and calls getBoundingClientRect twice (forced reflow) whenever scrollWidth<=clientWidth (34-46). Only mounted when truncate is enabled (grid-row.tsx:339).
- use-grid-resize-height.ts: single effect, one ResizeObserver on the <table>, writes a CSS var on resize. Cheap; runs only when resizable. Fine.
- grid-context-menu.tsx: one instance at grid-data level. columnById and rowByKey Maps rebuilt via useMemo on [columns] and [rowKeys, rows] (267-275) — rowByKey is O(rows) and rebuilds on any data change. resolve* and handleContextMenu are memoized; item building happens only on right-click.
- grid-column-manager.tsx / -dialog.tsx: render only inside the dialog (mounted but dialog typically closed). pinnedColumns/orderableColumns memoized (76-82). List re-render scales with column count, not rows; opens rarely.
- grid-column-filter-button.tsx: one instance per filterable, interactive header cell (grid-head.tsx:518,606), inside memoized GridColumnHeader so it only re-renders when that header's props change. On each of its renders it calls filter.uniqueValues(column.id) for select columns (75-77) and JSON.stringify(facetValues) (82); uniqueValues maps+filters+dedupes+localeCompare-sorts the faceted Map (grid-table-views.ts:260-270).

**Render/recompute model:** Two distinct render models. (1) Cursor/active-cell and read-only navigation use an external store + useSyncExternalStore / imperative DOM attribute toggling, so cursor moves and selection-driven active-cell changes bypass React reconciliation of the row tree and update only affected cells — this scales well with many rows/columns and fast arrow-key movement. (2) Everything else recomputes through normal React render: the navigation/selection/context-menu hooks live once at the grid-data level, so a parent re-render (selection change, data change, filter change, pagination) re-runs their bodies and their O(rows)/O(columns) derivations. Header cells (and their filter buttons) are memoized (memo on GridColumnHeader/GridReorderableColumnHeader), so they re-render per-column only when that column's props change. Data rows are memoized (GridRow memo), so on virtualized scroll only newly-windowed rows mount/unmount; each newly mounted truncation cell then runs its layout-effect measure + installs a ResizeObserver, making truncation the per-scroll hot path.

**Hot paths:**

- use-grid-truncation.ts:76 useLayoutEffect(measure) with no dependency array — runs isOverflowing() after EVERY commit of EVERY mounted truncation cell (per-cell, per-commit; multiplied across all visible cells on every grid re-render)
- use-grid-truncation.ts:34-46 isOverflowing — on the sub-pixel path constructs a document.createRange() and calls getBoundingClientRect() on both the Range and the element, forcing synchronous layout; executed per cell per measure
- use-grid-truncation.ts:78-92 one ResizeObserver per visible data cell (and per header title), installed/torn down on every virtualized scroll as rows window in/out
- use-grid-navigation-columns.tsx:37-55 per-cell useSyncExternalStore subscription + layout effect toggling data-active and calling scrollIntoView on the active cell, for every navigable data cell
- use-grid-selection.ts:59-61 allSelected = rowKeys.every(...) and someSelected = rowKeys.some(...) — O(rowKeys) on every Grid render
- grid-context-menu.tsx:272-275 rowByKey Map rebuilt over all rows on every rows/rowKeys change (O(rows))
- grid-column-filter-button.tsx:75-82 filter.uniqueValues(column.id) + JSON.stringify(facetValues) on each filter-button render, per select-filterable header
- grid-table-views.ts:260-270 uniqueValues: spreads faceted Map keys, filters, maps to String, new Set dedupe, localeCompare sort — O(distinct values · log) per call

**Preliminary concerns:**

- use-grid-truncation.ts:76 — `useLayoutEffect(measure)` is intentionally dependency-array-free so it fires every commit; combined with the Range/getBoundingClientRect reflow in isOverflowing (use-grid-truncation.ts:37-45), every visible truncation cell forces synchronous layout on every grid re-render. With N visible cells this is N forced reflows per commit. The setState bail-out prevents re-render loops but NOT the measurement cost itself. This is the subsystem's biggest per-row/per-scroll concern at scale.
- use-grid-truncation.ts:87-89 — one ResizeObserver per cell. A wide grid with truncation on can register hundreds of observers simultaneously, each re-created on virtualized scroll as rows recycle (use-grid-truncation.ts:78-92). ResizeObserver callbacks also call measure() (more reflows) on any column-width or density change, firing for all observed cells at once.
- use-grid-selection.ts:59-61 — allSelected/someSelected scan rowKeys on every Grid render (not memoized). For large page sizes and frequent re-renders (typing in a global filter, cursor moves that bubble a parent render) this is repeated O(rows) work; someSelected in particular gates the batch-actions toolbar (grid-data.tsx:958).
- grid-context-menu.tsx:272-275 — rowByKey rebuilds a Map over every row whenever `rows`/`rowKeys` change, even though items are only needed on right-click. On large pages this allocates an N-entry Map on every data change for a menu that may never open; could be deferred to the click handler.
- grid-column-filter-button.tsx:82 — `JSON.stringify(facetValues ?? null)` serializes the full distinct-value array every render to derive a memo key; for high-cardinality select columns this stringify is O(distinct values) per filter-button render and runs even when the sheet is closed.
- grid-table-views.ts:260-270 — uniqueValues does spread + filter + map + Set + localeCompare sort with no memo; called from the filter button render path (grid-column-filter-button.tsx:77) so it recomputes whenever that header re-renders, not just on open.

### grid editable subsystem (use-grid-editable-*.ts / grid-editable-*.tsx)

The editable grid layers an edit/navigation/selection/history/mutation stack over the read-only `Grid` via `GridEditable` (grid-editable.tsx). Architecture and render triggers:

MOUNT: `GridEditable` wires seven hooks. `useGridEditableRows` (rows.ts) builds `editableCols` (filter) and a `rowIndexMap` Map<T,number> over all rows; `useGridEditableNavigation` owns reactive active/anchor/extraCells plus mirror refs; `useGridEditableDraft` owns the per-keystroke draft string; `useGridEditableHistory` owns ref-held undo/redo stacks; `useGridEditableMutations` builds the cell-write callbacks; `useGridEditableAugmentedColumns` (memo) projects each column into a GridColumn with `cell`/`cellProps`; `useGridEditableStore` (store.ts) creates an external store mirroring nav state.

PER-CELL (render): every visible row renders through GridRow (memo'd on its cells array); each data cell calls `flexRender(columnDef.cell, ...)` → the augmented `cell(row)` fn, which runs `rowIndexMap.get(row)` + `formatCell(row,col)`, then mounts `GridEditableCell`. Each `GridEditableCell` subscribes to `useGridEditableCellSlice` (useSyncExternalStore) computing isActive/inRange/showEditor with cached-by-content bail.

PER-NAVIGATION (arrow/click/tab): nav state setters fire → `cellSnapshot` memo rebuilds → `useGridEditableStore` layout effect notifies all cell listeners → only cells whose slice flipped re-render. Well-scoped.

PER-KEYSTROKE (typing in editor): `setDraft` re-renders `GridEditable` fully, but all heavy memos (editableCols, rowIndexMap, augmentedColumns, cellSnapshot) hold, so `GridData`/rows bail via memo; only `editValue` memo rebuilds → the single mounted `GridEditableCellEditor` re-renders. Bounded and good.

PER-COMMIT / ON DATA CHANGE: a commit emits CellChange[] through `history.emit` → `onValueChange`; the consumer rebuilds `rows`, whose new identity is the dominant cost (see concerns). `history.emit/undo/redo` also call `bump()` (useReducer) re-rendering `GridEditable`, but memoized subtree bails.

PER-SCROLL: virtualization is delegated to `Grid`/`GridVirtualizedBody`; the editable layer adds nothing per-scroll beyond per-cell slice subscriptions on the newly-windowed cells (cheap).

**Render/recompute model:** Navigation/selection state is mirrored (not via context) into an external store (`useGridEditableStore`); each cell subscribes via `useSyncExternalStore` (`useGridEditableCellSlice`, grid-editable-context.ts:61-100) and re-renders only when its derived isActive/inRange/showEditor slice flips, with a content-cache bail. The live edit-session (draft/error/commit) flows through a separate React context (`GridEditableEditContext`) consumed only by the single mounted `GridEditableCellEditor`, so typing re-renders only the active editor, not the grid body. Cell render functions and `cellProps` are recomputed only when the augmented-columns memo rebuilds; its deps are `[columns, rowIndexMap, formatCell, addCellToSelection, moveActiveTo, beginEdit, cellId]`. Crucially `rowIndexMap` is rebuilt on every `rows` identity change (the controlled grid gets a new rows array after each onValueChange), so every committed edit rebuilds the cell render functions and re-renders all currently-rendered rows.

**Hot paths:**

- Per render of every windowed cell: augmented `cell(row)` runs rowIndexMap.get + formatCell, then GridEditableCell subscribes its slice (use-grid-editable-augmented-columns.tsx:120-137, grid-editable-cell.tsx:50)
- Per navigation move: cellSnapshot rebuild → store notify → every subscribed cell's `select()` recomputes inRect/extraCells.has (grid-editable.tsx:182-192, grid-editable-context.ts:70-97)
- Per keystroke: GridEditable full re-render (draft state) + editValue memo rebuild → active GridEditableCellEditor re-render (use-grid-editable-draft.ts:123-129, grid-editable.tsx:195-204)
- Per commit / data change: rows identity change → rowIndexMap O(N) rebuild → augmentedColumns memo rebuild → all rendered rows re-render (use-grid-editable-rows.ts:33-41, use-grid-editable-augmented-columns.tsx:140)
- Per commit through history: priorValue does rows.findIndex per change (use-grid-editable-history.ts:56-71,77)
- Per single-cell commit inside a multi-row selection: applyCellWrite iterates all rows to fan out (use-grid-editable-mutations.ts:92-96)
- Per bulk fill/paste over a rectangle+extras: collectFillCoords builds the full coord set then a change per coord (use-grid-editable-mutations.ts:20-46,106-139)

**Preliminary concerns:**

- use-grid-editable-history.ts:64 — `priorValue` runs `rows.findIndex((row,i)=>getKey(row,i)===change.rowKey)` for EACH change in a batch. A column-fill across a multi-row selection or a large matrix paste emits K changes, each scanning the rows array: O(N·K). For 'select all + type' (K≈N) this is O(N²). No rowKey→index map is reused even though `rowIndexMap`/`getKey` are already available. Verbatim: `const index = rows.findIndex((row, i) => getKey(row, i) === change.rowKey)`.
- use-grid-editable-rows.ts:33-41 — `rowIndexMap` is `useMemo(... rows.forEach ...)` keyed on `rows`. The editable grid is controlled, so the consumer hands back a fresh `rows` array after every `onValueChange`. Each commit therefore rebuilds an O(N) Map AND (because augmented-columns memo depends on `rowIndexMap`, use-grid-editable-augmented-columns.tsx:140) rebuilds every column's `cell`/`cellProps`, invalidating the cells arrays so all currently-rendered rows re-render. Under virtualization that's the window size, but the Map rebuild is full-N every edit.
- use-grid-editable-mutations.ts:92-96 — `applyCellWrite` fan-out: when the active row is in a selection of size>1, it walks ALL rows (`currentRows.forEach`) calling `getKey` per row to collect column-fill changes; combined with history's per-change findIndex (above) a single Enter on a 10k-row select-all is O(N²).
- grid-editable-context.ts:70-97 — every subscribed cell's `select()` recomputes `inRect` and `extraCells.has(cellKey(...))` on each store notification. With a large extraCells set (many ctrl-clicks) and many windowed cells, each navigation move runs (windowed cells)×(string cellKey alloc + Set lookup). The content-cache bails the re-render but the selector body still runs per cell per notification; cellKey allocates a string per call.
- use-grid-editable-mutations.ts:20-46 — `collectFillCoords` materializes the entire selection rectangle as Coord objects + a dedupe Set before writing; a large anchored rectangle (e.g. whole-column drag-select on 10k rows) allocates O(area) coords/strings up front, then each becomes a CellChange, each later findIndex'd by history → compounding allocation and O(N²) history cost on bulk fills.
- use-grid-editable-augmented-columns.tsx:120-137 — the `cell` render fn calls `formatCell(row,col)` on every render of every windowed cell (not memoized per cell); for columns with a non-trivial `format` callback this re-runs the formatter per cell per grid re-render (including each navigation-driven body re-render path), scaling with windowed-cells × format cost.

### data-io (pagination footer, page-window utility, CSV export, global-filter search input)

The four data-io files are thin presentational/pure helpers; the only data-size-scaling work lives in the code that feeds them, in use-grid-table.ts and the export call site in grid-data.tsx. grid-filter.tsx (32 lines) and grid-pagination.tsx (148 lines) are stateless renderers driven by view objects; grid-pagination-utilities.ts:getVisiblePages is O(1) (returns a fixed <=7-item window, never iterates all pages); grid-export.ts walks all rows x all data columns but only on an explicit download click. The notable concern is that the pagination view is rebuilt on EVERY render (intentionally, per a code comment) by calling several TanStack row-model accessors, and CSV export materializes the entire sorted row model into a string synchronously on the main thread.

**Render/recompute model:** GridFilter and GridPagination are pure function components with no internal state/effects/memo; they re-render whenever their parent (grid-data.tsx) re-renders, i.e. on any grid state change (scroll-driven virtual updates excepted only if the parent is structured to skip — here grid-data.tsx is the same component that owns virtualization, so footer/search re-render on every parent render). The driving view objects are produced in useGridTable: `pagination` is computed UN-memoized every render via buildPaginationView (use-grid-table.ts:394-403); `globalFilter` and `filters`/`pinning` ARE useMemo'd. Filtering/sorting/pagination row models are computed lazily and memoized internally by TanStack (getFilteredRowModel/getSortedRowModel/getPrePaginationRowModel), recomputing only when data, columnFilters, globalFilter, sorting, or pagination state change — not per render, not per scroll. CSV export recomputes nothing until the menu action fires.

**Hot paths:**

- use-grid-table.ts:394-403 — `pagination` view rebuilt every render (no useMemo), each rebuild calls table.getPrePaginationRowModel().rows.length, getPageCount(), getCanPreviousPage(), getCanNextPage()
- grid-table-views.ts:287-289 — buildPaginationView reads getPrePaginationRowModel().rows.length in client mode; touches the full filtered (pre-pagination) row set, scaling with total filtered rows
- grid-data.tsx:751-764 / grid-export.ts:48-58 — rowsToCsv over table.getSortedRowModel().rows.map(r => r.original): O(rows x dataColumns) string build, runs on export click only
- use-grid-table.ts:386-389 — renderRows = table.getRowModel().rows.map(...) builds a new array of originals every render when paginated/clientTransform
- grid-table-options.ts:206 — globalFilterFn 'includesString' runs over all rows on each keystroke that changes the global filter (debounced or not at this layer)

**Preliminary concerns:**

- use-grid-table.ts:394-403: the `pagination` view object is intentionally NOT memoized ('Computed each render ... the footer is cheap'). The object itself is cheap, but it allocates fresh `setPageIndex`/`setPageSize` closures every render (grid-table-views.ts:301-302), so GridPagination's props are referentially new on every grid render. Since GridPagination is not wrapped in React.memo, this is harmless today, but it defeats memoization if the footer is ever memoized, and getPrePaginationRowModel() is invoked unconditionally each render — fine because TanStack memoizes the model, but it ties footer cost to filtered-set size if filter state churns.
- grid-data.tsx:759 + grid-export.ts:48-58: CSV export is fully synchronous on the main thread — getSortedRowModel().rows.map(...original) allocates an array of all filtered/sorted rows, then rowsToCsv builds header+body via nested map/join and a per-field regex (escapeCsvField, grid-export.ts:14) over rows x columns. For large datasets (tens of thousands of rows) this blocks the UI thread and holds the whole CSV string plus a Blob in memory at once (grid-export.ts:70). No chunking/streaming/yielding. The export memo deps (grid-data.tsx:763) are fine; the cost is per-click, not per-render.
- grid-export.ts:33: exportValue falls back to `row[column.id]` and column.value(row) per cell with no caching; combined with the regex test per field this is the dominant per-cell cost during export of wide grids.
- grid-table-options.ts:206: global filter uses TanStack 'includesString' which lowercases and scans every cell's stringified value across all rows on each filter-state change. There is no debounce visible at this layer (grid-filter.tsx:24 calls filter.setValue on every onChange / keystroke, and use-grid-table.ts:426 forwards straight to table.setGlobalFilter), so rapid typing triggers a full re-filter pass per keystroke over the entire row set — scales linearly with rows x columns per keystroke. This is the main fast-typing hot path in data-io.
- grid-filter.tsx:24-27: no local input state or debounce; each keystroke calls setValue -> setGlobalFilterState -> table.setGlobalFilter, forcing a synchronous re-filter + re-render of the whole grid per keystroke. For large client-side datasets this will visibly lag typing.

## Candidate findings by dimension

*(Unverified. Severities are finder-assigned and expected to shift on verification. Cross-dimension duplicates are expected and will be merged during synthesis.)*

### React re-render hygiene & memoization
*11 candidates — 🔴 1 · 🟠 4 · 🟡 6*

#### [1] 🔴 Critical — useGridTruncation re-measures every cell and header on every commit (no effect dep array)

- **Where:** `packages/ui/src/modules/grid/use-grid-truncation.ts`:70-76 · _hot path_
- **Impact:** useLayoutEffect has NO dependency array, so it fires after EVERY commit of EVERY mounted truncation cell and header title. Each call runs isOverflowing(), which on the sub-pixel path does document.createRange() + getBoundingClientRect() twice (forced synchronous reflow). With V visible cells, a single grid re-render (selection toggle, cursor move that bubbles a parent render, typing in search) triggers V forced layout reads. Combined with one ResizeObserver per cell (lines 87-89) re-created on every virtualized scroll as rows recycle, this is the dominant per-cell/per-scroll cost at scale. The setState content-bail prevents a re-render loop but NOT the measurement cost.
- **Fix:** Gate the layout effect on inputs that can change truncation: pass the rendered content / column width as a dep so it only re-measures when the cell content or box could have changed (useLayoutEffect(measure, [content, width])). The ResizeObserver already covers width changes that don't re-render; the per-commit measure is redundant for unchanged cells. Optionally share a single ResizeObserver across cells rather than one per cell.

  ```tsx
  const measure = useCallback(() => {
  		const el = ref.current
  		if (el) setTruncated(isOverflowing(el))
  	}, [])
  	useLayoutEffect(measure)
  ```

#### [2] 🟠 High — Selection Set embedded in the head-facing GridContext re-renders all header cells on every selection toggle

- **Where:** `packages/ui/src/modules/grid/grid-data.tsx`:766-789 · _hot path_
- **Impact:** The context value includes the raw `selection` Set, whose identity changes on every single-row toggle. Every GridHeaderCell calls useGrid() (grid-head.tsx:162), so each selection change invalidates the context and re-renders ALL C header cells (they then bail at memoized GridColumnHeader/GridReorderableColumnHeader children, but the GridHeaderCell wrapper body re-runs columnSort/sizing for every column). The head only needs allSelected/someSelected/toggleAll, never the raw Set. Scales O(columns) on every selection change.
- **Fix:** Split the head-facing context from the per-row selection Set: expose only allSelected/someSelected/toggleAll/sort/toggleSort/pinColumn/stickyHeader to GridHead, and pass the `selection` Set directly to GridBody as a prop (it already is, grid-data.tsx:905). Removing `selection` from the memo deps decouples header re-renders from per-row selection churn.

  ```tsx
  const context = useMemo(
  		() => ({
  			selection,
  			toggleRow,
  			toggleAll,
  			allSelected,
  			someSelected,
  			sort,
  			toggleSort,
  			pinColumn,
  			stickyHeader,
  		}),
  		[
  			selection,
  ```

#### [3] 🟠 High — GridDataCell is not memoized — every visible cell re-renders whenever its row re-renders

- **Where:** `packages/ui/src/modules/grid/grid-row.tsx`:323-369 · _hot path_
- **Impact:** GridRow is memo'd but GridDataCell is a plain function component. When a memoized row DOES re-render (data change, column-def rebuild, pinning/order/visibility change, or any GridData render that shifts the cells array identity), all O(visible_columns) cells in that row re-render and re-run col.cellProps(row), flexRender(cell.getContext()), and resolveCellTooltip(col,row) (which invokes col.cellTooltip(row)) per cell. For a non-virtualized grid that is O(rows x columns) per re-render. Memoizing the cell would let unchanged cells bail.
- **Fix:** Wrap GridDataCell in React.memo. Its props (cell, col, row, colIndex, reorderable, truncate, pinning) are stable across renders where the row content is unchanged (cell identity holds via TanStack's stable cellRenderers; col identity holds via useStableColumnDefs/element-wise stabilization). A memo boundary here lets a re-rendered row skip cells whose inputs didn't change.

  ```tsx
  function GridDataCell<T>({
  	cell,
  	col,
  	row,
  	colIndex,
  	reorderable,
  	truncate,
  	pinning,
  }: GridDataCellProps<T>) {
  	const cellExtra = col.cellProps?.(row)
  ```

#### [4] 🟠 High — Editable rowIndexMap rebuild on every commit cascades to augmentedColumns rebuild and re-renders all rendered rows

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-rows.ts`:33-41 · _hot path_
- **Impact:** The editable grid is controlled: the consumer hands back a fresh `rows` array after every onValueChange. Each commit rebuilds this O(N) Map, and because useGridEditableAugmentedColumns memo depends on rowIndexMap (use-grid-editable-augmented-columns.tsx:140), every column's cell/cellProps closures are recreated. New cell identities feed useStableColumnDefs but the augmented column objects are new, so visibleColumns and every row's cells array shift identity → all currently-rendered rows re-render on every single-cell edit. Under virtualization that is the window, but the Map rebuild is full-N per edit.
- **Fix:** Key rowIndexMap rebuild on row-identity stability rather than array identity (e.g. rebuild only when length or keys change), or have augmented columns read rowIndexMap through a ref so its memo doesn't depend on the Map identity — mirroring the read-only nav columns pattern (use-grid-navigation-columns.tsx reads rowIndexMapRef.current). That keeps augmentedColumns stable across commits so only the truly-changed cell re-renders.

  ```tsx
  const rowIndexMap = useMemo(() => {
  		const m = new Map<T, number>()
  		rows.forEach((r, i) => {
  			m.set(r, i)
  		})
  		return m
  	}, [rows])
  ```

#### [5] 🟠 High — renderRows reallocated every render invalidates rowKeys/rowIndexMap/colIndexMap and the body row list

- **Where:** `packages/ui/src/modules/grid/use-grid-table.ts`:386-389 · _hot path_
- **Impact:** Whenever pagination or any client transform (client filter/sort) is active, renderRows is a brand-new array every GridData render. It is the dep of rowKeys (grid-data.tsx:705), rowIndexMap (grid-data.tsx:716, O(rows) Map build), and is the rows prop to GridBody. So every render — including each keystroke in search and each cursor-driven parent render — rebuilds those memos and the body's row list even when the underlying rows are unchanged. With large pages this is repeated O(rows) allocation plus cascading memo busts. The map walks the full page even under virtualization.
- **Fix:** Memoize renderRows on the structural inputs that actually change it. TanStack's getRowModel() is itself memoized, so cache the .map(original) result keyed on table.getRowModel().rows (reference-stable until the model recomputes): useMemo(() => model.rows.map(r => r.original), [model.rows]). That preserves array identity across unrelated renders and stops the rowKeys/rowIndexMap cascade.

  ```tsx
  const renderRows =
  		paginated || clientTransform
  			? table.getRowModel().rows.map((modelRow) => modelRow.original)
  			: rows
  ```

#### [6] 🟡 Medium — batchActions toolbar re-invokes the consumer builder and re-renders on every parent render while a selection exists

- **Where:** `packages/ui/src/modules/grid/grid-data.tsx`:958-960 · _not hot path_
- **Impact:** batchActions({ selection, setSelection }) is called inline in JSX, so the consumer's toolbar tree is rebuilt on EVERY GridData render whenever any rows are selected — not just when the selection changes. Typing in search, cursor moves, resize drags, and pagination all re-run the builder and re-render the entire toolbar subtree. For a rich batch-actions bar this is unnecessary work on every interaction while a selection is held.
- **Fix:** Memoize the toolbar content on its real inputs: const batchBar = useMemo(() => batchActions?.({ selection, setSelection }), [batchActions, selection, setSelection]); render {someSelected && batchBar}. setSelection is already stable, so this rebuilds only when the selection Set changes.

  ```tsx
  {batchActions && someSelected && (
  					<Toolbar aria-label="Batch actions">{batchActions({ selection, setSelection })}</Toolbar>
  				)}
  ```

#### [7] 🟡 Medium — Editable cell() re-runs formatCell per windowed cell on every grid re-render

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-augmented-columns.tsx`:120-137 · _hot path_
- **Impact:** The augmented cell renderer calls formatCell(row, col) for every windowed cell on every render of GridData/the body — not memoized per cell. formatCell invokes the column's user-supplied format(row) callback (use-grid-editable-rows.ts:43-51). For columns with a non-trivial formatter (date/number formatting, lookups), this re-runs the formatter for every visible cell on each navigation-driven body re-render or commit, scaling with windowed-cells x format cost. GridEditableCell itself bails via its slice cache, but the formatted string is recomputed before that.
- **Fix:** Either memoize the formatted value (cache per row+col keyed on the row identity and the column's format identity) or pass row+column into GridEditableCell and compute `formatted` inside a useMemo there so it recomputes only when the row datum or column changes, not on every parent render.

  ```tsx
  cell: (row: T) => {
  					const rowIdx = rowIndexMap.get(row) ?? -1
  					const formatted = formatCell(row, col)
  					return (
  						<GridEditableCell
  ```

#### [8] 🟡 Medium — GridHeaderCell is not memoized and reads useGrid(), so it re-runs per column on every selection/sort/context change

- **Where:** `packages/ui/src/modules/grid/grid-head.tsx`:151-163 · _not hot path_
- **Impact:** GridHeaderCell is a plain (non-memo) router that consumes useGrid(). Because the context value changes on every selection toggle and sort change (see the context finding), all C header cells re-run their bodies — resolving columnSort(sort, id) (a findIndex over the sort list), sizing reads (resize.getSize/isResizing), and showsFilterButton — before delegating to the memoized GridColumnHeader. The delegated child bails when its props are unchanged, but the per-column router work is O(columns) on every selection/sort/pin change.
- **Fix:** After splitting selection out of the context (see that finding), most of these re-renders disappear. Additionally, derive the per-column sort/sizing in GridHead once (sort is shared) and pass results down, or memoize GridHeaderCell so an unchanged column's router doesn't re-run when an unrelated context field changes.

  ```tsx
  function GridHeaderCell<T>({
  	column,
  	colIndex,
  	hasRows,
  	interactive,
  	selectAllLabel,
  	reorderable,
  	resize,
  	filters,
  	pinning,
  }: GridHeaderCellProps<T>) {
  	const { allSelected, someSelected, toggleAll, sort, toggleSort, pinColumn, stickyHeader } =
  		useGrid()
  ```

#### [9] 🟡 Medium — Filter button JSON.stringifies faceted values and recomputes uniqueValues on every header render, even closed

- **Where:** `packages/ui/src/modules/grid/grid-column-filter-button.tsx`:75-82 · _not hot path_
- **Impact:** For each select-filterable header, every render of the (memoized) header cell still re-runs filter.uniqueValues(column.id) — which spreads the faceted Map, filters, maps to String, dedupes via Set, and localeCompare-sorts (grid-table-views.ts:260-270) — then JSON.stringify over the full distinct-value array to derive a memo key. For high-cardinality select columns this is O(distinct values · log) plus an O(distinct) stringify on every filter-button render, including while the sheet is closed and when the header re-renders for unrelated reasons.
- **Fix:** Only compute facetValues when the sheet is open (gate on `open`), or memoize uniqueValues at the engine view layer keyed on the faceted row model so repeated header renders reuse it. Replace the JSON.stringify memo key with the array reference from a memoized uniqueValues (stable until facets change), avoiding the per-render serialize.

  ```tsx
  const facetValues =
  		column.filterType === 'select' && !column.filterOptions
  			? filter.uniqueValues(column.id)
  			: undefined
  	const facetKey = JSON.stringify(facetValues ?? null)
  ```

#### [10] 🟡 Medium — allSelected/someSelected scan all rowKeys on every Grid render (unmemoized)

- **Where:** `packages/ui/src/modules/grid/use-grid-selection.ts`:59-61 · _not hot path_
- **Impact:** Both flags recompute O(rowKeys) on every GridData render — not just on selection or data change. Since GridData re-renders on search keystrokes, cursor-driven parent renders, resize drags, and pagination, this repeats a full scan of the page's keys each time. someSelected additionally gates the batch-actions toolbar (grid-data.tsx:958), and both flow into the context value. For large page sizes with frequent re-renders this is repeated O(rows) work.
- **Fix:** Memoize on [rowKeys, selection]: useMemo(() => ({ allSelected: ..., someSelected: ... }), [rowKeys, selection]). Both deps only change on data or selection edits, so unrelated re-renders skip the scan.

  ```tsx
  const allSelected = rowKeys.length > 0 && rowKeys.every((rk) => selection.has(rk))
  	const someSelected = rowKeys.some((rk) => selection.has(rk))
  ```

#### [11] 🟡 Medium — History priorValue does rows.findIndex per change — O(N·K), O(N²) on select-all+type

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-history.ts`:56-71 · _hot path_
- **Impact:** emit() maps priorValue over every change in a batch (line 77), and priorValue runs a full rows.findIndex per change. A column-fill across a multi-row selection or a matrix paste emits K changes, each scanning all N rows: O(N·K). For 'select all + type' (K≈N) this is O(N²) per commit, compounding with applyCellWrite's own currentRows.forEach fan-out (use-grid-editable-mutations.ts:92-96). No rowKey→index map is reused even though rowIndexMap/getKey already exist.
- **Fix:** Build a rowKey→index Map once per emit (or reuse the existing rowIndexMap by key) and look up each change's index in O(1), turning the batch from O(N·K) into O(N+K). The same key map can serve the mutations fan-out.

  ```tsx
  const index = rows.findIndex((row, i) => getKey(row, i) === change.rowKey)
  			const value = index >= 0 ? rows[index]?.[field] : undefined
  ```

### Context value stability & prop-drilling cascades
*2 candidates — 🟠 1 · ⚪ 1*

#### [12] 🟠 High — GridContext value embeds the volatile selection Set, but its only consumer (every header cell) reads only stable booleans — so every selection toggle re-renders all header cells

- **Where:** `packages/ui/src/modules/grid/grid-data.tsx`:766-789 · _hot path_ · _single context mixing volatile + stable state_
- **Impact:** selection is replaced with a new Set on every toggle (use-grid-selection.ts:69 toggleItem; toggleAll allocates new Set(keys)), so the memoized `context` identity changes on every selection mutation. The single in-module consumer is GridHeaderCell (grid-head.tsx:162-163 `useGrid()`), which is NOT memoized and is rendered once per visible column (grid-head.tsx:85-99). React re-renders every context consumer when the provider value identity changes regardless of which fields it reads — and GridHeaderCell only reads allSelected/someSelected/toggleAll/sort/toggleSort/pinColumn/stickyHeader, never `selection`. allSelected/someSelected (booleans) usually don't flip on a single-row toggle, yet all N header-cell bodies still re-execute (each runs columnSort()'s findIndex over the sort array plus live resize.getSize()/pinning reads). With hundreds of columns, every checkbox click re-runs N header-cell bodies for no semantic change; toggleAll on a large selection compounds it. Blast radius is bounded only because the GridColumnHeader/GridReorderableColumnHeader children are memo'd and their `shared` props stay referentially equal, so they bail — but the per-column GridHeaderCell re-execution is pure waste.
- **Fix:** Remove `selection` from the head-facing context — the head needs only allSelected/someSelected/toggleAll (for the select-all checkbox), which already live in the value. Drop `selection` from both the object and the deps array so the context identity is stable across row toggles (it then only changes on the boolean boundary flips and on sort/pin, which is correct). The raw Set is already passed to the body via the `selection` prop (grid-data.tsx:905) and to batchActions directly (grid-data.tsx:959), so no consumer loses access. This decouples header re-renders from per-row selection churn.

  ```tsx
  const context = useMemo(
      () => ({
        selection,
        toggleRow,
        toggleAll,
        allSelected,
        someSelected,
        sort,
        toggleSort,
        pinColumn,
        stickyHeader,
      }),
      [selection, toggleRow, toggleAll, allSelected, someSelected, sort, toggleSort, pinColumn, stickyHeader])
  ```

#### [13] ⚪ Low — GridData child element gets a fresh `selection` config object literal every render of GridEditable

- **Where:** `packages/ui/src/modules/grid/grid-editable.tsx`:227 · _not hot path_ · _prop drilling that defeats memoization_
- **Impact:** Every keystroke in the editor re-renders GridEditable (draft state in use-grid-editable-draft.ts:110), which re-creates this object literal and passes it into <GridData>. GridData is not memoized so this is harmless today (GridData re-renders anyway), but the fresh object means GridData can never be memo-wrapped to bail on per-keystroke parent renders: the `selection` prop identity changes every render even when selection is unchanged. It also flows into useGridSelectionState->useControllable, which only reads `.value`/`.onValueChange` fields so the wrapper identity itself is inert there. The latent cost is that it forecloses the obvious optimization (memo(GridData)) that would otherwise let the entire read-only subtree bail during editor typing.
- **Fix:** Hoist the merged selection config into a useMemo keyed on [selectionConfig, selection, setSelection] (setSelection is already stable from useControllable, useControllable.ts:46-61), so the object identity only changes when selection actually changes. This is a prerequisite for wrapping GridData in memo() to short-circuit per-keystroke re-renders of the whole grid body.

  ```tsx
  selection={{ ...selectionConfig, value: selection, onValueChange: setSelection }}
  ```

### Expensive derivations on hot paths
*12 candidates — 🔴 1 · 🟠 6 · 🟡 5*

#### [14] 🔴 Critical — useLayoutEffect(measure) with no dependency array forces a synchronous layout read on every visible cell each commit

- **Where:** `packages/ui/src/modules/grid/use-grid-truncation.ts`:76, 34-46 · _hot path_ · _truncation measurement_
- **Impact:** Mounted once per truncated data cell AND per header title (grid-cell-content.tsx:39, grid-head.tsx:339). The dep-less layout effect re-runs isOverflowing() after EVERY commit of EVERY mounted cell, and the sub-pixel path constructs a document.createRange() + calls getBoundingClientRect() twice, forcing synchronous reflow. With V visible cells this is V forced reflows per grid re-render — so a search keystroke or resize drag (continuous re-renders) triggers a full layout pass across the whole window x columns. This is the dominant per-cell, per-scroll, per-rerender cost.
- **Fix:** Gate measurement: only measure when content/width actually changed. Drop the unconditional useLayoutEffect; rely on the ResizeObserver (already present) plus a content-keyed effect (depend on `content`/a serialized cell value). Batch reads with a shared Intersection/ResizeObserver pool or measure lazily on hover (the flag only gates a tooltip), and skip the createRange path unless scrollWidth==clientWidth.

  ```tsx
  useLayoutEffect(measure)  // measure -> isOverflowing: range.getBoundingClientRect().width - el.getBoundingClientRect().width
  ```

#### [15] 🟠 High — One ResizeObserver installed per visible data cell and per header title, recreated on every virtualized scroll

- **Where:** `packages/ui/src/modules/grid/use-grid-truncation.ts`:78-92 · _hot path_ · _truncation measurement_
- **Impact:** A wide grid with truncation registers hundreds of ResizeObservers simultaneously. Each newly-windowed row on virtualized scroll mounts a fresh observer + runs its initial measure (more reflows); recycled rows tear theirs down. On any column-width or density change all observers fire measure() at once = a synchronized reflow storm across every observed cell. Observer churn scales with window-size x columns on every scroll.
- **Fix:** Replace per-cell observers with a single shared ResizeObserver (or one per table) that fans out to registered cells, or observe only the table/colgroup and re-measure cells from a column-width delta. Throttle the callback to a rAF.

  ```tsx
  const observer = new ResizeObserver(measure)
  
  observer.observe(el)
  ```

#### [16] 🟠 High — compareSmart/parseNumeric runs 3 regex replaces + a regex test per operand on every comparison during client sort

- **Where:** `packages/ui/src/modules/grid/grid-sorting-utilities.ts`:45, 99-114 · _hot path_ · _sorting_
- **Impact:** smartSortingFn is the default sortingFn for every data column (grid-table-options.ts:124-125). Each compareSmart call invokes parseNumeric on BOTH operands; a sort of N rows is O(N log N) comparisons, each doing up to 6 regex passes + 2 DECIMAL.test + a localeCompare fallback, with no per-value memoization. On large client-side datasets a single column sort runs millions of regex operations and visibly stalls.
- **Fix:** Precompute a sort key per row/column once before sorting (decorate-sort-undecorate): map each cell value to {num|null, str} once (O(N)), then compare the precomputed keys (O(N log N) cheap comparisons). Cache parseNumeric results keyed by value where columns repeat values.

  ```tsx
  const cleaned = body.replace(CURRENCY, '').replace(NUMERIC_NOISE, '').replace(/%$/, '')
  
  if (!DECIMAL.test(cleaned)) return null
  ```

#### [17] 🟠 High — history.priorValue does rows.findIndex per change in a batch — O(N·K), O(N^2) on select-all + type

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-history.ts`:64, 77 · _hot path_ · _view/option construction_
- **Impact:** emit() maps priorValue over every change in the batch (line 77). A column-fill across a multi-row selection or matrix paste emits K changes, each linearly scanning the full rows array: O(N·K). For 'select all + type' K≈N so it is O(N^2). The editable layer already builds a rowIndexMap (use-grid-editable-rows.ts:33) and exposes getKey, but neither is reused here.
- **Fix:** Build a rowKey->index Map once per emit (or reuse the existing rowIndexMap by deriving key->index), then look up each change in O(1). Reduces the batch from O(N·K) to O(N + K).

  ```tsx
  const index = rows.findIndex((row, i) => getKey(row, i) === change.rowKey)
  ```

#### [18] 🟠 High — applyCellWrite fans a single-cell edit across ALL rows when the row is in a multi-row selection

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-mutations.ts`:92-96 · _hot path_ · _view/option construction_
- **Impact:** On Enter in a cell that is part of a selection of size>1, it walks the entire rows array calling getKey per row to collect the column-fill changes. Combined with history's per-change findIndex above, a single Enter on a 10k-row select-all is O(N) here then O(N^2) in history — the whole commit is O(N^2).
- **Fix:** Iterate only the selection Set (already keyed) instead of all rows: for each selected key, resolve its index via a key->index map and push one change. O(selected) instead of O(N).

  ```tsx
  currentRows.forEach((r, i) => {
    const rk = getKey(r, i)
    if (sel.has(rk)) changes.push({ rowKey: rk, columnId: col.id, value })
  })
  ```

#### [19] 🟠 High — rowIndexMap rebuilds an O(N) Map over all rows on every committed edit, busting all augmented column cell renderers

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-rows.ts`:33-41 · _hot path_ · _view/option construction_
- **Impact:** The editable grid is controlled, so the consumer hands back a fresh rows array after every onValueChange. Each commit rebuilds the full-N Map, and because useGridEditableAugmentedColumns depends on rowIndexMap (use-grid-editable-augmented-columns.tsx:140), every column's cell/cellProps closures are reallocated, invalidating every rendered row's cells array. So each keystroke-committed edit pays O(N) Map build + full re-render of the visible window.
- **Fix:** Key the augmented-columns memo on a stable rowIndexMap accessor (a ref to the Map) rather than the Map identity, so column renderers don't reallocate on every commit. Reuse getKey-based O(1) lookup instead of an object-identity Map (which also breaks when rows are recreated). Defer/throttle the Map rebuild.

  ```tsx
  const rowIndexMap = useMemo(() => {
    const m = new Map<T, number>()
    rows.forEach((r, i) => { m.set(r, i) })
    return m
  }, [rows])
  ```

#### [20] 🟠 High — renderRows reallocates an array over the full page/filtered set every render, cascading memo busts even under virtualization

- **Where:** `packages/ui/src/modules/grid/use-grid-table.ts`:386-389 · _hot path_ · _view/option construction_
- **Impact:** When paginated or any client transform is active, this maps the full row model into a brand-new array every GridData render. Because the reference is new each render, downstream memos keyed on renderRows — rowKeys (grid-data.tsx:705), rowIndexMap (grid-data.tsx:716), colIndexMap deps, body row list — all invalidate every render even when rows are unchanged. Under virtualization the body only renders a window, but this map still walks the entire page on every render (typing in search, cursor moves that bubble a parent render).
- **Fix:** Memoize renderRows on [table.getRowModel().rows] (the model array identity is stable until inputs change in TanStack), or map lazily. Better: drive the body off the row model rows directly and read .original at the windowed boundary so only the visible slice is materialized.

  ```tsx
  const renderRows =
    paginated || clientTransform
      ? table.getRowModel().rows.map((modelRow) => modelRow.original)
      : rows
  ```

#### [21] 🟡 Medium — rowIndexMap/rowKeys rebuilt over ALL rows every renderRows identity change, even when virtualized

- **Where:** `packages/ui/src/modules/grid/grid-data.tsx`:705-708, 716-719 · _hot path_ · _view/option construction_
- **Impact:** Because renderRows is a fresh array on every render (finding above), these O(N) Map/array builds run on every data/sort/filter/page change and on every render in the paginated/client-transform path, walking the full page rather than the virtualized window. Feeds navigation index lookups that only need the windowed cells.
- **Fix:** Stabilize renderRows first (see above) so these memos hold; or build rowIndexMap lazily/by getKey and only for rows in the active window. Key on a content signature rather than array identity.

  ```tsx
  const rowIndexMap = useMemo(
    () => new Map(renderRows.map((row, i) => [row, i] as const)),
    [renderRows],
  )
  ```

#### [22] 🟡 Medium — buildPaginationView reads getPrePaginationRowModel().rows.length every render (pagination view is unmemoized)

- **Where:** `packages/ui/src/modules/grid/grid-table-views.ts`:287-289 · _not hot path_ · _view/option construction_
- **Impact:** The pagination view is intentionally not memoized (use-grid-table.ts:391-403) and is rebuilt on every GridData render, each time touching the pre-pagination (full filtered) row model and reading its length. This ties the footer's cost to the filtered-set size and keeps that model materialized; combined with fresh setPageIndex/setPageSize closures (lines 301-302) every render. Cheap per-call but unconditional on a very hot component.
- **Fix:** Memoize the pagination view on the inputs that actually change it (pagination state, filtered-row-model version, config). At minimum compute the total length once and reuse renderRows-derived counts rather than re-reading the model each render.

  ```tsx
  const total = args.manual
    ? args.config.rowCount
    : args.table.getPrePaginationRowModel().rows.length
  ```

#### [23] 🟡 Medium — resolveResizeLayout rebuilds the <colgroup> with a live engine getSize() per visible column every render

- **Where:** `packages/ui/src/modules/grid/grid-data.tsx`:448-458 · _hot path_ · _view/option construction_
- **Impact:** Runs every GridData render when resizable: one getSize() (table.getColumn(...).getSize()) per visible column plus a totalSize() and isResizingAny() live engine read. During an active drag-resize columnResizeMode:'onChange' re-renders GridData continuously, so this O(columns) engine-read colgroup rebuild compounds with the per-cell truncation re-measure on each frame. Scales with column count on every resize frame.
- **Fix:** Memoize the colgroup on the column-sizing state version (or the visibleColumns + a sizing signature) so it only rebuilds when widths change, not on every parent render. Read sizes from the columnSizing state object rather than per-column engine getters.

  ```tsx
  {args.columns.map((col) => (
    <col key={col.id} style={{ width: resize.getSize(col.id) }} />
  ))}
  ...
  tableWidth: resize.totalSize(),
  ```

#### [24] 🟡 Medium — uniqueValues + JSON.stringify(facetValues) recompute on every filter-button render, even when the sheet is closed

- **Where:** `packages/ui/src/modules/grid/grid-column-filter-button.tsx`:75-82 · _not hot path_ · _filtering/faceting_
- **Impact:** For each select-filterable header, uniqueValues (grid-table-views.ts:260-270) spreads the faceted Map keys, filters, maps to String, dedupes via a new Set, then localeCompare-sorts — O(distinct values · log) — and JSON.stringify serializes the full array — O(distinct values) — both on every render of the button, not just on open. High-cardinality columns pay this whenever the header re-renders (e.g. selection/sort churn bubbling a parent render). Multiplied across many filterable columns.
- **Fix:** Compute uniqueValues lazily only when the filter sheet opens (gate on open state). Derive the memo key from the faceted Map's reference/version rather than stringifying the array. Memoize uniqueValues per column id keyed on the faceted-model version.

  ```tsx
  const facetValues = ... filter.uniqueValues(column.id) : undefined
  const facetKey = JSON.stringify(facetValues ?? null)
  ```

#### [25] 🟡 Medium — augmented cell() runs formatCell(row,col) per windowed cell on every grid re-render with no per-cell memo

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-augmented-columns.tsx`:120-137 · _hot path_ · _view/option construction_
- **Impact:** The cell render fn calls formatCell(row,col) — which invokes a column's user format() callback (use-grid-editable-rows.ts:43-51) — on every render of every windowed cell. For columns with a non-trivial formatter this re-runs per cell on each navigation-driven or commit-driven body re-render, scaling with windowed-cells x format cost. Also does a Map.get per cell.
- **Fix:** Memoize formatted per (row, col) — e.g. cache by row identity + column id, or compute formatted inside GridEditableCell with React.memo gated on row/format inputs so navigation re-renders that don't change content skip the formatter.

  ```tsx
  cell: (row: T) => {
    const rowIdx = rowIndexMap.get(row) ?? -1
    const formatted = formatCell(row, col)
    return (<GridEditableCell ... formatted={formatted} ...
  ```

### State management & memory
*9 candidates — 🟠 4 · 🟡 4 · ⚪ 1*

#### [26] 🟠 High — Undo/redo history grows unbounded — push-only stacks retain every committed change forever

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-history.ts`:46-48, 77 · _not hot path_ · _unbounded-growth_
- **Impact:** There is no cap, eviction, or slice on undoStack. Every commit pushes a HistoryEntry holding both the forward and inverse CellChange[] (each CellChange carries `value: unknown` — for object/rich-cell columns these are full retained references, not primitives). A long editing session (or repeated select-all + type, where each entry is itself O(N) changes) accumulates entries indefinitely; the stacks pin the captured prior values in memory for the lifetime of the GridEditable mount, defeating GC even as the consumer replaces the rows array. A bulk-fill over a 10k-row selection stores a 10k-element inverse array per Enter, and 50 such edits retain ~500k CellChange objects.
- **Fix:** Cap the undo stack (e.g. ring buffer of N entries, or a total-change budget); when pushing past the limit, shift() the oldest entry. Also clear both stacks on unmount and when the consumer signals a hard data reset, so stale prior-value references are released.

  ```tsx
  const undoStack = useRef<HistoryEntry[]>([])
  const redoStack = useRef<HistoryEntry[]>([])
  ...
  undoStack.current.push({ forward: changes, inverse: changes.map(priorValue) })
  ```

#### [27] 🟠 High — History inverse capture is O(N·K) per commit (findIndex + editableCols.find per change), O(N²) on select-all writes

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-history.ts`:58, 64, 77 · _hot path_ · _quadratic-scan_
- **Impact:** `emit` calls `changes.map(priorValue)`, and priorValue runs a full `rows.findIndex` (O(N)) AND an `editableCols.find` (O(columns)) for EACH of the K changes in the batch. A column-fill across a multi-row selection or a matrix paste emits K changes, each rescanning the entire rows array: O(N·K). For 'select all + type' K≈N, giving O(N²) — on a 10k-row grid a single Enter scans ~100M row comparisons synchronously, freezing the UI. A rowKey→index Map and a columnId→col Map already exist conceptually (getKey is available, rowIndexMap is built in use-grid-editable-rows) but are not reused here.
- **Fix:** Build a rowKey→index Map and a columnId→col Map once per emit call (O(N+columns)) and look up by key inside priorValue, reducing the batch capture to O(N+K). Reuse the existing rowIndexMap/getKey rather than re-scanning per change.

  ```tsx
  const col = editableCols.find((candidate) => candidate.id === change.columnId)
  ...
  const index = rows.findIndex((row, i) => getKey(row, i) === change.rowKey)
  ...
  undoStack.current.push({ forward: changes, inverse: changes.map(priorValue) })
  ```

#### [28] 🟠 High — applyCellWrite fan-out walks all rows; compounds with history findIndex into O(N²) on a single Enter inside a large selection

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-mutations.ts`:92-96 · _hot path_ · _quadratic-scan_
- **Impact:** When the active row is part of a multi-row selection, a single-cell commit fans out by iterating ALL currentRows (O(N), calling getKey per row) to build one change per selected row. That batch then flows into history.emit, where each emitted change triggers another O(N) findIndex (finding #2). A single Enter on a 10k-row select-all therefore does O(N) to build the batch plus O(N²) in history — the dominant cost of bulk editing.
- **Fix:** Iterate the selection Set directly (it already holds the selected rowKeys) instead of scanning all rows; pair with a rowKey→row/index Map so the fan-out is O(selected) not O(rows). This also fixes the downstream history quadratic once priorValue uses a Map.

  ```tsx
  if (inSel) {
  	currentRows.forEach((r, i) => {
  		const rk = getKey(r, i)
  		if (sel.has(rk)) changes.push({ rowKey: rk, columnId: col.id, value })
  	})
  }
  ```

#### [29] 🟠 High — Every commit rebuilds rowIndexMap O(N) and invalidates the augmented-columns memo, re-rendering all windowed rows

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-rows.ts`:33-41 · _hot path_ · _wide-rerender_
- **Impact:** The editable grid is controlled: the consumer hands back a fresh `rows` array after every onValueChange. That new identity rebuilds the O(N) rowIndexMap on every commit, and because useGridEditableAugmentedColumns depends on rowIndexMap (use-grid-editable-augmented-columns.tsx:140), every column's `cell`/`cellProps` closures are reallocated, busting the cells arrays so all currently-rendered rows re-render. The map is keyed by row object identity, so it cannot survive an immutable rows replacement even when only one row changed. Per-edit cost is full-N map build + full window re-render.
- **Fix:** Key the index map by stable rowKey (getKey) rather than object identity so it can be reused/patched across rows replacements, or maintain it incrementally. Decouple augmented-columns from rowIndexMap identity by reading the map through a ref inside the cell/cellProps closures (the same ref pattern already used for active/editing), so a rows change does not reallocate every column's render functions.

  ```tsx
  const rowIndexMap = useMemo(() => {
  	const m = new Map<T, number>()
  	rows.forEach((r, i) => {
  		m.set(r, i)
  	})
  	return m
  }, [rows])
  ```

#### [30] 🟡 Medium — The `editing` flag lives in the per-cell store snapshot, so toggling edit mode notifies and re-runs the selector for every subscribed cell

- **Where:** `packages/ui/src/modules/grid/grid-editable.tsx`:182-190 · _hot path_ · _wide-rerender_
- **Impact:** `editing` is part of cellSnapshot, so beginEdit/commitEdit (which flip editing true→false) produce a new snapshot and the store's layout effect notifies ALL subscribers (grid-editable-store.ts:36). Every windowed cell's `select()` then re-runs its rectangle math + cellKey alloc + extraCells.has lookup (grid-editable-context.ts:70-97). The content-cache bails the React re-render for cells whose slice didn't flip, but the selector body still executes per cell per edit-toggle — O(windowed cells × (string alloc + Set lookup)) on every edit begin and end. With a large extraCells set this multiplies.
- **Fix:** Only the active cell's showEditor depends on `editing`; keep `editing` out of the broadcast snapshot and feed it to the single active cell through the existing GridEditableEditContext (or gate showEditor on isActive before consulting editing). That confines edit-toggle work to one cell instead of the whole window.

  ```tsx
  const cellSnapshot = useMemo<GridEditableSnapshot>(
  	() => ({
  		active: nav.active,
  		anchor: nav.anchor,
  		extraCells: nav.extraCells,
  		editing: draft.editing,
  	}),
  	[nav.active, nav.anchor, nav.extraCells, draft.editing],
  ```

#### [31] 🟡 Medium — extraCells (ctrl-click selection) accumulates without bound and is cloned on every add/move

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-navigation.ts`:96-116 · _not hot path_ · _unbounded-growth_
- **Impact:** Each Ctrl-click bakes the prior rectangle into a freshly-cloned `extraCells` Set. A user ctrl-dragging multiple large rectangles grows the Set to O(total selected cells), each entry a heap-allocated 'row,col' string; the whole Set is shallow-cloned (`new Set(extraCellsRef.current)`) on every subsequent add. Because extraCells is in cellSnapshot, each add also notifies every subscribed cell, whose selector does extraCells.has(cellKey(...)) (allocating a new string per cell per notification). Selecting a whole 10k-row column then ctrl-clicking elsewhere bakes 10k string keys, cloned and re-scanned on the next interaction.
- **Fix:** Represent baked selection as a list of rectangles (anchor/active pairs) instead of an exploded per-cell Set, testing membership by range containment; this is O(rectangles) memory and O(rectangles) per-cell membership test rather than O(cells). At minimum, cap the baked set size and avoid the full clone by mutating a ref-held set with a versioned notify.

  ```tsx
  const baked = new Set(extraCellsRef.current)
  const prevActive = activeRef.current
  const prevAnchor = anchorRef.current
  if (prevActive) baked.add(cellKey(prevActive.row, prevActive.col))
  if (prevActive && prevAnchor) {
  	forEachInRect(prevAnchor, prevActive, (r, c) => baked.add(cellKey(r, c)))
  }
  ```

#### [32] 🟡 Medium — collectFillCoords materializes the entire selection rectangle as Coord objects + dedupe Set before any write

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-mutations.ts`:20-46 · _hot path_ · _large-allocation_
- **Impact:** A bulk fill over an anchored rectangle (e.g. whole-column drag-select on 10k rows) allocates O(area) Coord objects plus an O(area) dedupe Set of 'row,col' strings up front, before writing. Each coord then becomes a CellChange (another O(area) array), each of which is later findIndex'd by history (finding #2) — so the up-front materialization compounds into the O(N²) history cost. Peak memory during the fill is several full-area allocations simultaneously.
- **Fix:** Stream the fill: iterate the rectangle and emit changes directly (dedupe only the small extras Set against the rectangle bounds via inRect, not a full per-cell Set). Combined with the Map-based history fix this removes the up-front area materialization and the quadratic.

  ```tsx
  const seen = new Set<string>()
  const coords: Coord[] = []
  const push = (row: number, col: number) => {
  	const key = `${row},${col}`
  	if (seen.has(key)) return
  	seen.add(key)
  	coords.push({ row, col })
  }
  ...
  if (anchor) forEachInRect(anchor, active, push)
  ```

#### [33] 🟡 Medium — formatCell runs per windowed cell on every grid re-render, re-invoking each column's format callback

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-augmented-columns.tsx`:120-137 · _hot path_ · _per-cell-recompute_
- **Impact:** The augmented `cell(row)` runs `formatCell(row, col)` for every windowed cell on every render that reaches the body (e.g. each commit, which busts the cells arrays via finding #4, and any GridData re-render). For columns with a non-trivial `format` callback (currency/date formatting, derived strings) this re-runs the formatter per cell per render with no per-cell/per-value memoization, scaling with windowed-cells × format cost. Because it is not memoized, it cannot be skipped even when neither the row nor the column changed.
- **Fix:** Memoize formatted values by (rowKey, columnId) or only recompute when the underlying field changes; alternatively move formatting into GridEditableCell and let its memo/content-cache skip it. Stabilizing the cell closures (finding #4) is a prerequisite so the formatter isn't re-bound every commit.

  ```tsx
  cell: (row: T) => {
  	const rowIdx = rowIndexMap.get(row) ?? -1
  	const formatted = formatCell(row, col)
  	return (
  		<GridEditableCell ... formatted={formatted} ... />
  ```

#### [34] ⚪ Low — Each cell mounts two imperative DOM-write effects (aria-selected + flash) that run on the per-cell store-driven re-render path

- **Where:** `packages/ui/src/modules/grid/grid-editable-cell.tsx`:58-64, 73-75 · _not hot path_ · _per-cell-effect_
- **Impact:** Every GridEditableCell runs a `closest('[role=gridcell]')` DOM walk + setAttribute whenever its `selected` slice flips, and a flash effect that calls setState (setFlashKey) whenever `formatted` changes. On a range select/deselect that flips many cells' inRange, this fires a closest()+setAttribute for each affected windowed cell; on a bulk commit it triggers a flash setState (extra render) per changed windowed cell. Bounded by window size, but adds a second render pass and a DOM query per affected cell on top of the slice re-render.
- **Fix:** Derive aria-selected from a data-attribute that Grid already controls, or fold it into the cell's className/data-* rendered output so no imperative closest() walk is needed; gate the flash so it doesn't schedule an extra render for every cell during large bulk fills (e.g. skip flashing when many cells change at once).

  ```tsx
  useEffect(() => {
  	if (prevFormattedRef.current === formatted) return
  	prevFormattedRef.current = formatted
  	setFlashKey((n) => n + 1)
  }, [formatted])
  ...
  useEffect(() => {
  	cellRef.current?.closest('[role="gridcell"]')?.setAttribute('aria-selected', String(selected))
  }, [selected])
  ```

### Algorithmic & data-structure efficiency
*10 candidates — 🔴 1 · 🟠 3 · 🟡 5 · ⚪ 1*

#### [35] 🔴 Critical — History priorValue does rows.findIndex + editableCols.find per change → O(N·K), O(N²) on select-all fill

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-history.ts`:58,64,77 · _hot path_ · _per-commit / bulk-write_
- **Impact:** emit runs priorValue for every change in a batch. Each priorValue linearly scans both editableCols (O(cols)) and the full rows array (O(N)). A column-fill across a multi-row selection or a matrix paste emits K changes → O(N·K) plus O(cols·K). For 'select-all + type' (K≈N) this is O(N²) — a single Enter on a 10k-row selection scans 10k rows 10k times.
- **Fix:** Build the lookups once per emit batch before mapping: a Map<rowKey, index> (or Map<rowKey, T>) from a single rows pass, and a Map<columnId, col> from editableCols. priorValue then does two O(1) Map.get calls. The keying field is the stringified rowKey from getKey, so a single Map<string|number,T> reused across the batch collapses O(N·K) to O(N+K).

  ```tsx
  const col = editableCols.find((candidate) => candidate.id === change.columnId)
  ... const index = rows.findIndex((row, i) => getKey(row, i) === change.rowKey)
  ... undoStack.current.push({ forward: changes, inverse: changes.map(priorValue) })
  ```

#### [36] 🟠 High — applyCellWrite scans all rows to fan out a column-fill on multi-row selection

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-mutations.ts`:91-96 · _hot path_ · _per-commit / bulk-write_
- **Impact:** When the active row is part of a selection of size>1, every committed cell write walks the entire rows array calling getKey per row to find selected rows. Combined with the history findIndex above, one Enter on an N-row select-all produces an O(N) fan-out feeding an O(N²) history pass. The selection Set already holds the keys; iterating rows to rediscover them is redundant.
- **Fix:** Iterate the selection Set directly (for (const rk of sel) changes.push({rowKey: rk, columnId: col.id, value})) instead of scanning all rows. The fill value is uniform, so no per-row read is needed; this drops the fan-out from O(N) to O(selected).

  ```tsx
  if (inSel) {
  	currentRows.forEach((r, i) => {
  		const rk = getKey(r, i)
  		if (sel.has(rk)) changes.push({ rowKey: rk, columnId: col.id, value })
  	})
  }
  ```

#### [37] 🟠 High — getResizeHandler does table.getFlatHeaders().find(...) per header cell → O(columns²) per header render

- **Where:** `packages/ui/src/modules/grid/grid-table-views.ts`:212-216 · _hot path_ · _per-header-cell engine read_
- **Impact:** GridColumnResizeHandle calls resize.getResizeHandler(id) once per resizable header cell (grid-head.tsx:401). Each call materializes the full flat-header list and linearly scans it for the matching id — O(columns) per cell, O(columns²) across the header. With columnResizeMode:'onChange' an active drag re-renders the header continuously, so a wide table (hundreds of columns) pays quadratic work every animation frame of a resize drag.
- **Fix:** Resolve the handler in O(1): use table.getColumn(String(id)) and its header, or build a Map<columnId, header> once from getFlatHeaders() and close over it in buildColumnResize (it already takes the table). Avoid getFlatHeaders().find per cell.

  ```tsx
  getResizeHandler: (id) =>
  	table
  		.getFlatHeaders()
  		.find((header) => header.column.id === String(id))
  		?.getResizeHandler(),
  ```

#### [38] 🟠 High — Editable rowIndexMap rebuilt O(N) on every commit, invalidating all augmented column closures

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-rows.ts`:33-41 · _hot path_ · _per-commit recompute / memo invalidation_
- **Impact:** The editable grid is controlled: the consumer returns a fresh rows array after every onValueChange. Each commit therefore rebuilds an O(N) Map<T,number>, and because useGridEditableAugmentedColumns depends on rowIndexMap (use-grid-editable-augmented-columns.tsx:140), every column's cell/cellProps closures are rebuilt, busting the cells arrays so all windowed rows re-render. The Map rebuild is full-N per edit regardless of virtualization.
- **Fix:** Map is unavoidable for identity→index under controlled rows, but it doesn't need to invalidate the augmented columns. Wrap rowIndexMap in a ref (as use-grid-navigation-columns already does via rowIndexMapRef) and have the augmented cell/cellProps read rowIndexMapRef.current, removing rowIndexMap from the augmented-columns memo deps so a commit no longer rebuilds every column closure.

  ```tsx
  const rowIndexMap = useMemo(() => {
  	const m = new Map<T, number>()
  	rows.forEach((r, i) => {
  		m.set(r, i)
  	})
  	return m
  }, [rows])
  ```

#### [39] 🟡 Medium — allSelected/someSelected scan rowKeys on every Grid render (not memoized)

- **Where:** `packages/ui/src/modules/grid/use-grid-selection.ts`:59-61 · _hot path_ · _per-render selection derivation_
- **Impact:** These run unmemoized on every GridData render. Any frequent re-render driver — typing in the global filter, a cursor move that bubbles a parent render, pagination — repeats two O(rowKeys) scans against the selection Set. someSelected also gates the batch-actions toolbar, so it can't be dropped. On large page sizes this is repeated O(rows) work per keystroke.
- **Fix:** Memoize on [rowKeys, selection]: useMemo(() => rowKeys.every(rk => selection.has(rk)), [rowKeys, selection]). Both flags only change when rowKeys or the selection Set identity changes, so memoization eliminates the per-render scans on unrelated re-renders.

  ```tsx
  const allSelected = rowKeys.length > 0 && rowKeys.every((rk) => selection.has(rk))
  const someSelected = rowKeys.some((rk) => selection.has(rk))
  ```

#### [40] 🟡 Medium — compareSmart/parseNumeric runs 3 regex replaces + a test per operand on every client-sort comparison

- **Where:** `packages/ui/src/modules/grid/grid-sorting-utilities.ts`:45,110-114 · _not hot path_ · _client-sort comparator_
- **Impact:** smartSortingFn calls compareSmart per comparison, and compareSmart calls parseNumeric on BOTH operands; each parse runs three regex .replace passes plus a DECIMAL.test, and the string fallback allocates via String() + locale-aware compare. A client sort of N rows is O(N log N) comparisons, so ~2·N·log N regex passes with zero per-value memoization. On wide/large datasets a single sort is visibly costly.
- **Fix:** Precompute a sort key per cell once before sorting instead of per comparison: TanStack supports a sortingFn that can read a memoized accessor, or precompute parseNumeric(value) once per row into a parallel array keyed by row id and compare the cached numbers/strings. This turns O(N log N) regex work into O(N) parse + O(N log N) cheap numeric/string compares.

  ```tsx
  const cleaned = body.replace(CURRENCY, '').replace(NUMERIC_NOISE, '').replace(/%$/, '')
  if (!DECIMAL.test(cleaned)) return null
  ...
  const numeric = compareNumeric(a, b)
  ...
  return String(a).localeCompare(String(b), undefined, { numeric: true })
  ```

#### [41] 🟡 Medium — Context-menu rowByKey Map rebuilt over all rows on any data change for a menu that may never open

- **Where:** `packages/ui/src/modules/grid/grid-context-menu.tsx`:272-275 · _not hot path_ · _deferred-only data structure built eagerly_
- **Impact:** This allocates an N-entry Map every time rows or rowKeys change (every data/sort/filter/page change), even though the map is only consumed inside the right-click handler. On large pages each unrelated data change pays an O(N) Map build for a context menu the user may never open.
- **Fix:** Defer the Map build to handleContextMenu (build it on right-click, or lazily memoize behind first open). The right-click already has rowKeys/rows in scope, so resolving the clicked row's datum there avoids the per-data-change allocation entirely.

  ```tsx
  const rowByKey = useMemo(
  	() => new Map(rowKeys.map((key, index) => [String(key), rows[index]] as const)),
  	[rowKeys, rows],
  )
  ```

#### [42] 🟡 Medium — uniqueValues + JSON.stringify(facetValues) recompute on every filter-button render, not just on open

- **Where:** `packages/ui/src/modules/grid/grid-column-filter-button.tsx`:75-82 · _not hot path_ · _per-header-render faceting_
- **Impact:** For each select-filterable header, every render calls filter.uniqueValues (grid-table-views.ts:260-270: spread of the faceted Map keys + filter + map(String) + new Set dedupe + localeCompare sort — O(distinct·log distinct)) and then JSON.stringify over the full distinct-value array (O(distinct)) to derive a memo key, even when the filter sheet is closed. High-cardinality columns (thousands of distinct values) pay this on every re-render of the header cell.
- **Fix:** Compute facetValues lazily only when the sheet opens (gate on the open state), and key the memo on the faceted Map's reference/size rather than JSON.stringify of the materialized array. uniqueValues itself should be memoized on the faceted-Map identity so it isn't re-sorted on unrelated header re-renders.

  ```tsx
  const facetValues =
  	column.filterType === 'select' && !column.filterOptions
  		? filter.uniqueValues(column.id)
  		: undefined
  const facetKey = JSON.stringify(facetValues ?? null)
  ```

#### [43] 🟡 Medium — applyBulkFill materializes the whole selection rectangle as Coord objects + dedupe Set before writing

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-mutations.ts`:20-46,120-132 · _not hot path_ · _bulk-fill allocation_
- **Impact:** A whole-column drag-select fill on 10k rows allocates O(area) Coord objects plus an O(area) string-keyed dedupe Set up front, then turns each into a CellChange — each of which is later findIndex'd by history (finding #1). The string-keyed Set is the right structure but the eager full-rectangle materialization compounds the O(N²) history cost on bulk fills.
- **Fix:** For a contiguous rectangle the dedupe Set is unnecessary (the nested loop never repeats a coord); only the extras need dedup against the rectangle. Skip the Set for the rectangle path and emit changes directly from forEachInRect, deduping only the ctrl-clicked extras. Combined with the history Map fix this removes the O(N²) compounding.

  ```tsx
  const seen = new Set<string>()
  const coords: Coord[] = []
  const push = (row, col) => { const key = `${row},${col}`; if (seen.has(key)) return; seen.add(key); coords.push({ row, col }) }
  ...
  if (anchor) forEachInRect(anchor, active, push)
  ```

#### [44] ⚪ Low — Editable cell slice selector allocates a cellKey string per cell on every store notification

- **Where:** `packages/ui/src/modules/grid/grid-editable-context.ts`:77 · _hot path_ · _per-cell store-selector allocation_
- **Impact:** On every navigation move the store notifies all subscribed cells; each cell's select() runs unconditionally (the content-cache bails only the re-render, not the selector body), allocating a fresh `${row},${col}` string via cellKey and doing a Set lookup. With many windowed cells and a large extraCells set, each cursor move does (windowed cells) string allocations. Bounded by the window so it's a minor GC-pressure concern, not a correctness one.
- **Fix:** Short-circuit the extraCells.has check when extraCells.size === 0 (the common case, no ctrl-clicks) to skip the string allocation entirely: `extraCells.size > 0 && extraCells.has(cellKey(rowIdx, colIdx))`. This removes the per-cell string alloc on every plain arrow-key move.

  ```tsx
  const inRange = !isActive && (within || extraCells.has(cellKey(rowIdx, colIdx)))
  ```

### Effects & lifecycle
*6 candidates — 🔴 1 · 🟠 3 · 🟡 2*

#### [45] 🔴 Critical — useGridTruncation re-measures via forced reflow after EVERY commit, with no dependency array

- **Where:** `packages/ui/src/modules/grid/use-grid-truncation.ts`:76 (measure 70-74, isOverflowing 34-46) · _hot path_ · _layout-thrash_
- **Impact:** This hook is mounted per truncated data cell (grid-row.tsx:339 -> GridCellContent) AND per header title (grid-head.tsx:339). The layout effect has no dependency array, so it runs after EVERY commit of EVERY mounted cell. measure() -> isOverflowing() constructs a document.createRange() and calls getBoundingClientRect() twice whenever scrollWidth<=clientWidth, forcing synchronous layout. With N visible cells (window rows x columns) every GridData re-render (typing in search, selection change, resize drag with columnResizeMode 'onChange') triggers N forced reflows interleaved with the React commit. This is the dominant per-render layout cost at scale.
- **Fix:** Gate measurement to inputs that can change overflow: pass content + a width/version signal as deps (useLayoutEffect(measure, [content, columnWidth])), or measure only in the ResizeObserver/font-ready callbacks plus a one-shot mount measure. The setState bail prevents re-render loops but not the reflow; restricting when measure runs removes the per-commit synchronous layout pass.

  ```tsx
  useLayoutEffect(measure)  // no dep array — and isOverflowing: range.getBoundingClientRect().width - el.getBoundingClientRect().width > OVERFLOW_SLACK
  ```

#### [46] 🟠 High — One ResizeObserver per truncation cell, recreated on every virtualized scroll as rows recycle

- **Where:** `packages/ui/src/modules/grid/use-grid-truncation.ts`:78-92 · _hot path_ · _resize-observer-churn_
- **Effect deps:** `[measure]`
- **Impact:** Each mounted truncation cell installs its own ResizeObserver. A wide grid registers hundreds simultaneously (window rows x columns + headers). Under virtualization, every scroll windows new rows in/out, so observers are torn down and reconstructed continuously while scrolling. On any column-width or density change the browser fires all observed-cell callbacks at once, each calling measure() -> more forced reflows (createRange/getBoundingClientRect). This makes truncation the per-scroll and per-resize hot path.
- **Fix:** Replace per-cell observers with a single shared ResizeObserver (or one per column) owned higher up, or observe only the table/container and re-derive overflow from a width map. Failing that, batch the measure callbacks into a requestAnimationFrame so a synchronous burst of N callbacks collapses into one layout read pass.

  ```tsx
  const observer = new ResizeObserver(measure)
  
  observer.observe(el)
  
  return () => observer.disconnect()
  ```

#### [47] 🟠 High — Column-fit ResizeObserver is unthrottled and writes TanStack column-sizing state on every container-resize frame

- **Where:** `packages/ui/src/modules/grid/use-grid-column-fit.ts`:100-104 (applyFit 80-93, fitSizes 26-50) · _hot path_ · _resize-observer-no-throttle_
- **Impact:** On every container-resize callback (which fire many times per frame during a window/panel drag) applyFit recomputes fitSizes — O(columns) with a table.getColumn(...).getSize() read per fixed column — then calls table.setColumnSizing(...). setColumnSizing is React state living in GridData, so each observer tick triggers a full GridData re-render of the head+body+footer subtree. There is no rAF coalescing or throttle, so a smooth container resize produces a storm of O(columns) recomputes plus full grid re-renders, each of which (per finding above) also re-runs every truncation measure.
- **Fix:** Coalesce the observer callback with requestAnimationFrame (cancel the prior frame) so multiple resize ticks within a frame produce a single applyFit; and bail early when the computed sizing equals the current columnSizing to avoid a no-op setColumnSizing that still re-renders.

  ```tsx
  const observer = new ResizeObserver(() => {
    if (!manualRef.current) applyFit()
  })
  
  observer.observe(element)
  ```

#### [48] 🟠 High — GridEditableCell runs two per-cell effects (aria-selected mirror + flash) on every committed data change

- **Where:** `packages/ui/src/modules/grid/grid-editable-cell.tsx`:58-64 (flash), 73-75 (aria-selected) · _hot path_ · _effect-per-row-dom-work_
- **Impact:** The editable grid is controlled: each onValueChange hands back a fresh rows array, so rowIndexMap (use-grid-editable-rows.ts:33-41) and the augmented-columns memo (use-grid-editable-augmented-columns.tsx:140) rebuild, invalidating every cell's render fn and re-rendering all windowed GridEditableCells. Each re-mounted/re-rendered cell runs a DOM-traversing effect (closest('[role=gridcell]')) to write aria-selected and a flash effect comparing formatted. A bulk fill / paste / column-fill over a multi-row selection commits once but re-renders the whole window, so this is windowSize x 2 closest()-walks per commit, on top of the truncation reflow. Per-cell DOM traversal in an effect scales with windowed cells per edit.
- **Fix:** Drive aria-selected from the same external-store slice that already computes `selected` (set it in the store-notify path or via a data-attr the CSS reads) instead of a per-cell effect doing closest() on each render; and gate the flash effect so it does not re-run when the cell merely re-rendered from an unrelated data identity change.

  ```tsx
  useEffect(() => {
    cellRef.current?.closest('[role="gridcell"]')?.setAttribute('aria-selected', String(selected))
  }, [selected])
  ```

#### [49] 🟡 Medium — resize-height ResizeObserver reads table.offsetHeight (forced layout) on every table-size change, unthrottled

- **Where:** `packages/ui/src/modules/grid/use-grid-resize-height.ts`:35-43 · _not hot path_ · _layout-thrash_
- **Impact:** publish reads table.offsetHeight (a forced synchronous layout) and writes a CSS var inside a ResizeObserver callback. During a column-resize drag or virtualized scroll the table height churns and the callback fires repeatedly with no throttle, each time forcing layout. The read-then-write-then-(next callback)-read pattern across rapid resize events is a classic layout-thrash loop. Lower severity because it only runs when resizable and the write does not itself re-render React.
- **Fix:** Throttle publish via requestAnimationFrame and skip the write when the measured height is unchanged, so a burst of resize ticks performs one offsetHeight read and one style write per frame.

  ```tsx
  const publish = () => {
    wrapper.style.setProperty('--grid-resize-height', `${table.offsetHeight}px`)
  }
  
  publish()
  
  const observer = new ResizeObserver(publish)
  
  observer.observe(table)
  ```

#### [50] 🟡 Medium — Navigation store layout-effect notifies ALL listeners on every active-coord change

- **Where:** `packages/ui/src/modules/grid/use-grid-navigation.ts`:168-172 · _not hot path_ · _effect-fanout_
- **Impact:** Every cursor move sets `active`, and this layout effect iterates the entire listener set (one per mounted navigable cell) synchronously before paint. Each listener invokes the cell's useSyncExternalStore selector (store.isActive) — O(windowed cells) selector calls per arrow keypress. The selectors are cheap integer compares and only the two flipped cells re-render, so the fanout is bounded by the window, but during fast held-arrow navigation it runs the full notify loop every keystroke. Acceptable when virtualized; degrades on a non-virtualized many-row navigable grid where the listener set is O(all rows x columns).
- **Fix:** This is the intended external-store pattern and is fine windowed. The only real exposure is navigable + unvirtualized large grids; document that navigable requires virtualization, or short-circuit notify to only the previously-active and newly-active coordinate's subscribers via a coord->listener index instead of notifying every listener.

  ```tsx
  useLayoutEffect(() => {
    internal.active = active
  
    for (const listener of internal.listeners) listener()
  }, [active, internal])
  ```

### Virtualization, scroll & DOM
*8 candidates — 🔴 1 · 🟠 3 · 🟡 3 · ⚪ 1*

#### [51] 🔴 Critical — Truncation hook installs a ResizeObserver per cell and forces synchronous layout on every commit — the dominant per-scroll cost

- **Where:** `packages/ui/src/modules/grid/use-grid-truncation.ts`:76-92 · _hot path_ · _layout-thrash_
- **Impact:** Truncation defaults to on (grid-data.tsx:570 truncate=true). Every visible data cell (GridCellContent) and every header title (GridHeaderTitle) mounts this hook. On each virtualized scroll, the rows that window in mount a fresh ResizeObserver AND run useLayoutEffect(measure) -> isOverflowing -> document.createRange()+getBoundingClientRect() twice (use-grid-truncation.ts:37-45), forcing synchronous layout. A wide grid windowing N rows x C columns recycles N*C observers and N*C forced reflows per scroll burst. During a column-resize drag (GridData re-renders continuously) the same N*C reflows fire every frame. This is the heaviest DOM cost at scale.
- **Fix:** Stop forcing layout per cell. (1) Detect overflow with the integer scrollWidth>clientWidth check only and drop the Range/getBoundingClientRect sub-pixel path on the hot data-cell route (or gate it behind pointerenter so it runs once on hover, not every commit). (2) Replace per-cell ResizeObserver with a single observer on the table/column container that re-measures the visible window, or compute truncation from the known column width (table-fixed colgroup width vs measured text) instead of observing each <td>. (3) Add a dep array to the useLayoutEffect so it only re-measures on content/ref change, not every commit.

  ```tsx
  useLayoutEffect(measure)
  
  useEffect(() => {
    const el = ref.current
    ...
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure])
  ```

#### [52] 🟠 High — truncation useLayoutEffect has no dependency array — re-measures every mounted cell after every commit

- **Where:** `packages/ui/src/modules/grid/use-grid-truncation.ts`:76 · _hot path_ · _layout-thrash_
- **Impact:** Because there is no dep array, the layout-read measure() runs after EVERY commit of EVERY mounted truncation cell, not just when content or size changed. Any parent re-render (typing in the global search box, a selection toggle, a cursor move that bubbles a GridData render) triggers a synchronous getBoundingClientRect/Range pass across all visible cells. The setState bail prevents a render loop but not the layout cost. With many visible columns x windowed rows this is a full synchronous reflow on each keystroke/selection/scroll commit.
- **Fix:** Give the effect a dependency array keyed on the inputs that actually change truncation: the rendered content and a width signal. Measure on mount, on content change, and on ResizeObserver/font-ready callbacks only — not unconditionally every commit.

  ```tsx
  	// Setting the same value bails out of a re-render, so measuring on every
  	// commit can't loop.
  	const measure = useCallback(() => {
  		const el = ref.current
  		if (el) setTruncated(isOverflowing(el))
  	}, [])
  
  	useLayoutEffect(measure)
  ```

#### [53] 🟠 High — Non-virtualized body resolves getVisibleCells() for ALL rows on every GridData render

- **Where:** `packages/ui/src/modules/grid/grid-body.tsx`:56-61 · _hot path_ · _full-row-mapping_
- **Impact:** renderGridRow calls props.table.getRow(String(key)).getVisibleCells() per row (grid-row.tsx:97). Virtualization is opt-in (requires maxHeight); a large unvirtualized grid maps every row and resolves every row's cell array on every GridData render. Combined with a frequently-rerendering parent (typing in global search re-filters and re-renders, selection toggles, cursor moves) this is O(rows x columns) engine + React reconciliation work per render even though GridRow is memoized — the cells array is computed and the map walked before any memo can bail. Scales badly with thousands of unvirtualized rows under rapid typing.
- **Fix:** Make virtualization the default above a row-count threshold, or document that grids beyond a few hundred rows must set virtualize+maxHeight. Short of that, memoize the per-row cells resolution so getVisibleCells() isn't re-walked when neither the row model nor column set changed, and bail the rows.map when renderRows identity is stable.

  ```tsx
  	return (
  		<TableBody>
  			{rows.map((row, index) =>
  				renderGridRow(props, row, index, gridSemantics ? rowIndexOffset + index + 2 : undefined),
  			)}
  		</TableBody>
  	)
  ```

#### [54] 🟠 High — rowKeys and rowIndexMap are rebuilt over the FULL row set even when virtualized

- **Where:** `packages/ui/src/modules/grid/grid-data.tsx`:705-719 · _hot path_ · _full-row-mapping_
- **Impact:** Both memos key on renderRows. When paginated or any client transform is active, use-grid-table.ts:386-389 allocates a brand-new renderRows array every render (table.getRowModel().rows.map(r => r.original)), so these memos invalidate every render and walk all rows even though the virtualized body only renders a window. rowIndexMap builds an O(rows) Map keyed by row object on each data/sort/filter/page change; rowKeys allocates an O(rows) array. Virtualization bounds the DOM but not this per-render full-set work — defeating much of the point of windowing for large client-side pages.
- **Fix:** Stabilize renderRows: when the underlying rows are unchanged, return the prior array reference (or compute rowKeys/rowIndexMap from the stable `rows` plus engine order rather than the freshly-mapped renderRows). Build rowKeys lazily for only the windowed indices, and back rowIndexMap with a getKey->index map reused across renders instead of a fresh row-object Map each time.

  ```tsx
  	const rowKeys = useMemo<(string | number)[]>(
  		() => renderRows.map((row, i) => getKey(row, i)),
  		[renderRows, getKey],
  	)
  ...
  	const rowIndexMap = useMemo(
  		() => new Map(renderRows.map((row, i) => [row, i] as const)),
  		[renderRows],
  	)
  ```

#### [55] 🟡 Medium — Pinned cells perform live engine column lookups (getStart/getAfter) per cell on every render

- **Where:** `packages/ui/src/modules/grid/grid-table-views.ts`:242-246 · _hot path_ · _sticky-pinned_
- **Impact:** When pinning is active, every body cell (grid-row.tsx:261,278,363-364) and every header cell (grid-head.tsx:177,493,498) calls pinnedClassName + pinnedOffsetStyle, each invoking pinning.side(id) and leftOffset/rightOffset/isLastLeft per cell. Each is a table.getColumn(String(id)) hash lookup plus getStart('left')/getAfter('right'), which sum the widths of the pinned column set. That is O(visible_cells x pinned_columns) live engine work per render — recomputed every render including during a resize drag (GridData re-renders continuously) and on every windowed scroll for newly mounted rows. Sticky offsets recompute even when nothing about pinning changed.
- **Fix:** Precompute the pinned layout once per render (a map of columnId -> {side, leftOffset, rightOffset, edge}) in useGridTable and pass resolved values down, so each cell reads a cached object instead of re-deriving getStart/getAfter. Memoize on the pinning/sizing state so it is rebuilt only when pin set or widths change, not per cell per render.

  ```tsx
  side: (id) => table.getColumn(String(id))?.getIsPinned() || undefined,
  leftOffset: (id) => table.getColumn(String(id))?.getStart('left') ?? 0,
  rightOffset: (id) => table.getColumn(String(id))?.getAfter('right') ?? 0,
  isLastLeft: (id) => table.getColumn(String(id))?.getIsLastColumn('left') ?? false,
  isFirstRight: (id) => table.getColumn(String(id))?.getIsFirstColumn('right') ?? false,
  ```

#### [56] 🟡 Medium — No column/horizontal virtualization: full header and full per-row cell set render regardless of width

- **Where:** `packages/ui/src/modules/grid/grid-head.tsx`:83-101 · _not hot path_ · _no-column-virtualization_
- **Impact:** Virtualization windows rows only; the header (GridHead maps all visibleColumns) and each windowed row's cells.map (grid-row.tsx:244) render every visible column. For a very wide grid (hundreds of columns) every scroll mounts full-width rows: C truncation observers + C flexRender calls + C pinned lookups per windowed row, plus a full-width header that is never windowed. DOM node count and the truncation/pinning per-cell costs above scale with column count with no upper bound from row windowing.
- **Fix:** Add horizontal virtualization (a second @tanstack/react-virtual axis over visibleColumns) for the wide-table case, windowing header and body columns to the horizontal viewport plus pinned columns, or document a supported column-count ceiling. At minimum, only mount the truncation observer for columns whose width can actually clip (skip auto/large columns).

  ```tsx
  			<TableRow aria-rowindex={gridSemantics ? 1 : undefined}>
  				{columns.map((col, colIdx) => (
  					<GridHeaderCell
  						key={col.id}
  ...
  ```

#### [57] 🟡 Medium — CSV export materializes the entire sorted row model into a string synchronously on the main thread

- **Where:** `packages/ui/src/modules/grid/grid-data.tsx`:751-764 · _not hot path_ · _main-thread-block_
- **Impact:** On export click, getSortedRowModel().rows.map allocates an array of ALL filtered/sorted rows (every page), then rowsToCsv (grid-export.ts:48-58) builds the full CSV via nested map/join with a per-field regex (escapeCsvField) over rows x columns, then holds the whole string plus a Blob in memory. For tens of thousands of rows x many columns this blocks the UI thread for the full build with no chunking/yielding. Per-click, not per-render, but a hard freeze on large datasets.
- **Fix:** Stream the CSV in chunks across animation frames / a Web Worker, or build it via an incremental writer yielding to the event loop every N rows. Avoid materializing both the originals array and the full string at once.

  ```tsx
  					rowsToCsv(
  						visibleColumns,
  						table.getSortedRowModel().rows.map((modelRow) => modelRow.original),
  					),
  ```

#### [58] ⚪ Low — Spacer <td> uses colSpan over all columns inside a table-fixed layout

- **Where:** `packages/ui/src/modules/grid/grid-virtualized-body.tsx`:42-47 · _not hot path_ · _sticky-pinned_
- **Impact:** The grid uses table-fixed with a colgroup (grid-data.tsx:846,877). The two spacer rows are correct for scroll height, but a single colSpan cell spanning all columns inside table-fixed forces the browser to reconcile the spanning cell against the colgroup track widths on each spacer height change (every scroll updates topSpacer/bottomSpacer). With many pinned/sticky columns the spanning spacer participates in the sticky containing block recalculation. Minor versus the truncation cost, but it is a per-scroll style/layout write on a wide table.
- **Fix:** Render the spacers as fixed-height rows with empty <td>s matching the rendered column count is unavoidable for table semantics, but consider moving virtualization to a CSS translateY on a single positioned tbody offset (or a non-table flex/grid layout) so scroll only updates one transform rather than two colSpan cells reconciled against the colgroup.

  ```tsx
  				<tr data-slot="grid-spacer" aria-hidden="true">
  					<td
  						colSpan={visibleColumns.length}
  						style={{ height: topSpacer, padding: 0, border: 0 }}
  					/>
  				</tr>
  ```

### Bundle size, code-splitting & import cost
*8 candidates — 🟠 2 · 🟡 4 · ⚪ 2*

#### [59] 🟠 High — Read-only Grid statically pulls the entire editable subsystem into its chunk

- **Where:** `packages/ui/src/modules/grid/grid.tsx`:5, 46 · _not hot path_ · _code-splitting_
- **Impact:** The Grid dispatcher is a thin runtime branch, but the static `import { GridEditable }` forces the whole editable stack into every consumer's bundle even for purely read-only grids. GridEditable (grid-editable.tsx) eagerly imports nine editable hooks (draft, history, mutations, navigation, rows, selection, store, wrapper, augmented-columns) plus the default text editor and its Input/HeadlessProvider chain. A page that only renders read-only data grids ships all of that dead code.
- **Fix:** Lazy-load the editable arm: `const GridEditable = lazy(() => import('./grid-editable'))` and render it inside a `<Suspense>` only on the `editable` branch (or split it behind a separate `GridEditable` export and keep `Grid` import-free of it). This moves the entire edit/history/mutation/navigation stack into an async chunk fetched only when `editable` is set.

  ```tsx
  import { GridEditable, type GridEditableProps } from './grid-editable'
  ...
  return props.editable ? <GridEditable<T> {...props} /> : <GridData<T> {...props} />
  ```

#### [60] 🟠 High — Column-manager Dialog pulls motion/react (Framer Motion) into the base read-only grid chunk

- **Where:** `packages/ui/src/modules/grid/grid-data.tsx`:16, 941 · _not hot path_ · _code-splitting_
- **Impact:** The dialog is correctly runtime-gated by `renderDialog &&`, but the `import` is static, so `GridColumnManagerDialog` -> `Dialog` (components/dialog/dialog.tsx:3 `import { motion } from 'motion/react'`) drags Framer Motion plus the Overlay/PanelProviders/glass-surface stack into the base chunk of every grid, including grids that never expose a column manager. Framer Motion is one of the heaviest deps in the tree and the column manager is a rarely-opened, secondary surface.
- **Fix:** Lazy-load the dialog: `const GridColumnManagerDialog = lazy(() => import('./grid-column-manager-dialog'))`, rendered inside `<Suspense>` only when `renderDialog`. The manager also re-exports through index.ts (grid-column-manager.tsx pulls Checkbox/CheckboxGroup/List), so splitting it removes motion/react and that whole forms chain from the default grid load.

  ```tsx
  import { GridColumnManagerDialog } from './grid-column-manager-dialog'
  ...
  {renderDialog && (
  	<GridColumnManagerDialog
  ```

#### [61] 🟡 Medium — Default text editor (Input + HeadlessProvider) is eagerly bundled with the augmented-columns builder

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-augmented-columns.tsx`:8, 81 · _not hot path_ · _import-cost_
- **Impact:** `useGridEditableAugmentedColumns` is always loaded with GridEditable and statically references `GridEditableTextEditor`, which imports `Input` and `HeadlessProvider` (grid-editable-text-editor.tsx:4-5). So even an editable grid whose columns all supply a custom `editor` still ships the text editor + Input + HeadlessProvider as the fallback. It is part of the per-cell default path so it cannot tree-shake.
- **Fix:** This one is hard to lazy-split because it is the synchronous fallback for cells without a custom editor; accept it as the editable baseline. The actionable win is ensuring it is only reachable through the lazy GridEditable chunk (finding 1) so read-only grids never pay for it.

  ```tsx
  import { GridEditableTextEditor } from './grid-editable-text-editor'
  ...
  const editor = colEditor ?? GridEditableTextEditor
  ```

#### [62] 🟡 Medium — Context menu (Menu -> @floating-ui/react) statically imported into every grid even when contextMenu={false}

- **Where:** `packages/ui/src/modules/grid/grid-data.tsx`:18, 119 · _not hot path_ · _code-splitting_
- **Impact:** `GridContextMenu` is render-gated (returns early when contextMenu is falsy), but the static import pulls grid-context-menu.tsx -> `Menu/MenuContent/MenuItem/MenuLabel/MenuSeparator` (components/menu/menu.tsx:3 `import type { Placement } from '@floating-ui/react'` and the menu runtime), plus 10 lucide icons, into the base chunk. Context menus default on, so most grids use it — but a grid built with `contextMenu={false}` still ships the entire menu + floating-ui positioning code.
- **Fix:** Lazy-load `GridContextMenu` behind `<Suspense>` gated on `contextMenu` truthiness so floating-ui and the menu runtime only load when a context menu is actually configured. Lower priority than the Dialog split since the menu is on by default, but it still penalizes the explicit-opt-out case.

  ```tsx
  import { GridContextMenu } from './grid-context-menu'
  ...
  if (!contextMenu) return reordered
  ```

#### [63] 🟡 Medium — Pagination footer pulls Select -> Listbox -> @floating-ui/react into the base chunk unconditionally

- **Where:** `packages/ui/src/modules/grid/grid-pagination.tsx`:11, 982 · _not hot path_ · _code-splitting_
- **Impact:** The footer is render-gated by `pagination &&`, but grid-pagination.tsx statically imports `Select`, which is `Listbox` (components/select/select.tsx:1) and Listbox imports `@floating-ui/react` (components/listbox/listbox.tsx:3) plus lucide ChevronsUpDown/X. So the floating-ui-backed page-size dropdown ships in the base chunk of every grid, including non-paginated grids that never render a footer.
- **Fix:** Split the footer: `const GridPaginationFooter = lazy(() => import('./grid-pagination'))` rendered under `<Suspense>` when `pagination` is present. Non-paginated grids then never load Listbox/floating-ui via this path. (floating-ui may already arrive via the context menu, but the Listbox + select code is additional and avoidable for non-paginated grids.)

  ```tsx
  import { Select, SelectLabel, SelectOption } from '../../components/select'  // grid-pagination.tsx:11
  {pagination && <GridPaginationFooter pagination={pagination} />}  // grid-data.tsx:982
  ```

#### [64] 🟡 Medium — @dnd-kit core + sortable loaded into every grid regardless of reorder/drag use

- **Where:** `packages/ui/src/modules/grid/grid-data.tsx`:3, 110 · _not hot path_ · _import-cost_
- **Impact:** DndContext/SortableContext are only mounted when `canReorder` is true, but the static imports place all of @dnd-kit/core and @dnd-kit/sortable in the base grid chunk. Column reorder is opt-in (`reorder` prop), so every grid that never enables drag-reorder still ships both dnd-kit packages. grid-head.tsx:3 and grid-row.tsx:3 additionally import `useSortable` from @dnd-kit/sortable on the per-header/per-row code path, anchoring the dependency even harder.
- **Fix:** Gate the dnd-kit-bearing wrapper behind a lazy boundary keyed on `reorder`/`canReorder` so non-reorderable grids omit @dnd-kit entirely. This requires extracting the DndContext/SortableContext wrapper and the sortable header/row variants into a separately-imported reorder module; meaningful but larger refactor. The existing custom modifiers in grid-reorder.ts (which deliberately avoid @dnd-kit/modifiers) show the team already minimizes dnd-kit surface, so finishing the job by lazy-loading the runtime fits.

  ```tsx
  import { DndContext } from '@dnd-kit/core'
  import { SortableContext } from '@dnd-kit/sortable'
  ...
  <DndContext {...dndContextProps} modifiers={REORDER_MODIFIERS} autoScroll={REORDER_AUTO_SCROLL}>
  ```

#### [65] ⚪ Low — index.ts barrel eagerly names all five concrete editors, defeating per-editor tree-shaking via deep imports

- **Where:** `packages/ui/src/modules/grid/index.ts`:16-33 · _not hot path_ · _import-cost_
- **Impact:** Each editor drags a heavy input component: currency -> CurrencyInput (130 lines), date -> DateInput (357 lines, lucide Calendar/X + useFormattedInput), select -> Select/Listbox/floating-ui. The barrel re-exports are individually tree-shakeable (named re-exports), so a consumer importing only GridEditableNumberEditor will not pull DateInput. The risk is consumers importing the barrel namespace or bundlers without good cross-module tree-shaking, in which case DateInput's 357-line + floating-ui chains land in the app chunk despite being unused.
- **Fix:** Keep the named re-exports (they are the tree-shakeable form). Document that editors should be imported by name, and ensure the package sets `sideEffects: false` for these editor modules so unused editors are dropped. No code change needed if the bundler honors named-export DCE; this is a guardrail, not a defect.

  ```tsx
  export { GridEditableBooleanEditor } from './grid-editable-boolean-editor'
  export { GridEditableCurrencyEditor, ... } from './grid-editable-currency-editor'
  export { GridEditableDateEditor, ... } from './grid-editable-date-editor'
  export { GridEditableNumberEditor, ... } from './grid-editable-number-editor'
  export { GridEditableSelectEditor, ... } from './grid-editable-select-editor'
  ```

#### [66] ⚪ Low — All grid styling is read through scoped kata modules, not a single barrel — no action needed

- **Where:** `packages/ui/src/modules/grid/grid-row.tsx`:16 · _hot path_ · _import-cost_
- **Impact:** The style tokens are split across `recipes/kata/grid`, `recipes/kata/grid-editable`, and `recipes/kata/grid-column-manager`, so the read-only render path (grid/grid-row/grid-head/grid-cell-content) only pulls `kata/grid`; the editable cells pull `kata/grid-editable`; the manager dialog pulls `kata/grid-column-manager`. This is the correct split — read-only grids do not pull editable or column-manager style recipes.
- **Fix:** No change. Recorded to confirm the kata import surface is already correctly partitioned and is not inflating the per-row code path.

  ```tsx
  import { k } from '../../recipes/kata/grid'
  ```

### Static complexity hotspots
*11 candidates — 🔴 1 · 🟠 5 · 🟡 5*

#### [67] 🔴 Critical — useGridTruncation measure (isOverflowing) forces synchronous layout per truncated cell on every commit

- **Where:** `packages/ui/src/modules/grid/use-grid-truncation.ts`:34-46, 76 · _hot path_ · _complexity-on-hotpath_
- **Impact:** useLayoutEffect(measure) has NO dependency array, so it fires after EVERY commit for EVERY mounted truncation cell (one per truncated data cell AND per header title). measure→isOverflowing reads scrollWidth/clientWidth and, on the sub-pixel path, builds a document.createRange() and calls getBoundingClientRect() twice — forced synchronous reflow. With V visible cells this is up to V forced reflows per grid re-render; during a drag-resize (GridData re-renders continuously) or fast virtualized scroll (each newly-windowed cell mounts a fresh observer + measure, line 78-92), this is the dominant layout-thrash path at scale.
- **Fix:** Gate measurement: give the layout effect a dependency on the measured content/width so it does not re-run on unrelated commits; debounce/batch ResizeObserver callbacks (single rAF that measures all dirty cells once) instead of one observer per cell; prefer the integer scrollWidth>clientWidth check and only fall back to Range geometry when within 1px, ideally measured in a batched read phase to avoid interleaved read/write reflows.

  ```tsx
  useLayoutEffect(measure)\n...\nconst range = document.createRange()\n\trange.selectNodeContents(el)\n...\n\treturn range.getBoundingClientRect().width - el.getBoundingClientRect().width > OVERFLOW_SLACK
  ```

#### [68] 🟠 High — compareSmart/parseNumeric: regex-heavy numeric parse runs O(N log N) per client sort with zero memoization

- **Where:** `packages/ui/src/modules/grid/grid-sorting-utilities.ts`:31-54, 99-115 · _hot path_ · _complexity-on-hotpath_
- **Impact:** parseNumeric (CC=10, Cog=17) does 3 regex .replace passes + a DECIMAL.test per value; compareSmart (CC=10, Cog=14) is the default SortingFn (smartSortingFn, grid-table-options.ts:124) and calls parseNumeric for BOTH operands of every comparison. A client sort of N rows is O(N log N) comparisons, so ~2·N·log N regex/allocation passes over freshly stringified cell values, with no per-value memoization or precomputed sort key. On wide/large datasets a single column-header sort click visibly stalls the main thread; re-sorting on every data change compounds it.
- **Fix:** Precompute a sort key once per (row,column) per sort rather than re-parsing inside the comparator: map the column's accessor values to {num|string} keys in a single O(N) pass before .sort, then compare the precomputed keys. Alternatively memoize parseNumeric by value identity, or detect column numeric-ness once and skip the regex path for known-text columns.

  ```tsx
  const cleaned = body.replace(CURRENCY, '').replace(NUMERIC_NOISE, '').replace(/%$/, '')\n\tif (!DECIMAL.test(cleaned)) return null
  ```

#### [69] 🟠 High — useGridEditableCellSlice selector body runs per windowed cell on every store notification

- **Where:** `packages/ui/src/modules/grid/grid-editable-context.ts`:61-100 · _hot path_ · _complexity-on-hotpath_
- **Impact:** useGridEditableCellSlice (CC=13, Cog=10) is the useSyncExternalStore selector mounted on EVERY visible editable cell. On every navigation move / shift-select the store notifies and each subscribed cell re-runs select(): inRect math plus extraCells.has(cellKey(rowIdx,colIdx)) — and cellKey allocates a fresh string per call (use-grid-editable-navigation). With W windowed cells and a large extraCells set (many ctrl-clicks), each cursor move is O(W) string allocations + Set lookups. The content-cache bails the React re-render but the selector body still executes per cell per notification.
- **Fix:** Avoid the per-cell string alloc: store extras as a nested numeric structure (Map<row,Set<col>>) or compare numerically so extraCells lookup needs no cellKey() string. Cheaply short-circuit: compute isActive first and skip the inRect/extras work for the vast majority of cells that are neither active nor near the anchor rectangle (bounding-box reject before the Set lookup).

  ```tsx
  const within = !!active && !!anchor && inRect(rowIdx, colIdx, anchor, active)\n\t\tconst inRange = !isActive && (within || extraCells.has(cellKey(rowIdx, colIdx)))
  ```

#### [70] 🟠 High — GridDataCell (not memoized) recomputes cellProps + flexRender + resolveCellTooltip for every cell whenever its row re-renders

- **Where:** `packages/ui/src/modules/grid/grid-row.tsx`:323-343 · _hot path_ · _complexity-on-hotpath_
- **Impact:** GridDataCell is NOT wrapped in memo (GridRow is, but it maps every visible cell through this on each re-render). So whenever a row re-renders — and the whole windowed row set re-renders on any committed edit (augmented-columns memo rebuilds via rowIndexMap, use-grid-editable-augmented-columns.tsx:140), data/sort/filter/page change, or toggleAll — each cell re-runs col.cellProps(row), flexRender(...cell.getContext()), and resolveCellTooltip(col,row) (which invokes col.cellTooltip(row)). That is O(visible_columns) closure invocations + context resolution per re-rendered row, on top of the per-cell truncation measure. For an editable grid where every commit re-renders all windowed rows, this multiplies across the window every keystroke-commit.
- **Fix:** Wrap GridDataCell in memo keyed on (cell, col, row, colIndex, pinning, reorderable, truncate) so cells whose inputs are unchanged skip the cellProps/flexRender/tooltip recompute; ensure col.cellProps/cellTooltip results are stable enough for the memo. This caps per-commit work to cells whose row data actually changed instead of the whole window.

  ```tsx
  const cellExtra = col.cellProps?.(row)\n\tconst rawContent = col.cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : null\n...\n<GridCellContent content={rawContent} tooltip={resolveCellTooltip(col, row)} />
  ```

#### [71] 🟠 High — Augmented editable cell render fn calls formatCell on every windowed cell every render

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-augmented-columns.tsx`:120-140 · _hot path_ · _complexity-on-hotpath_
- **Impact:** The augmented cell(row) fn runs rowIndexMap.get(row) + formatCell(row,col) for every windowed cell on every render of the editable body — and crucially the whole memo (deps include rowIndexMap) rebuilds on every committed edit because the controlled grid hands back a fresh rows array, rebuilding rowIndexMap (use-grid-editable-rows.ts:33-41, an O(N) Map) which invalidates all cell render fns and re-renders every windowed row. formatCell is not memoized per cell, so for columns with a non-trivial format callback the formatter re-runs per windowed cell on every navigation-driven and commit-driven body re-render: O(windowed_cells × format_cost) per commit.
- **Fix:** Decouple the cell render fns from rowIndexMap identity (look the index up via a ref inside the closure, as use-grid-navigation-columns already does with rowIndexMapRef) so a committed edit does not rebuild every column's cell fn. Memoize formatCell results per (row,col) (e.g. WeakMap keyed by row) so navigation re-renders that don't change cell data reuse the formatted string.

  ```tsx
  cell: (row: T) => {\n\t\t\t\t\tconst rowIdx = rowIndexMap.get(row) ?? -1\n\t\t\t\t\tconst formatted = formatCell(row, col)
  ```

#### [72] 🟠 High — queryFilterFn evaluateQuery runs per row per keystroke with per-rule lowercase string allocations

- **Where:** `packages/ui/src/modules/grid/grid-table-options.ts`:112-115 · _hot path_ · _complexity-on-hotpath_
- **Impact:** queryFilterFn is the per-column client filter, invoked by the engine for every row each time the filter row model recomputes (every column-filter edit). evaluateQuery (query-builder-evaluate.ts:100, the function the complexity tool flagged as autoRemove CC=15/Cog=27 at the call site) folds each rule via matchers where text operators do asText(a).toLowerCase().includes(asText(b).toLowerCase()) — allocating two lowercased strings per rule per row. For N rows × R rules that is O(N·R) string allocations on each filter change, with no debounce at this layer (grid-column-filter setQuery flows straight to setFilterValue). On large client datasets, building a multi-rule filter lags per keystroke.
- **Fix:** Hoist the rule-side normalization out of the per-row matcher (lowercase ruleValue once per filter evaluation, not per row) and debounce filter input writes; for high-cardinality columns consider precomputing a lowercased field cache. The grid owns the call site (queryFilterFn) so the per-row allocation can be reduced there even though evaluateQuery lives in the query module.

  ```tsx
  const queryFilterFn: FilterFn<unknown> = (row, columnId, filterValue) =>\n\t!isQueryGroup(filterValue) || evaluateQuery(filterValue, () => row.getValue(columnId))
  ```

#### [73] 🟡 Medium — deriveVisibleColumns re-resolves three live engine leaf-column queries on every GridData render

- **Where:** `packages/ui/src/modules/grid/grid-table-views.ts`:155-193 · _hot path_ · _complexity-on-hotpath_
- **Impact:** useVisibleColumns calls deriveVisibleColumns unconditionally every render (no memo guard), invoking three engine leaf-column getters and rebuilding the column array, then element-wise comparing to stabilize the reference. The reference stabilization protects downstream memos, but the derivation itself runs O(columns) live engine resolution on every render — including every keystroke into search/filter and every selection toggle (which re-render GridData). With hundreds of columns this is a per-render cost that does no useful work when column order/visibility/pinning is unchanged.
- **Fix:** Memoize the derivation on the engine state that actually affects it (columnOrder, columnVisibility, columnPinning, columnSizing identity) instead of recomputing every render, keeping the element-wise stabilization only as a fallback. TanStack already exposes these via getState(); key the useMemo on them.

  ```tsx
  const sections = [\n\t\ttable.getLeftVisibleLeafColumns(),\n\t\ttable.getCenterVisibleLeafColumns(),\n\t\ttable.getRightVisibleLeafColumns(),\n\t]
  ```

#### [74] 🟡 Medium — navigable cell closures do two Map.get lookups per cell per render under rowIndexMap rebuilt each render

- **Where:** `packages/ui/src/modules/grid/use-grid-navigation-columns.tsx`:108-145 · _hot path_ · _complexity-on-hotpath_
- **Impact:** Under `navigable`, every data column's cellProps and cell closures perform two Map.get lookups (rowIndexMapRef, colIndexMapRef) per cell, and each cell mounts a GridNavCell with its own useSyncExternalStore subscription. The backing rowIndexMap is rebuilt as a new O(rows) Map on every renderRows identity change (grid-data.tsx:716-719) — i.e. every sort/filter/page/data change. Windowed this is fine, but `navigable` combined with a non-virtualized large-row grid means O(rows×cols) Map.get + one subscription per cell on every such render.
- **Fix:** This path is acceptable when virtualized; the concern is navigable + unvirtualized. Document/guard that navigable large grids require virtualize, or store row index on the row object / via a WeakMap keyed by row built incrementally rather than rebuilding a full Map on every renderRows identity flip.

  ```tsx
  const rowIdx = rowIndexMapRef.current.get(row) ?? -1\n\t\t\t\t\t\tconst colIdx = colIndexMapRef.current.get(col.id) ?? -1
  ```

#### [75] 🟡 Medium — buildPaginationView reads getPrePaginationRowModel().rows.length on an unmemoized per-render path

- **Where:** `packages/ui/src/modules/grid/grid-table-views.ts`:275-303 · _hot path_ · _complexity-on-hotpath_
- **Impact:** The pagination view is intentionally rebuilt every GridData render (use-grid-table.ts:394-403, not memoized) and in client mode reads getPrePaginationRowModel().rows.length plus getPageCount/getCanPreviousPage/getCanNextPage, and allocates fresh setPageIndex/setPageSize closures each time. The .length read forces the engine to keep the full filtered (pre-pagination) row model materialized and ties every grid render — including each keystroke into the global filter and each selection toggle — to the filtered-set size. The model itself is TanStack-memoized, but coupling footer existence to it on a per-render, unmemoized path means the cost tracks filtered-row count under filter churn.
- **Fix:** Memoize the pagination view on the inputs that change it (pagination state, filtered row count, page count) so unrelated GridData re-renders don't re-touch the pre-pagination model or reallocate the page-setter closures; this also makes the footer safe to wrap in memo.

  ```tsx
  const total = args.manual\n\t\t? args.config.rowCount\n\t\t: args.table.getPrePaginationRowModel().rows.length
  ```

#### [76] 🟡 Medium — toRowSelectionState rebuilds an O(selected) object feeding the per-render engine state on every selection change

- **Where:** `packages/ui/src/modules/grid/grid-table-options.ts`:51-61 · _hot path_ · _complexity-on-hotpath_
- **Impact:** toRowSelectionState iterates the ENTIRE selection Set building a fresh {[id]:true} object; it is memoized only on the selection Set identity, which changes on every toggle (use-grid-table.ts:329). A select-all of thousands then allocates an O(selected) object plus String(key) per entry on each selection mutation, and that new object feeds buildState (grid-table-options.ts:271) which itself hands TanStack a brand-new state literal every render — so a large-selection workflow pays O(selected) rebuild plus full TanStack state reconciliation on every toggle.
- **Fix:** Maintain the RowSelectionState incrementally alongside the Set (add/remove the single toggled key) instead of rebuilding the whole object each change, or have the engine read selection through getRowId without materializing the full map. Avoid stringifying keys that are already strings.

  ```tsx
  const state: RowSelectionState = {}\n\tif (!selection) return state\n\tfor (const key of selection) state[String(key)] = true\n\treturn state
  ```

#### [77] 🟡 Medium — uniqueValues (spread+filter+map+Set+localeCompare sort) recomputes on every filter-button render, and JSON.stringify serializes the result

- **Where:** `packages/ui/src/modules/grid/grid-table-views.ts`:260-270 · _hot path_ · _complexity-on-hotpath_
- **Impact:** For each select-filterable header, GridColumnFilterButton calls filter.uniqueValues(column.id) every render (grid-column-filter-button.tsx:75-77) — which spreads the faceted Map keys, filters, maps to String, dedupes via a new Set, and localeCompare-sorts: O(distinct·log distinct) with no memo. Then JSON.stringify(facetValues ?? null) (line 82) serializes the whole distinct-value array every render just to derive a memo key, O(distinct) per render even when the filter sheet is closed. For high-cardinality select columns this runs on every re-render of that header.
- **Fix:** Compute uniqueValues only when the filter sheet opens (lazy), or memoize it on the faceted Map identity. Replace the JSON.stringify memo key with the engine's faceted-values reference/version (TanStack memoizes getFacetedUniqueValues) so identity comparison avoids O(distinct) serialization on closed sheets.

  ```tsx
  const values = [...facets.keys()].filter(...).map((value) => String(value))\n\t\t\treturn [...new Set(values)].sort((a, b) => a.localeCompare(b))
  ```

### Static anti-patterns & duplication (performance-relevant)
*12 candidates — 🔴 1 · 🟠 5 · 🟡 6*

#### [78] 🔴 Critical — Per-cell truncation hook runs a forced-reflow measure on every commit with no dependency array

- **Where:** `packages/ui/src/modules/grid/use-grid-truncation.ts`:76 (measure 70-74, isOverflowing 34-46, observer 78-92) · _hot path_ · _work-in-render / layout thrash_
- **Impact:** useLayoutEffect with no deps fires after EVERY commit for EVERY mounted truncation cell (and every header title). When scrollWidth<=clientWidth it constructs a Range and calls getBoundingClientRect twice, forcing synchronous layout. With V visible cells that is V forced reflows per grid re-render; on fast virtualized scroll each newly-windowed cell also mounts a fresh ResizeObserver. This is the dominant per-cell, per-scroll, per-resize cost at scale.
- **Fix:** Gate measure to inputs that can change overflow: pass the rendered content/width as deps (useLayoutEffect(measure, [content, width])) instead of a bare call, or only measure on resize/content change rather than every commit. Keep the single ResizeObserver but drop the unconditional per-commit layout read. Optionally batch reads across cells via one shared observer to avoid N independent reflows.

  ```tsx
  useLayoutEffect(measure)  // no dep array; measure -> isOverflowing -> document.createRange(); range.getBoundingClientRect(); el.getBoundingClientRect()
  ```

#### [79] 🟠 High — renderRows reallocated every render busts all downstream parallel-array memos even under virtualization

- **Where:** `packages/ui/src/modules/grid/use-grid-table.ts`:386-389 · _hot path_ · _repeated recomputation / memo invalidation_
- **Impact:** When pagination or any client transform is active, renderRows is a brand-new array reference every GridData render even when the underlying rows are unchanged. Every memo keyed on it — rowKeys (grid-data.tsx:705), rowIndexMap new Map (grid-data.tsx:716), the body row list — invalidates each render, walking the full page (not the virtualized window). On a large page with frequent re-renders (typing in search, cursor moves bubbling a parent render) this is repeated O(rows) work plus cascading Map rebuilds.
- **Fix:** Memoize renderRows on the structural inputs that actually change it (table.getRowModel() output identity / data ref + sorting + filters + pagination state) so its reference is stable across unrelated re-renders, restoring the downstream memos. At minimum memoize rowKeys/rowIndexMap on a stable signal rather than the freshly-mapped array.

  ```tsx
  const renderRows = paginated || clientTransform ? table.getRowModel().rows.map((modelRow) => modelRow.original) : rows
  ```

#### [80] 🟠 High — buildState allocates a fresh TanStack state object every render, forcing engine reconciliation

- **Where:** `packages/ui/src/modules/grid/grid-table-options.ts`:289 (call site use-grid-table.ts:344-361) · _hot path_ · _work-in-render_
- **Impact:** A new state object reference is handed to useReactTable on every GridData render even when nothing changed, so TanStack re-runs its state-change detection each render. This is the central per-render multiplier for the whole engine and compounds with any frequently-rerendering parent (resize drag with onChange, rapid typing in search/filter where GridData re-renders per keystroke).
- **Fix:** Memoize the assembled state object on its constituent slices (each already individually memoized except columnVisibility) so the reference holds when nothing changed. Stabilize columnVisibility identity too. This lets TanStack short-circuit its reconciliation on no-op renders.

  ```tsx
  const state: GridControlledState = { columnOrder: args.columnOrder, columnVisibility: args.columnVisibility }; ... return state  // new object literal each call, passed to useReactTable state
  ```

#### [81] 🟠 High — Editable history priorValue does rows.findIndex per change -> O(N*K), O(N^2) on select-all fills

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-history.ts`:56-71 (emit 77) · _not hot path_ · _duplicated lookup that should reuse the existing index map_
- **Impact:** emit maps priorValue over every change in a batch; each does a full rows.findIndex AND an editableCols.find. A column-fill across a multi-row selection or a matrix paste emits K changes -> O(N*K). For select-all + type (K approx N) this is O(N^2) on every commit, despite rowIndexMap/getKey already existing. editableCols.find per change adds an O(columns) scan too.
- **Fix:** Pass the existing rowIndexMap (use-grid-editable-rows.ts:33) and a columnId->column Map into the history hook; replace findIndex with map.get(change.rowKey) and editableCols.find with the column map. Reduces the inverse-batch build to O(K).

  ```tsx
  const index = rows.findIndex((row, i) => getKey(row, i) === change.rowKey)  // per change; plus editableCols.find per change at line 58
  ```

#### [82] 🟠 High — applyCellWrite fans a single-cell write across ALL rows when in a multi-row selection

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-mutations.ts`:92-96 · _not hot path_ · _work-in-render / O(N) per commit_
- **Impact:** A single Enter inside a size>1 selection walks all rows calling getKey per row to build the column-fill change set. Combined with history's per-change findIndex (above), one keystroke on a 10k-row select-all is O(N) here multiplied by O(N) in history = O(N^2) per commit.
- **Fix:** Iterate the selection Set directly (it already holds the target rowKeys) instead of scanning currentRows, resolving each key via rowIndexMap to fetch the row. That makes the fan-out O(selected) rather than O(rows), and pairs with the history index-map fix to drop the quadratic.

  ```tsx
  currentRows.forEach((r, i) => { const rk = getKey(r, i); if (sel.has(rk)) changes.push({ rowKey: rk, columnId: col.id, value }) })
  ```

#### [83] 🟠 High — Global filter has no debounce: every keystroke triggers a full re-filter and whole-grid re-render

- **Where:** `packages/ui/src/modules/grid/grid-filter.tsx`:24 (forwarded use-grid-table.ts:426) · _hot path_ · _work-in-render / missing debounce_
- **Impact:** SearchInput holds no local state; each keystroke calls setValue which forwards straight to table.setGlobalFilter, forcing TanStack's includesString filter (grid-table-options.ts:206) to lowercase + scan every cell across all rows on every keystroke, then re-render the whole GridData subtree. For large client-side datasets typing visibly lags (O(rows*columns) per keystroke).
- **Fix:** Add a debounced/deferred path: keep the input value in local state for immediate echo and push to setGlobalFilter via useDeferredValue or a short debounce so the expensive re-filter coalesces across rapid keystrokes.

  ```tsx
  onChange={(event) => filter.setValue(event.target.value)}  // setValue -> table.setGlobalFilter(value), no local state, no debounce
  ```

#### [84] 🟡 Medium — toRowSelectionState rebuilds an O(selected) object on every selection change, feeding per-render buildState

- **Where:** `packages/ui/src/modules/grid/grid-table-options.ts`:51-61 (memo use-grid-table.ts:329) · _not hot path_ · _repeated recomputation_
- **Impact:** Selection toggles produce a new Set identity, so rowSelection rebuilds an object over the entire selection. Select-all of thousands then re-toggles allocates an O(selected) object on each selection change, and that new object flows into the per-render buildState contributing to TanStack state churn. Large-selection workflows scale poorly.
- **Fix:** Maintain the RowSelectionState incrementally alongside the Set (mutate on toggle) instead of rebuilding from scratch, or derive it lazily only when the engine actually needs the selected-row model. Avoid recomputing the whole object for single-row toggles.

  ```tsx
  for (const key of selection) state[String(key)] = true  // rebuilt whenever selection Set identity changes
  ```

#### [85] 🟡 Medium — Editable rowIndexMap + augmented-columns memo rebuild fully on every committed edit

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-rows.ts`:33-41 (augmented dep use-grid-editable-augmented-columns.tsx:140) · _hot path_ · _repeated recomputation_
- **Impact:** The editable grid is controlled, so the consumer returns a fresh rows array after each onValueChange. Every commit rebuilds an O(N) Map keyed by row object, and because the augmented-columns memo depends on rowIndexMap it rebuilds every column's cell/cellProps closures, invalidating the cells arrays so all currently-rendered (windowed) rows re-render. The full-N Map rebuild happens on every single-cell edit.
- **Fix:** Key the augmented-columns memo on a stable column signature rather than rowIndexMap so cell closures survive edits; have the cell read rowIndexMap through a ref (as navigation already does via rowIndexMapRef) so identity changes don't bust the column memo. The Map itself can stay but should not gate cell-function identity.

  ```tsx
  const rowIndexMap = useMemo(() => { const m = new Map<T, number>(); rows.forEach((r, i) => { m.set(r, i) }); return m }, [rows])
  ```

#### [86] 🟡 Medium — GridDataCell is not memoized; all per-cell work re-runs whenever a row re-renders

- **Where:** `packages/ui/src/modules/grid/grid-row.tsx`:323-368 (GridRow memo at 303, cell calls 332/336/340) · _hot path_ · _work-in-render_
- **Impact:** GridRow is memoized but GridDataCell is a plain function, so when a row re-renders (selection prop flip, any state change for non-virtualized large grids) every visible cell re-runs col.cellProps(row), flexRender + cell.getContext(), and resolveCellTooltip -> col.cellTooltip(row). That is O(visible_columns) callback invocations per re-rendered row; toggleAll re-renders every row, multiplying it across the page.
- **Fix:** Wrap GridDataCell in memo with a comparator over (cell identity, col, row, pinning side/offset). Since flexRender output and cellProps depend only on row+col, a memoized cell skips re-running the consumer callbacks when only sibling cells/rows changed.

  ```tsx
  const cellExtra = col.cellProps?.(row); const rawContent = col.cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : null; ... resolveCellTooltip(col, row)
  ```

#### [87] 🟡 Medium — allSelected/someSelected scan rowKeys on every Grid render (unmemoized O(rows))

- **Where:** `packages/ui/src/modules/grid/use-grid-selection.ts`:59-61 · _not hot path_ · _repeated recomputation_
- **Impact:** Both flags recompute by scanning rowKeys on every GridData render, not just on selection change. With large page sizes and frequent re-renders (typing in the global filter, cursor moves bubbling a parent render) this is repeated O(rows) Set-lookup work each render; someSelected also gates the batch-actions toolbar.
- **Fix:** useMemo allSelected/someSelected on [rowKeys, selection]. Since both inputs are already stable references between unrelated renders, this removes the scan from no-op renders entirely.

  ```tsx
  const allSelected = rowKeys.length > 0 && rowKeys.every((rk) => selection.has(rk)); const someSelected = rowKeys.some((rk) => selection.has(rk))
  ```

#### [88] 🟡 Medium — Context-menu rowByKey Map rebuilt over all rows on every data change for a menu that may never open

- **Where:** `packages/ui/src/modules/grid/grid-context-menu.tsx`:272-275 · _not hot path_ · _eager work that should be deferred_
- **Impact:** An N-entry Map is allocated on every rows/rowKeys change even though items are only needed on right-click. On large pages every data change (sort, filter, page, edit) builds a throwaway O(rows) Map for a context menu that frequently never opens.
- **Fix:** Defer rowByKey construction to the handleContextMenu handler (build it lazily on right-click, or look the row up by index via the existing rowIndexMap), so no per-data-change allocation occurs for an unopened menu.

  ```tsx
  const rowByKey = useMemo(() => new Map(rowKeys.map((key, index) => [String(key), rows[index]] as const)), [rowKeys, rows])
  ```

#### [89] 🟡 Medium — CSV export materializes the full sorted row model into a string synchronously on the main thread

- **Where:** `packages/ui/src/modules/grid/grid-data.tsx`:751-764 (rowsToCsv grid-export.ts:48-58, exportValue 30-34) · _not hot path_ · _unbatched O(rows*cols) work on main thread_
- **Impact:** On export click the entire filtered/sorted row set is mapped to originals, then rowsToCsv builds header+body via nested map/join with a per-field escape regex (grid-export.ts:14) over rows*columns, plus exportValue per cell with no caching. For tens of thousands of rows this blocks the UI thread and holds the whole CSV string + Blob in memory at once. Per-click, not per-render, but a hard UI freeze at scale.
- **Fix:** Chunk the serialization across yields (process row batches with await/scheduler or a Web Worker) and/or stream into the Blob incrementally rather than building one giant string, so export does not freeze the thread on large datasets.

  ```tsx
  rowsToCsv(visibleColumns, table.getSortedRowModel().rows.map((modelRow) => modelRow.original))  // then nested map/join + per-field regex test
  ```

### Import graph & coupling
*12 candidates — 🔴 1 · 🟠 4 · 🟡 5 · ⚪ 2*

#### [90] 🔴 Critical — Per-cell truncation hook fires a forced-layout measure after EVERY commit with no dependency array, multiplied across all visible cells

- **Where:** `packages/ui/src/modules/grid/use-grid-truncation.ts`:76 (measure), 34-46 (isOverflowing) · _hot path_ · _layout-thrash_
- **Impact:** Mounted per truncated data cell and per header title (grid-row.tsx:339). With no dep array the layout effect re-runs measure() on every commit of every mounted cell, and on the sub-pixel path isOverflowing() builds a Range and calls getBoundingClientRect() twice, forcing synchronous reflow. With N visible cells this is N forced reflows per grid re-render; during a drag-resize (GridData re-renders continuously) or fast virtualized scroll (each newly windowed cell also installs a fresh ResizeObserver at line 87-89) this is the dominant layout-thrash path. Scales with visible_cells = windowed_rows x visible_columns.
- **Fix:** Gate the measure: only re-measure when the cell's content or width actually changed. Pass a dep (e.g. the formatted text + a resize tick) to useLayoutEffect, or measure only inside the ResizeObserver/fonts-ready callbacks plus a one-shot mount measure. Batch reads across cells (single rAF measuring pass) to avoid interleaved read/write reflow, or share one ResizeObserver across cells instead of one-per-cell.

  ```tsx
  useLayoutEffect(measure)  // no dep array; measure -> isOverflowing -> document.createRange() + range.getBoundingClientRect().width - el.getBoundingClientRect().width
  ```

#### [91] 🟠 High — No debounce on global search: every keystroke triggers a synchronous full re-filter over all rows x columns

- **Where:** `packages/ui/src/modules/grid/use-grid-table.ts`:426 · _hot path_ · _per-keystroke_
- **Impact:** GridFilter calls filter.setValue on every onChange (grid-filter.tsx:24) with no local input state or debounce; setValue forwards straight to table.setGlobalFilter. TanStack's includesString global filter (grid-table-options.ts:206) lowercases and scans every cell's stringified value across the entire row set on each filter-state change, then renderRows/rowKeys/rowIndexMap rebuild and the whole body re-renders. For large client-side datasets typing visibly lags: O(rows x columns) re-filter per keystroke.
- **Fix:** Hold the input value in local component state for immediate echo and debounce (e.g. 150-250ms) before calling table.setGlobalFilter, or wrap the filter apply in React's startTransition so typing stays responsive while the filtered model recomputes off the urgent path.

  ```tsx
  setValue: (value: string) => table.setGlobalFilter(value),
  ```

#### [92] 🟠 High — Editable history priorValue does rows.findIndex per change; combined with applyCellWrite column fan-out it is O(N^2) on select-all + type

- **Where:** `packages/ui/src/modules/grid/use-grid-editable-history.ts`:64 · _hot path_ · _bulk-edit_
- **Impact:** emit() maps priorValue over every change in a batch (line 77), and priorValue scans the full rows array per change (plus an editableCols.find per change at line 58). A column-fill across a multi-row selection or a matrix paste emits K changes => O(N*K). applyCellWrite (use-grid-editable-mutations.ts:92-96) fans a single Enter across all selected rows by walking ALL rows, producing K~=N changes for select-all; the two together make one Enter on a 10k-row select-all O(N^2). A rowKey->index map already exists (rowIndexMap, use-grid-editable-rows.ts) but is not reused here.
- **Fix:** Pass the existing rowIndexMap (or a Map<rowKey,index>) into the history hook and replace findIndex with an O(1) Map.get keyed by change.rowKey; likewise replace editableCols.find with a Map<columnId,col>. In applyCellWrite, derive selected-row indices from the selection Set rather than scanning currentRows.

  ```tsx
  const index = rows.findIndex((row, i) => getKey(row, i) === change.rowKey)
  ```

#### [93] 🟠 High — TanStack state object rebuilt fresh every GridData render, forcing engine state reconciliation on every parent re-render

- **Where:** `packages/ui/src/modules/grid/grid-table-options.ts`:289 · _hot path_ · _engine-churn_
- **Impact:** buildState returns a brand-new state object literal on every GridData render and is handed to useReactTable. Even when nothing changed, TanStack receives a new state reference and must re-run its state-change detection each render. This is the central per-render cost multiplier for the engine and compounds with any frequently re-rendering parent: drag-resize with columnResizeMode 'onChange' (continuous re-render), rapid search/filter typing, cursor moves that bubble a parent render. It interacts with renderRows reallocation and the per-render pagination view.
- **Fix:** Memoize the assembled state object on its actual slice dependencies (pagination, sizing, globalFilter, columnFilters, sorting, columnPinning, rowSelection, columnOrder, columnVisibility) so identity is stable when no slice changed, letting TanStack skip reconciliation on incidental parent re-renders.

  ```tsx
  const state: GridControlledState = { columnOrder: args.columnOrder, columnVisibility: args.columnVisibility }  // new literal every render, fed to useReactTable
  ```

#### [94] 🟠 High — renderRows reallocated every render when paginated/client-transformed, busting all downstream memos keyed on it

- **Where:** `packages/ui/src/modules/grid/use-grid-table.ts`:386-389 · _hot path_ · _engine-churn_
- **Impact:** When pagination or any client transform is active this maps the full page/filtered set into a NEW array every GridData render even though the underlying rows are unchanged, and even under virtualization (it maps the whole page, not the window). The new reference invalidates every memo keyed on renderRows each render: rowKeys (grid-data.tsx:705), rowIndexMap (grid-data.tsx:716, an O(rows) Map rebuild), and the body row list. So every incidental re-render repeats O(rows) work plus cascading memo busts.
- **Fix:** Cache renderRows by the engine row model's identity: only re-map when table.getRowModel() (or its rows reference) actually changes, e.g. useMemo over the row-model reference, so a parent re-render that didn't change data/sort/filter/page reuses the same array and the downstream rowKeys/rowIndexMap memos hold.

  ```tsx
  const renderRows = table.getRowModel().rows.map((modelRow) => modelRow.original)
  ```

#### [95] 🟡 Medium — toRowSelectionState rebuilds a full object over the entire selection Set on every selection change, feeding engine state churn

- **Where:** `packages/ui/src/modules/grid/use-grid-table.ts`:329 · _not hot path_ · _large-selection_
- **Impact:** toRowSelectionState (grid-table-options.ts:51-61) iterates the entire selection Set building { [id]: true }. selection is a new Set on every toggle, so select-all of thousands allocates an O(selected) object on each selection mutation, and that new object feeds buildState, compounding TanStack reconciliation. Each single-row toggle in a large selection rebuilds the whole map.
- **Fix:** Maintain the RowSelectionState incrementally alongside the Set (add/remove single keys on toggle), or only mirror selection into the engine when a feature actually reads getSelectedRowModel; the grid already treats the Set as source of truth for checkboxes.

  ```tsx
  const rowSelection = useMemo(() => toRowSelectionState(selection), [selection])
  ```

#### [96] 🟡 Medium — allSelected/someSelected are unmemoized O(rows) Set scans on every Grid render

- **Where:** `packages/ui/src/modules/grid/use-grid-selection.ts`:59-61 · _not hot path_ · _large-selection_
- **Impact:** Both scan rowKeys on every Grid render with no memoization. someSelected gates the batch-actions toolbar (grid-data.tsx:958). For large page sizes and frequent re-renders (typing in the global filter, cursor moves that bubble a parent render, any selection toggle) this is repeated O(rows) work on each render. allSelected.every short-circuits but someSelected.some still walks until a hit.
- **Fix:** Memoize both on [rowKeys, selection]; or derive from counts: allSelected = selection covers every rowKey can be tracked as selectedOnPageCount === rowKeys.length, and someSelected = selectedOnPageCount > 0, maintained incrementally so no per-render scan is needed.

  ```tsx
  const allSelected = rowKeys.length > 0 && rowKeys.every((rk) => selection.has(rk))
  	const someSelected = rowKeys.some((rk) => selection.has(rk))
  ```

#### [97] 🟡 Medium — compareSmart runs regex-heavy numeric parsing per operand per comparison during client sort, no precomputed sort key

- **Where:** `packages/ui/src/modules/grid/grid-sorting-utilities.ts`:45 (parseNumeric), 99-114 (compareSmart) · _not hot path_ · _client-sort_
- **Impact:** compareSmart calls compareNumeric, which calls parseNumeric on BOTH operands; parseNumeric runs three .replace regex passes plus a DECIMAL.test per value. A client sort of N rows performs ~O(N log N) comparisons, so the same cell values are re-parsed O(log N) times each with no memoization. On wide/large datasets sorting is visibly costly versus parsing once.
- **Fix:** Precompute a typed sort key per cell once before sorting (Schwartzian transform): map each value to {num, str, empty} once (O(N)), then compare the precomputed keys (O(N log N) cheap comparisons). Cache parseNumeric results per column value.

  ```tsx
  const cleaned = body.replace(CURRENCY, '').replace(NUMERIC_NOISE, '').replace(/%$/, '')  // ... DECIMAL.test(cleaned) ... called for both a and b per comparison
  ```

#### [98] 🟡 Medium — getVisibleCells() called per rendered row on every GridData render; O(rows x cols) on the unvirtualized large-row path

- **Where:** `packages/ui/src/modules/grid/grid-row.tsx`:97 · _hot path_ · _per-row_
- **Impact:** renderGridRow resolves the cell array from the engine per rendered row on every GridData render. The GridRow memo absorbs the React reconciliation, but the cells array is computed before the memo can compare. For a non-virtualized grid with thousands of rows paired with frequent state changes (typing in search) this is O(rows x columns) engine work each render. Virtualization bounds it to the window, so the concern is specifically the unvirtualized large-row configuration.
- **Fix:** Encourage/require virtualization for large row counts, or hoist the cells-array resolution so it is memoized per row key against the engine's row-model version and only recomputed when visibility/order/pinning/sizing actually change, rather than every parent render.

  ```tsx
  cells={props.table.getRow(String(key)).getVisibleCells()}
  ```

#### [99] 🟡 Medium — GridData context value embeds the selection Set, so every selection toggle re-renders all header cells via useGrid()

- **Where:** `packages/ui/src/modules/grid/grid-data.tsx`:766-768 · _not hot path_ · _selection-fanout_
- **Impact:** The shared context value includes selection, whose identity changes on every toggle. Every GridHeaderCell calls useGrid() (grid-head.tsx:162), so each selection change re-renders all header cells (they then bail at the memoized GridColumnHeader children, but the parent header cells still re-render). The head only needs allSelected/someSelected/toggleAll, not the raw Set; embedding the Set couples header re-renders to per-row selection churn.
- **Fix:** Split selection out of the head-facing context. Expose only allSelected/someSelected/toggleAll to headers via the context; keep the raw selection Set in a separate provider consumed only by the body/checkbox cells, so a row toggle does not invalidate the header context value.

  ```tsx
  const context = useMemo(() => ({ selection, toggleRow, toggleAll, allSelected, someSelected, sort, ... }), [ selection, ...
  ```

#### [100] ⚪ Low — Import graph is clean: no circular dependencies, shallow depth, no heavy barrel coupling into the per-row path

- **Where:** `packages/ui/src/modules/grid/index.ts`:1-60 · _not hot path_ · _import-graph_
- **Impact:** analyze_import_graph reports 57 files, 179 imports, max depth 4, 0 circular dependencies. The barrel (index.ts) is overwhelmingly type re-exports (erased at build) plus value exports gated behind component entry points; it does not pull a heavy dep into per-row rendering. The most-imported runtime module, grid-constants.ts (fan-in 6), is pure scalars. The shared style module recipes/kata/grid.ts ('k') resolves to static precomputed className strings, not per-cell runtime work. No tree-shaking-defeating or fan-in-amplified re-render hazard exists at the module-graph level; the real scaling costs are intra-module hot paths (below), not coupling.
- **Fix:** No import-graph remediation needed. Direct optimization effort at the per-row/per-cell hot paths and the engine state churn rather than restructuring the module graph.

  ```tsx
  export type { GridCellMenu, GridCellMenuContext, GridColumn, ... } from './types'  // 0 cycles, max depth 4 reported by analyzer
  ```

#### [101] ⚪ Low — CSV export materializes the full sorted row model and builds the entire string synchronously on the main thread

- **Where:** `packages/ui/src/modules/grid/grid-export.ts`:48-58 (rowsToCsv), 53-54 (per-field escape) · _not hot path_ · _export-blocking_
- **Impact:** On export click, grid-data.tsx materializes table.getSortedRowModel().rows.map(original) (all filtered/sorted rows) and rowsToCsv builds header+body via nested map/join with a per-field regex test (escapeCsvField, line 14) over rows x columns, holding the whole CSV string plus a Blob in memory at once. For tens of thousands of rows this blocks the UI thread; no chunking, streaming, or yielding. Cost is per-click, not per-render, hence low severity, but it freezes the tab on large exports.
- **Fix:** Stream/chunk the CSV build: serialize in row batches yielding to the event loop (or in a Web Worker), and assemble the Blob from chunks (or a ReadableStream) so the main thread stays responsive during large exports.

  ```tsx
  const body = rows.map((row) => dataColumns.map((column) => escapeCsvField(csvCellText(exportValue(column, row)))).join(','))
  ```
