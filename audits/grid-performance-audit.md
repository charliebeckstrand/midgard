# Grid Performance Audit

Performance audit of the `Grid` module (`packages/ui/src/modules/grid`), focused on the cost of rendering and interacting with large row sets. Companion to the existing [`grid-code-quality-audit.md`](grid-code-quality-audit.md) and [`grid-accessibility-audit.md`](grid-accessibility-audit.md).

## Scope and method

Fifty-five TypeScript/TSX files, ~9.7k LOC, built on a `@tanstack/react-table` engine (see [`ROADMAP.md`](../packages/ui/src/modules/grid/ROADMAP.md)). The module was audited across the five dimensions that dominate a data grid's performance, each by reading the actual code paths — not tool heuristics — and tracing prop/identity flow and DOM access:

1. **Per-row / per-cell render hot path** — the code that runs once per visible row and cell (`grid-row.tsx`, `grid-cell-content.tsx`, `grid-body.tsx`, `grid-virtualized-body.tsx`, `grid-head.tsx`), and the context boundaries that gate re-renders.
2. **Memoization of expensive setup** — `use-grid-table.ts`, `grid-table-options.ts`, `grid-table-views.ts`, the column-adapter and row-model hooks; every `useMemo`/`useCallback` dependency array was checked against the real identity of its inputs.
3. **Layout thrash and measurement** — `grid-column-measure.ts`, `use-grid-column-auto-size.ts`, `use-grid-truncation.ts`, `use-grid-navigation-columns.tsx`; every DOM read/write was inspected for interleaving (forced reflow) and for `ResizeObserver` feedback.
4. **Effects, listeners, and high-frequency interaction** — drag-resize, drag-reorder, scroll, cursor navigation; every `addEventListener`/effect dependency was read.
5. **Algorithmic / data-structure efficiency** — selection, sorting, filtering, export, pinning, allocation; every row-scaling loop was characterized against the data structure actually in use.

Findings are ranked by **verified** severity. Two claims that surfaced during the audit were investigated and **corrected** rather than reported (see [Corrected during verification](#corrected-during-verification)); an audit that asserts a hot path which does not exist is worse than one that omits it.

## Verdict

The module is high performance. The four traps that sink a data grid at scale — row-scaling membership tests, a re-parsing sort comparator, forced layout reflow during measurement, and unthrottled pointer listeners during drag — are each already engineered around, deliberately and correctly. There is **no P0 or P1 defect**. The row model is materialized lazily, cell identities are stable across selection/sort/cursor renders so memo boundaries hold, the autosizer is guarded against its own feedback loop, and every high-frequency interaction (scroll, resize, reorder, cursor) is either delegated to a well-behaved library or routed around React through refs, CSS variables, and an external store.

What remains is a small set of **bounded P2/P3 refinements**. The one with real leverage is the width of the `GridContext` consumed by every truncating cell: a column-resize gesture or a sort re-renders every visible cell, where it need only re-render on the cell's own data. Everything else is a per-interaction or one-shot constant-factor cost on the column axis, not the row axis.

## Strengths

These are the design decisions that make the module fast; they are load-bearing for the verdict and worth preserving through any refactor.

**The row model is lazy, and the core model is built once and memoized.** `use-grid-table.ts:412` materializes the sorted/filtered/paginated row array (`table.getRowModel().rows`) only when pagination or a client transform is active; a plain grid iterates the raw `rows`. The core row model is built once (cell rendering needs `Cell` objects) and memoized by the engine, so `row.getVisibleCells()` returns a **reference-stable** array across selection, sort, and cursor renders — churning only on a real column-def or visibility change. That stability is what lets the `GridRow`/`GridDataCell` memo boundaries actually hold.

**Per-row state is passed as a prop, never read from context.** `selected` is threaded into the memoized `GridRow` (`grid-row.tsx:114,146`), so a single row's selection flip re-renders only that row — a mid-set selection toggle does not cascade. `GridDataCell` is independently memoized (`grid-row.tsx:415`) so a row-level change does not re-run `flexRender` for every cell in the row.

**The sort comparator precomputes keys behind a `WeakMap`.** `grid-table-options.ts:127-159` decodes each cell's smart sort key (number / currency / date / natural-string detection) **once per sort** into a `WeakMap<Row, Map<col, SortKey>>`, and the comparator does pure field arithmetic. This converts the classic `O(n log n × parse)` trap into `O(n × parse + n log n)`, and the cache is GC'd with the row model.

**Selection is a `Set` with guarded scans.** `use-grid-selection.ts` declares `Set<string | number>`; membership is `selection.has(key)` (O(1)), `allSelected`/`someSelected` are memoized on `[rowKeys, selection]` with a `selection.size` short-circuit, and `toggleRow`/`toggleAll` use functional updaters against a `rowKeysRef` so their identity is stable through edits.

**Measurement reads before it writes, and the write is no-op-guarded.** Every measure loop in `grid-column-measure.ts` reads all geometry to completion before any write, so there is no read→write→read reflow per iteration. `use-grid-column-auto-size.ts:151-157` bails the `setColumnSizing` write when no pixel moved, and measurement is unclipped by the current column width (`grid-column-measure.ts:51-71,117-131`), so re-measuring after the autosizer writes yields the same profile — the two facts that together defeat the `ResizeObserver` feedback loop.

**High-frequency interaction is routed around React.** Drag-resize is TanStack's own handler; drag-reorder is `@dnd-kit`, with the per-frame translate written to a `--grid-col-x-{n}` CSS variable on the `<table>` (`grid-reorder.ts`, `grid-head.tsx`) so the body re-renders **twice per drag**, not per move. The cursor rides a `useSyncExternalStore` (`use-grid-navigation-columns.tsx:83-87`) so a keystroke re-renders only the two cells whose active flag flipped. Scroll is fully delegated to `@tanstack/react-virtual`. The module attaches **zero** `mousemove`/`pointermove`/`scroll`/`resize` listeners of its own, and a single shared `ResizeObserver` backs all truncation cells (`use-grid-truncation.ts:57-88`) rather than one per cell.

## Findings

### P2 — Every truncating cell subscribes to the wide `GridContext`, so a resize or sort re-renders all visible cells

`grid-cell-content.tsx:46` — `const { resizing } = useGrid()`. `GridCellContent` renders once per data cell whenever truncation is on (the default), and it reads the table-wide `GridContext`. That context's value (`grid-data.tsx:535-558`) bundles `resizing`, `allSelected`, `someSelected`, `sort`, and the toggle callbacks into one memoized object. A context read bypasses the enclosing `GridDataCell` memo: when the value's identity changes, **every visible truncating cell re-renders** and re-runs its `useGridTruncation` measure.

The blast radius is bounded by *which* primitives flip. A mid-set selection toggle does **not** change `allSelected`/`someSelected`, so it correctly does not cascade. But `resizing` flips at the start and end of every column drag-resize, and `sort` changes on every sort toggle — and each of those re-renders all N×M visible truncating cells, when the cell needs only `resizing` (and only to hold its tooltip closed during a drag, `grid-cell-content.tsx:63-66`). This is the single change with real leverage. Splitting `resizing` into its own narrow context — or an external-store slice, the pattern `GridNavCell` already uses for the cursor — would confine a resize/sort to the chrome that actually depends on it. Low risk; the value object is internal and already memoized per-field.

### P2 — The autosizer rebuilds its `ResizeObserver` and forces a full re-measure on every row-model change

`use-grid-column-auto-size.ts:178-197`. The `useLayoutEffect` that owns the `ResizeObserver` lists `rowsSig` in its dependencies (`:197`) and reads it in the body (`:186`), so any change to the row count or the first/last row id tears down the observer (`observer.disconnect()`), constructs and re-`observe()`s a new one, and calls `run(true)` — a forced re-measure that walks every column and, per auto-sized column, every body cell in the DOM (`grid-column-measure.ts:117-131`). The observer lifecycle does not depend on the row set; folding it into the same effect as the `rowsSig` re-measure trigger recreates it for no reason on page turns, filters, and sorts.

This is **not** a per-scroll-frame cost (see [Corrected during verification](#corrected-during-verification)) — `rowsSig` is derived from `table.getRowModel()`, which a virtual scroll does not change — so it fires only on user-paced data changes and the per-measure work is bounded to the visible window. Hence P2, not P1. The fix is to separate the observer-setup effect (deps `[enabled, run, containerRef]`) from a lightweight effect that re-measures on `rowsSig` without touching the observer.

### P2 — The reorder shift tears down and restarts a `motion` animation on every pointer-move of the dragged column

`grid-reorder.ts:135-154`. The dragged `<th>` re-renders on every pointer-move (`useSortable`'s `transform.x` changes per move, `grid-head.tsx:660`), and each render re-runs this `useLayoutEffect`: `controls.stop()` on the prior `animate()`, then a fresh `animate()`. For the actively-dragged column this takes the `instant` (`duration: 0`) branch, so it is a synchronous variable write — but it still allocates an `AnimationPlaybackControls` and re-enters motion's loop at pointer rate for the duration of the drag. The make-room shifts of *other* columns change `x` only at slot-crossing boundaries, so they spring correctly and infrequently; the churn is confined to the one dragged column. Writing the instant branch as a direct `table.style.setProperty(columnShiftVar(index), …)` would remove the per-move allocation.

### P2 — Cursor navigation recomputes sticky-column insets with O(cols) `getComputedStyle` per keystroke

`use-grid-navigation-columns.tsx:31-56`, invoked from the `GridNavCell` layout effect (`:99`) when a cell becomes active. `obscuringInsets` loops over every header cell, reading `getComputedStyle(headCell)` then `getBoundingClientRect()` per cell, to sum the sticky-header/pinned-column insets before a `scrollIntoView`. The reads precede the writes (no per-iteration thrash), but every arrow-key press pays an O(cols) style+layout recomputation. The insets change only on resize or pin, so memoizing them (invalidated on those events) lifts the work out of the keystroke path. Bounded by column count and per-interaction, so P2.

### P2 — `headerWidth` calls `getComputedStyle` once per column inside the measure loop

`grid-column-measure.ts:56-70`, called per data column from the `measureColumnIntrinsics` loop. Each column's header measurement reads `getComputedStyle(slot).columnGap` alongside the box reads. `columnGap` is invariant across columns of the same density, so it forces a style recalc per column for a value that could be read once per pass (or derived from a density-keyed constant). The loop is otherwise correctly batched reads; this is a constant-factor cleanup on the measure pass, not a reflow-per-iteration bug.

### P3 — Secondary, bounded, or by-design

- **`GridReorderableCell` re-renders all reorderable body cells twice per drag** via `GridReorderContext` (`grid-row.tsx:446`, provider `grid-data.tsx:129`). Deliberate and documented (`grid-row.tsx:428-436`) — the per-move glide rides a CSS variable; only the start/end lift flips the context. Worth revisiting only if reorder is paired with very large un-virtualized row counts.
- **The plain (non-virtualized) body maps the entire row set** (`grid-body.tsx:59`). By design — virtualization is opt-in via `virtualize`. `GridRow` is memoized so re-renders are cheap, but the initial/full render instantiates one row per datum; large datasets should set `virtualize`. The default-on autosizer measures only the rows in the DOM, so under `virtualize` it reads the window, not the full set (the off-screen-measurement gap the roadmap already notes).
- **`getResizeHandler` does an O(cols) header scan per column** (`grid-table-views.ts:272-276`: `table.getFlatHeaders().find(…)`), making handle wiring O(cols²) across a header row. Index headers by id once, or use `table.getColumn(id).getResizeHandler()`. Bites only at 100+ columns, header-only, never per row.
- **`document.fonts.ready.then(measure)` fires a one-shot O(visible-cells) measure burst** at font settle (`use-grid-truncation.ts:133-141`) — each cell runs `isOverflowing` (a `createRange` + `getBoundingClientRect`) in one microtask flush. One-time, ref-guarded; the shared observer handles the steady state.
- **`bodyContentWidth` allocates a `Range` per cell** (`grid-column-measure.ts:117-131`) to read the leaf's intrinsic width, though only the widest cell's value is used. Reads are batched (no thrash); the avoidable cost is the per-cell `createRange` when `scrollWidth` already settles the column.
- **`rowsToCsv` re-evaluates `column.value` truthiness per cell** (`grid-export.ts:53-54`). O(rows×cols) is irreducible for CSV; hoisting the accessor selection per column (`dataColumns.map(c => c.value ?? (r => r[c.id]))`) removes the per-cell branch. Marginal; matters only at 50k+ rows. `dataColumns` is already hoisted out of the row loop.

## Corrected during verification

Two assertions arose during the audit and were **disproven** by reading the engine's behavior; they are recorded so a later pass need not re-chase them.

**The autosizer re-measure does *not* fire per scroll frame.** `rowsSig` (`use-grid-column-auto-size.ts:89`) is computed from `table.getRowModel().rows` — the full post-sort/filter/pagination model. Under virtualization the body windows over that array via `useVirtualWindow` (`grid-virtualized-body.tsx:36-70`); scrolling updates the virtualizer's internal `virtualItems`, not the engine's row model, so `rowsSig` is invariant during a scroll. The P2 above fires on page/filter/sort changes only, which is why it is P2 and not a P1 scroll hot path.

**A plain grid is not allocation-free per row.** Cell rendering through `flexRender` requires the engine's `Cell` objects, so `renderGridRow` (`grid-row.tsx:107`) calls `table.getRow(key).getVisibleCells()`, which materializes the **core** row model (O(rows) `Row` objects) even when the *sorted* row array is not. This is inherent to rendering on the engine, and it is in fact the mechanism behind the stable-cell-identity strength — the model is built once and memoized. It is not a defect; the "lazy materialization" strength is specifically about the sorted/paginated array, not the core model.

## Benchmark coverage gap

The existing benchmarks (`packages/ui/src/__benchmarks__/grid.bench.tsx`) cover initial render at 100–10k rows, the selection column, the column-order memo, virtualized initial render, and re-render after a selection toggle. They do **not** exercise the path the top finding lives on: a **sort toggle** re-render or a **column-resize** re-render on a wide, truncating grid, which is precisely where the `GridContext` blast radius (P2) bites. Adding a "re-render after sort toggle (1,000 rows × truncating cells)" benchmark would make that finding measurable and guard any fix against regression.

---

**See also:** [`grid-code-quality-audit.md`](grid-code-quality-audit.md) · [`grid-accessibility-audit.md`](grid-accessibility-audit.md) · [`ROADMAP.md`](../packages/ui/src/modules/grid/ROADMAP.md) (Rendering & performance backlog).
