# Grid module — code-quality audit

The Grid module (`packages/ui/src/modules/grid`, 57 files, ~9,464 LOC, 358
functions, mid-migration to `@tanstack/react-table`) is in good health. It
passes the real lint/type gate clean, carries zero `any`/`@ts-ignore`, decomposes
its complex logic deliberately to stay within stated complexity budgets, and its
React render discipline (memoized rows/headers, stabilized callbacks, a memoized
context value, correct virtualization) is sound. Most of the static-analyzer
output is false-positive noise (see the reliability appendix); the genuine
findings are a small set of concrete items, the most actionable being a missing
per-cell render memo and a missing `aria-selected` on selectable rows. There are
**no critical (data-loss / crash) defects** — severities top out at `high`.

This audit was produced with the `code-quality` MCP server's seven analyzers,
then every flagged item was verified against the source (and the real gate run,
since the MCP `check_style` silently no-op'd). Four complementary lenses the
analyzers structurally can't see — correctness/hooks, render performance,
accessibility, public API & type safety — were run over the real code.

## Methodology

| Step | Tool / lens | Result |
|------|-------------|--------|
| Size overview | `code_metrics` | 57 files, 9,464 LOC, 42.8% comment ratio, 0 classes |
| Complexity | `analyze_complexity` | avg CC 2.33 / Cog 1.72; ~12 hotspots, mostly essential or mislabeled |
| Anti-patterns | `detect_antipatterns` | 88 raw flags — overwhelmingly tool artifact (see appendix) |
| Dead code | `find_dead_code` | 2 flags, both false positives |
| Duplication | `find_duplicates` | 0% — clean |
| Imports | `analyze_import_graph` | 0 circular deps, max depth 4 |
| Style | `check_style` | **no-op** ("basic" fallback) — superseded by the real gate below |
| Real gate | `biome check` + `tsc --noEmit` (CLAUDE.md §3.4) | **CLEAN: 0 lint issues across 57 files, 0 type errors** |
| Lenses | correctness · performance · a11y · API/types (source reads) | findings below |

## Findings by severity

Confirmed and needs-judgment findings only (tool artifacts are in the appendix).

| Sev | Area | File:line | Issue | Effort |
|-----|------|-----------|-------|--------|
| **high** | a11y | grid-row.tsx:206 | Selectable rows never emit `aria-selected` | small |
| **high** | perf | grid-row.tsx:323 | `GridDataCell` not memoized — cells re-render with any row re-render | small |
| medium | a11y | table-header.tsx:27 · grid-head.tsx:83 | No explicit `role="row"`/`rowgroup`/`columnheader` under `role="grid"` | medium |
| medium | correctness | grid-editable-context.ts:70 | `useGridEditableCellSlice` mutates a ref during render (`getSnapshot` side effect) | medium |
| medium | a11y | grid-data.tsx:392 | Busy live-region never announces completion or row-count changes | small |
| medium | a11y | grid-head.tsx:368 | Sort activation announces nothing (relies solely on `aria-sort`) | small |
| medium | api | grid-data-types.ts:62 | `GridSelection.onValueChange` payload needlessly nullable | trivial |
| medium | cohesion | grid-data.tsx:173 | Extractable sort-state machine buried in the orchestration hub | small |
| medium | cohesion | grid-data.tsx:462 | Extractable menu-actions + pin-override unit | small |
| medium | complexity | grid-table-options.ts:128 | `toColumnDef` accidental complexity (the real owner of the `autoRemove` flag) | small |
| medium | correctness | use-grid-editable-history.ts:73 | History inverse collides if one batch writes a cell twice (latent) | small |
| medium | perf | grid-body.tsx:27 · grid-head.tsx:71 | Body/head components unmemoized; re-render on every `GridData` render | medium |
| low | correctness | use-grid-column-fit.ts:109 | `enabled` gates auto-fit but not the exposed `sizeToFit()`/`applyFit()` | small |
| low | correctness | use-grid-editable-wrapper.ts:124 | `data-row-index`→`rowsRef` indexing unguarded vs. future pagination | small |
| low | correctness | use-grid-editable-wrapper.ts:577 | `onWrapperBlur` allocates a new `Set` every blur | trivial |
| low | a11y | grid-head.tsx:419 | Resize separator omits `aria-valuetext` | trivial |
| low | api | index.ts:16,33 | Boolean/text editors exported without a paired `…Props` type | trivial |
| low | api | grid-data-types.ts:101 · :246 | Several public type members lack TSDoc (CLAUDE.md §3.5) | small |
| low | perf | grid-row.tsx:218 | Inline `onClick`/`onKeyDown` closures per row (inside the memo boundary) | trivial |
| low | complexity | grid-data.tsx:185 | `nextSort` optional two-axis extraction | small |
| low | magic-num | grid-pagination-utilities.ts:8 · use-grid-truncation.ts:6 | A few genuinely unhoused literals | trivial |
| low | cohesion | grid-head.tsx:386 | Optional: extract `GridColumnResizeHandle`; group pure resolvers | small |

## Detailed findings

### Accessibility

**Selectable rows never emit `aria-selected` (high).** `GridRowImpl`
(`grid-row.tsx:206`) renders `<TableRow data-selected={dataAttr(selected)} …>` and
drives the checkbox `checked`, but never sets `aria-selected` on the `<tr>`. The
only `aria-selected` writes in the module are the editable grid's *cell-range*
selection (`grid-editable-cell.tsx:74`). A screen-reader user toggling a row
checkbox hears the checkbox flip but the row's selected state is never announced,
and in a `role="grid"` (navigable) grid `aria-selected` on rows is expected. Set
`aria-selected={selectable ? selected : undefined}` (only when the grid has a
selection column, to avoid asserting selectability on non-selectable grids), and
set `aria-multiselectable` on the navigable selectable grid root as the editable
grid already does.

**No explicit ARIA roles under `role="grid"` (medium, needs SR validation).**
When the table is promoted to `role="grid"` (navigable/editable), data cells get
explicit `role="gridcell"` (`use-grid-navigation-columns.tsx:121`), but the `<th>`
headers get no `role="columnheader"`, `<tr>` no `role="row"`, and
`<thead>`/`<tbody>` no `role="rowgroup"`. The ownership chain a grid widget
requires (grid → owns rows → own gridcells/columnheaders) is therefore *mixed*:
some links explicit, some relying on native `<table>`→grid remapping, which is
inconsistent across assistive tech. Thread the grid-semantics flag into
`GridHead`/`TableRow`/`TableHead`/`TableBody` and set the matching roles. Validate
with a real screen reader before/after — if native remapping proves sufficient on
the true `<table>` element, this drops to low.

**Busy live-region is one-directional (medium).** `GridBusyStatus`
(`grid-data.tsx:392`) renders `<span role="status" class="sr-only">{loading ?
'Loading' : ''}</span>`. It announces "Loading" on load start and pairs with
`aria-busy` (`resolveTableProps`, grid-data.tsx:310) — but on completion it clears
to `''` (announces nothing — neither "loaded" nor the row count), and nothing is
announced when filter/search/sort/pagination changes the visible row count. For a
data grid those state-change announcements are the live region's main value.
Announce a debounced result summary on completion and on row-count change.

**Sort activation is silent (medium).** The sort toggle (`grid-head.tsx:368`) keeps
the accessible name `"Sort by {column}"` regardless of direction, and there is no
live-region announcement; only `aria-sort` on the `<th>` (`:486`) updates, so a SR
user hears nothing until they re-navigate to re-read it. Reflect direction in the
button name (", sorted ascending/descending/not sorted") or announce through the
busy region.

**Resize separator omits `aria-valuetext` (low).** `grid-head.tsx:419` sets
`aria-valuenow/min/max` correctly; AT announces a bare number ("220") on Arrow
nudge. Add `aria-valuetext={`${px} pixels`}`.

*Confirmed correct:* the table-vs-grid role switch (`role="grid"` only with a
cursor; `role="table"` + `aria-rowcount`/`aria-colcount` under
virtualize/paginate; native `<table>` otherwise — `resolveTableProps`,
grid-data.tsx:289), page/window-aware `aria-rowindex`/`aria-colindex`
(grid-virtualized-body.tsx:51), keyboard-operable `role="separator"` resize
handles, **keyboard column reordering** (pointer + `KeyboardSensor` with
`sortableKeyboardCoordinates` via `useSortableList`/`use-sortable-sensors.ts:29`),
accessible names on every icon-only control (filter/pin/sort/reorder/resize/
checkboxes), and editable-cell focus management (focus-on-mount, return focus on
commit/cancel, portal-aware blur, `role="alert"` validation). The three headline
ROADMAP a11y claims hold.

### Correctness & React hooks

The editable core is carefully built — the ref-mirroring pattern (reactive state +
`stateRef.current = state` each render) is applied consistently so event-time reads
see live values, the `useControllable` seam handles the controlled↔uncontrolled
flip correctly, and the draft/commit lifecycle (`use-grid-editable-draft.ts`) is
sound (the riskiest flow, and it correctly handles Enter-then-blur double-commit
guards and lossy-format round-trips). Navigation, mutations fan-out, and the
augmented-columns ref-through-render are correct.

**`useGridEditableCellSlice` mutates a ref during render (medium).** `select`
(`grid-editable-context.ts:70`) is passed to `useSyncExternalStore` as both
`getSnapshot` and `getServerSnapshot`, and writes `cacheRef.current = next` on a
cache miss (`:94`). `getSnapshot` must be pure; under concurrent rendering an
aborted/replayed render can leave `cacheRef` holding a slice that was never
committed, so the next real snapshot compares against a phantom `prev` and may
return a stale cached object — a cell that fails to re-render when its `inRange`
flips. The shared `getServerSnapshot` also risks an SSR/hydration mismatch.
Memoize the slice via the store's snapshot identity (cache inside the store) rather
than a render-time ref write, and give `getServerSnapshot` a stable constant
default.

**History inverse collides on duplicate-cell batches (medium, latent).**
`emit` (`use-grid-editable-history.ts:73`) computes the inverse as
`changes.map(priorValue)`, reading the current live value per change. Today each
batch targets distinct cells, but a paste matrix whose target rows resolve to
duplicate `(rowKey, columnId)` keys would have both inverses read the same
pre-write value, so a redo double-applies. De-duplicate `changes` by
`(rowKey, columnId)` (last-write-wins) before stacking and assert the invariant.

**`useGridColumnFit` exposes an ungated write path (low).** `enabled = resizable
&& !controlled` gates the automatic `ResizeObserver` fit (`use-grid-column-fit.ts:98`),
but the exposed `sizeToFit()`→`applyFit()` (`:109`,`:80`) has no `enabled` guard and
calls `table.setColumnSizing` directly. On a controlled grid this still routes
through TanStack's `onColumnSizingChange` (so it emits to the consumer rather than
silently desyncing), but it contradicts the intent that a controlled grid manages
its own sizing. Early-return from `applyFit`/`sizeToFit` when `!enabled` for
consistency, or withhold the "Auto-size columns" action when controlled.

**Unguarded display-index→`rowsRef` assumption (low).** The TBODY checkbox bridge
(`use-grid-editable-wrapper.ts:124`) validates `data-row-index` against
`rowsRef.current.length`, where `data-row-index` is a display position and
`rowsRef` holds the consumer `rows`. These are equal today because `GridEditable`
forwards no `pagination`/client filter, so display order === `rows`. Pin the
invariant with a comment; if `GridEditable` ever gains client-side pagination,
navigation must index through the engine row model.

**`onWrapperBlur` allocates every blur (low).** `use-grid-editable-wrapper.ts:577`
calls `setExtraCells(new Set())` unconditionally on blur, triggering a navigation
snapshot change + store notify even when extras are already empty. Guard with
`.size > 0` as the sibling `clearSelection` (`:235`) already does.

*Confirmed correct:* `useControllable` functional-updater chaining and
controlled→`undefined` resolution; `moveActiveTo`/`addCellToSelection` empty
dep-arrays (they read stable refs); the draft commit/blur race via
`draftRef`/`sessionClosedRef`.

### Render performance

Overall good. The per-row component is `memo(GridRowImpl)` (`grid-row.tsx:303`),
both header-cell variants are memoized, the `GridContext` value is `useMemo`'d over
a complete dep list (`grid-data.tsx:766`) with all its callbacks stabilized
(`useStableRowClick`, `pinColumn`, `toggleSort`), data rows read selection via
props rather than context (so a selection flip doesn't cascade through context),
`useVisibleColumns` returns the previous array reference when contents are
element-wise unchanged (`grid-table-views.ts:183`), `useStableColumnDefs` keeps
cell-renderer identity stable (avoiding cell remounts/focus loss), virtualization
options are stabilized, measurement happens in effects/observers (no layout thrash
in render), and CSV export builds lazily on click.

**`GridDataCell` is not memoized (high).** `GridRow` is memoized but the cell it
maps is a plain function (`grid-row.tsx:323`) — contrast the memoized
`GridReorderableCell` (`:388`) and `GridColumnHeader` (`:448`). Because
`GridRowImpl` maps its cells inline, whenever a row *does* re-render (selection,
truncate, pinning, any prop change) every cell re-runs `flexRender` and
`col.cellProps?.(row)`. The row memo protects a stable row, but offers nothing
inside a row that re-renders; cost scales rows×cols. Wrap `GridDataCell` in `memo`
(its inputs — `cell`/`col`/`row`/`pinning` — are already largely stable via
`useVisibleColumns` and the engine row). This also bounds the per-cell
`cellProps`/`cellTooltip`/inline-`style` work (the related low-severity items)
to cells whose inputs actually changed.

**Body/head components unmemoized (medium).** `GridBody` (`grid-body.tsx:27`),
`GridVirtualizedBody` (`grid-virtualized-body.tsx:25`), and `GridHead`
(`grid-head.tsx:71`) are plain functions, so any `GridData` state change re-runs
`rows.map(...)` / `virtualItems.map(...)` and re-calls `getVisibleCells()` per row.
The row memo absorbs the DOM cost, so this is mostly reconciliation/JS overhead —
bounded for a virtualized window, but O(rows) for a large non-virtualized grid on
every state change. Consider memoizing `GridBody` if profiling flags it; lower
priority than the cell memo.

### Public API & type safety

Zero `: any`, zero `@ts-ignore`/`@ts-expect-error`. The casts that exist are
benign, localized TanStack-boundary adapters (row-shape erasure to `unknown`,
`String(id)` keying, augmented `ColumnMeta`) and are commented. The `GridProps<T>`
discriminated union (`grid.tsx:23`) is sound and exhaustively narrowed; the
module's `switch` statements are over `event.key` strings with explicit `default`
arms, so union exhaustiveness is not a concern.

**`GridSelection.onValueChange` payload needlessly nullable (medium).**
`onValueChange?: (selection: Set<…> | undefined) => void` (`grid-data-types.ts:62`)
is the only binding whose payload is nullable — every sibling
(`GridSort`/`GridSearch`/`GridPagination`/`GridColumnSizing`/`GridColumnFilters`/
`GridColumnOrder`) emits non-null. The implementation already coalesces
(`onValueChange?.(next ?? EMPTY_SELECTION)`, `use-grid-selection.ts:38`), so the
`undefined` arm is dead and forces consumers to handle a value they can never
receive. Narrow the type; no runtime change needed.

**Editor export asymmetry (low).** `index.ts` exports `GridEditableBooleanEditor`
(`:16`) and `GridEditableTextEditor` (`:33`) as bare values while the
currency/number/date/select editors each export a paired `…Props` type. Defensible
(both consume the exported `GridEditableEditorProps<T>`) but an ergonomic
inconsistency. Add the alias or document the shared contract.

**TSDoc gaps on public members (low, CLAUDE.md §3.5).** The visibility triple on
`GridColumnManagerConfig` (`grid-data-types.ts:101` — including the off-pattern
`onHiddenChange` name) and several `GridDataProps` members (`rowClassName` `:246`,
`maxHeight` `:270`, `rowLoading`, `className`) carry no TSDoc. Add one-line docs;
note why the visibility binding uses `hidden`/`onHiddenChange` rather than the
`value`/`onValueChange` convention.

### Complexity

Average complexity is low (CC 2.33 / Cog 1.72) and the hotspots are localized and
mostly *essential* — the smart comparators (`parseNumeric`, `compareSmart`,
`grid-sorting-utilities.ts`) are already flat guard-clause/strategy-dispatch form,
and `commitEdit` is already decomposed into `validateCommit`/`applyCommit`/
`advanceCursor` to stay within budget. The one genuinely accidental item:

**`toColumnDef` conditional-spread density (medium).** The `autoRemove` flag
(CC=15/Cog=27) is misattributed — `grid-table-options.ts:115` is a one-line arrow;
the complexity belongs to `toColumnDef` (`:128`), whose 52 lines are dense with
conditional spreads (`...(accessorFn ? … : {})`, four sizing spreads, ternary
`sortingFn`). Most is essential (each spread maps one grid capability to one engine
option), but extracting `deriveColumnBehavior(col): { accessorFn, sortingFn,
filterFn }` would flatten the returned object literal.

**`nextSort` two-axis cycle (low, optional).** Cog=18 (`grid-data.tsx:185`) is
genuine domain logic (Shift-additive vs. plain tri-state). Don't flatten to a
lookup (transitions depend on `existing.direction` and `current.length`), but the
additive and plain branches can be extracted to `foldAdditive`/`collapseToColumn`
for a two-line body.

### File size & cohesion

`grid-head.tsx`, `use-grid-editable-wrapper.ts`, `use-grid-table.ts`,
`grid-context-menu.tsx`, and `grid-row.tsx` are all cohesive single-concern files
whose length is intrinsic (a header cell *is* a wide-prop component; a keyboard
router *is* a long flat switch) — leave them. Their large component "parameter"
counts are a tool artifact (destructured props). The one file genuinely doing two
jobs is the hub:

**`grid-data.tsx` (987 LOC) bundles extractable units (medium).** Two clean,
testable seams should move out: (1) the **sort-state machine** — `EMPTY_SORT`,
`nextSort`, `useGridSort` (`grid-data.tsx:173`–237, one `useControllable`
dependency, `nextSort` pure) → `grid-sort-state.ts` (distinct from the *value*
comparators in `grid-sorting-utilities.ts`); (2) the **menu-actions + pin-override
unit** — `useGridMenuActions`, `DEFAULT_CONTEXT_MENU`, and the pure
`applyPinOverrides`/`PinSide`/`PinOverrides` (`:462`–542, plus `:140`–171) →
`grid-menu-actions.ts`. The `GridData` body that remains is irreducible hook
composition — do not decompose further. Optional follow-ups (low): group the pure
prop-resolvers (`resolveVirtualization`/`resolveTableProps`/`resolveGridSemantics`,
already extracted *functions*, `:252`–460) into `grid-data-resolvers.ts`, and lift
the self-contained `GridColumnResizeHandle` (`grid-head.tsx:386`) into its own file.

### Magic numbers

`grid-constants.ts` is the constants module (its literals are *definitions* — a
false positive). The genuinely unhoused literals worth naming: the `0.01`
sub-pixel overflow epsilon (`use-grid-truncation.ts:6`), the page-window math
constants (`grid-pagination-utilities.ts:8,10,12`), and the `4` in
`grid-editable-date-editor.tsx:12`.

## Static-analyzer reliability appendix

This is the audit's most important meta-finding: a large fraction of the raw
`code-quality` output is false-positive for this codebase. Trust the tools as
*pointers*, not verdicts.

| Analyzer output | Reality |
|-----------------|---------|
| **deep-nesting: 46 errors**, depths up to 104 (`grid-table-views.ts:302`), flags pure type files (`types.ts:325` "28") | Counts brace/JSX/type-literal/object-literal depth, not control flow. Essentially all artifact; only the low (5–6) warnings merit a glance. |
| **magic-numbers** flags `grid-constants.ts:1,11,14,17,20` | That file *is* the named-constants module — the literals are the definitions. |
| **excessive-parameters**: `GridColumnHeader` "17 params", etc. | Counts destructured React props as parameters. The options-object it suggests is already in place. |
| **dead-code**: `GridEditableBooleanEditor`, `useGridSelection` | First is a public barrel export (`index.ts:16`); second is a test-covered convenience wrapper. Neither is dead. High-confidence dead-code count: 0. |
| **complexity**: `autoRemove` CC=15; `Commit` CC=8 | `autoRemove` is a one-line arrow (complexity is the adjacent `toColumnDef`); `Commit` (`grid-editable-editor-utilities.ts:4`) is a `type` alias with no body. High-CC/Cog=1 "switches" are readable flat dispatch tables. |
| **check_style**: "0 issues" | Silent "basic" no-op — ran no real linter. The actual gate (`biome check` + `tsc`) is clean, but the tool gave false assurance, not a real pass. |
| **import-graph**: 10 "orphan" files incl. `index.ts` | Files that only import across the directory boundary — not unused. |
| **find_duplicates**: 0% | Genuinely clean. |

## Remediation roadmap

**Quick wins (trivial/small, no structural risk):** narrow
`GridSelection.onValueChange` type (`grid-data-types.ts:62`); add `aria-selected`
to selectable rows (`grid-row.tsx:206`); wrap `GridDataCell` in `memo`
(`grid-row.tsx:323`); add `aria-valuetext` to the resize separator; guard
`onWrapperBlur`'s `Set` allocation; export the boolean/text editor `…Props` types;
add TSDoc to the listed public members; announce busy-completion / row-count in the
live region; name the three unhoused magic numbers.

**Structural (small/medium — surface the approach before doing, per CLAUDE.md §3.1):**
extract `grid-sort-state.ts` and `grid-menu-actions.ts` from `grid-data.tsx`;
extract `deriveColumnBehavior` from `toColumnDef`; add explicit `role="row"`/
`rowgroup`/`columnheader` under `role="grid"` (gate behind SR validation); fix the
`useGridEditableCellSlice` render-phase ref write; memoize the body/head components
if profiling warrants.

**Latent / by-design (guard, don't rush):** de-duplicate history batches by
`(rowKey, columnId)`; gate `useGridColumnFit.applyFit`/`sizeToFit` on `enabled`;
pin the `GridEditable` display-index↔`rows` invariant with a comment; reflect sort
direction in the control's accessible name; optional `grid-data` resolver grouping
and `GridColumnResizeHandle` extraction.

The accessibility items extend the ROADMAP's shipped "State & accessibility" work
(global `aria-rowindex`/`aria-colindex` is done; `aria-selected` + explicit roles
are the natural next layer). The cell-memo item sits under "Rendering &
performance". Neither conflicts with planned migration work.

---

**See also:** [`ROADMAP.md`](ROADMAP.md) · [`index.ts`](index.ts) (public surface).
*Audit date: 2026-06-27. All findings verified against source; the real
`biome check` + `tsc` gate passed clean.*
