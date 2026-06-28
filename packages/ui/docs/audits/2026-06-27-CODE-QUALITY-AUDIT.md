# Grid Code-Quality Audit — `packages/ui/src/modules/grid`

**Date:** 2026-06-27 · **Scope:** the Grid module (57 files, ~9,464 LOC, 358
functions, mid-migration to `@tanstack/react-table`). **Method:** the
`code-quality` MCP server's seven analyzers, every flag verified against source,
plus the real Biome/tsc gate and four source-read lenses (correctness/hooks,
render performance, accessibility, public API & type safety). **Living record —
findings were remediated in a follow-up pass; each carries its status and commit.**

## Executive summary

The Grid module is in good health: it passes the real lint/type gate clean,
carries zero `any`/`@ts-ignore`, decomposes its complex logic deliberately, and
its React render discipline (memoized rows/headers, stabilized callbacks, a
memoized context value, correct virtualization) is sound. Most of the raw
static-analyzer output was false-positive noise (see the reliability appendix);
the genuine findings were a small set of concrete items. There were **no critical
(data-loss / crash) defects** — severities topped out at `high`.

Both high-severity items and nearly all the medium and low findings were resolved
in the follow-up pass (commits below), including the sort-state, menu-actions,
pin-override, and `deriveColumnBehavior` extractions. The explicit-ARIA-roles item
was re-examined and dropped as redundant (native table elements already carry the
grid-compatible implicit roles). What remains is a speculative body-memo (profile
first), an optional resolver/resize-handle split, and the sort-activation
announcement (deferred — it would deviate from the APG-standard `aria-sort` already
in place).

## Findings by severity

| Sev | Area | File:line | Issue | Status |
|-----|------|-----------|-------|--------|
| **high** | a11y | grid-row.tsx:206 | Selectable rows never emit `aria-selected` | ✅ RESOLVED `a641d5c` |
| **high** | perf | grid-row.tsx:323 | `GridDataCell` not memoized — cells re-render with any row re-render | ✅ RESOLVED `a641d5c` |
| medium | a11y | table-header.tsx:27 · grid-head.tsx:83 | No explicit `role=row/rowgroup/columnheader` under `role="grid"` | NOT A DEFECT (native roles suffice — see note) |
| medium | correctness | grid-editable-context.ts:70 | `useGridEditableCellSlice` mutates a ref during render | ✅ RESOLVED `7f8cc93` |
| medium | a11y | grid-data.tsx:392 | Busy live-region never announces completion or row-count | ✅ RESOLVED `e3031a7` |
| medium | a11y | grid-head.tsx:368 | Sort activation announces nothing (relies on `aria-sort`) | ◯ OPEN (by design — see note) |
| medium | api | grid-data-types.ts:62 | `GridSelection.onValueChange` payload needlessly nullable | ✅ RESOLVED `da61784` |
| medium | cohesion | grid-data.tsx:173 | Extractable sort-state machine buried in the hub | ✅ RESOLVED `aa4a7b4` |
| medium | cohesion | grid-data.tsx:462 | Extractable menu-actions + pin-override unit | ✅ RESOLVED `1946284` |
| medium | complexity | grid-table-options.ts:128 | `toColumnDef` accidental conditional-spread density | ✅ RESOLVED `cf15cf5` |
| medium | correctness | use-grid-editable-history.ts:73 | History inverse collides if one batch writes a cell twice | ✅ RESOLVED `3802721` |
| medium | perf | grid-body.tsx:27 · grid-head.tsx:71 | Body/head components unmemoized | ◯ OPEN (needs-judgment, profile first) |
| low | correctness | use-grid-column-fit.ts:109 | `enabled` gated auto-fit but not the exposed `sizeToFit()` | ✅ RESOLVED `b725750` |
| low | correctness | use-grid-editable-wrapper.ts:124 | `data-row-index`→`rowsRef` indexing unguarded vs. future pagination | NOT A DEFECT (already commented; no pagination path) |
| low | correctness | use-grid-editable-wrapper.ts:577 | `onWrapperBlur` allocates a new `Set` every blur | ◯ OPEN (negligible — see note) |
| low | a11y | grid-head.tsx:419 | Resize separator omits `aria-valuetext` | ✅ RESOLVED `9fc86c0` |
| low | api | index.ts:16,33 | Boolean/text editors exported without a paired `…Props` type | ✅ RESOLVED (documented) `438d741` |
| low | api | grid-data-types.ts:101 · :246 | Several public type members lack TSDoc | ✅ RESOLVED `438d741` |
| low | perf | grid-row.tsx:218 | Inline `onClick`/`onKeyDown` closures per row | NOT A DEFECT (inside the memo boundary) |
| low | complexity | grid-data.tsx:185 | `nextSort` optional two-axis extraction | ◑ PARTIAL (extracted to grid-sort-state.ts `aa4a7b4`; sub-split left as essential) |
| low | magic-num | grid-pagination-utilities.ts · use-grid-truncation.ts:6 | Unhoused literals | NOT A DEFECT (already named / intrinsic — see appendix) |
| low | cohesion | grid-head.tsx:386 | Optional: extract `GridColumnResizeHandle`; group pure resolvers | ◯ OPEN (optional) |

## Detailed findings

### Accessibility

**Selectable rows never emit `aria-selected` — ✅ RESOLVED `a641d5c`.**
`GridRowImpl` drove only `data-selected` and the checkbox `checked`. A `selectable`
flag (derived from the presence of a selection column) now gates `aria-selected`
on the `<tr>`; a grid with no selection column omits it. A true `role="grid"` with
selection also advertises `aria-multiselectable` (grid-only, so a windowed
`role="table"` or native table conveys selection through `aria-selected` alone).
Covered by new row-selection ARIA tests.

**No explicit ARIA roles under `role="grid"` — NOT A DEFECT (re-examined).**
Setting `role="grid"` on a `<table>` does not reset its descendants' implicit
roles, and the table elements' implicit roles are already the grid-compatible ones:
`<tr>` → `row`, `<th>` → `columnheader`, `<thead>`/`<tbody>` → `rowgroup`. The one
element whose implicit role (`cell`) is wrong for a grid is `<td>` → needs
`gridcell`, and the data cells already receive that via the navigation/editable
augmentation. So adding explicit `role=row/rowgroup/columnheader` would be redundant
— which is why the original finding hedged. Left as-is; the only residual edge is
the selection/actions `<td>`s reading as `cell` rather than `gridcell`, which ARIA
permits as a row child and which the keyboard cursor never traverses.

**Busy live-region — ✅ RESOLVED `e3031a7`.** `GridBusyStatus` announced "Loading"
on start but cleared to empty on completion. The polite status region now settles
(debounced) to a row-count summary ("N rows" / "1 row" / "No results"), announcing
both load completion and later filter/search/page result changes. Covered by new
busy-region tests.

**Sort activation announces nothing — ◯ OPEN (by design).** Evaluated and
deferred: reflecting sort direction in the sort button's accessible name broke ~25
assertions that treat the name as the stable action `Sort by X`, with state
conveyed by `aria-sort` on the `<th>` — the WAI-ARIA APG standard, already correct.
The non-standard name-coupling was reverted; a polite sort live-region remains a
possible future enhancement.

**Resize separator `aria-valuetext` — ✅ RESOLVED `9fc86c0`.** The handle now
exposes `aria-valuetext` ("220 pixels") alongside `aria-valuenow`, so Arrow-key
nudges announce a unit rather than a bare number.

*Confirmed correct (unchanged):* the table-vs-grid role switch, page/window-aware
`aria-rowindex`/`aria-colindex`, keyboard-operable `role="separator"` resize
handles, keyboard column reordering (pointer + `KeyboardSensor`), accessible names
on every icon-only control, and editable-cell focus management.

### Correctness & React hooks

**`useGridEditableCellSlice` render-phase ref write — ✅ RESOLVED `7f8cc93`.** The
selector (used as `useSyncExternalStore` get/getServerSnapshot) wrote its cache
through a ref during render — impure, and unsafe under concurrent rendering. It now
returns one of eight interned, frozen slices, so equal flags resolve to one stable
reference (the `Object.is` identity the store needs) with no render-time write.

**History inverse collides on duplicate-cell batches — ✅ RESOLVED `3802721`.**
`emit` now dedupes a batch to one last-write-wins entry per `(rowKey, columnId)`
(preserving first-seen order) before stacking and forwarding, so a paste with
duplicate target keys no longer double-applies on redo. Covered by a new test.

**`useGridColumnFit` exposed an ungated write path — ✅ RESOLVED `b725750`.**
`applyFit` now early-returns when not `enabled` (`resizable && !controlled`), so the
exposed `sizeToFit()` (the "Auto-size columns" action) respects controlled sizing
as the automatic ResizeObserver path already did.

**Unguarded display-index→`rowsRef` assumption — NOT A DEFECT.** The TBODY bridge
already carries a comment explaining the `data-row-index` (display) vs. `rowsRef`
(consumer rows) relationship, and `GridEditable` forwards no pagination/client
filter, so display order equals `rows`. No live risk; revisit if editable
pagination lands.

**`onWrapperBlur` allocates every blur — ◯ OPEN (negligible).** Guarding the
`setExtraCells(new Set())` would require either churning the callback's stability
(adding `extraCells` to its deps) or an unverified functional-setter form; the
interned-slice fix above means an empty→empty notify now re-renders nothing, so the
remaining cost is one Set allocation per blur. Skipped as not worth the churn.

*Confirmed correct (unchanged):* `useControllable` controlled↔uncontrolled flip,
the draft commit/blur race, navigation, mutations fan-out.

### Render performance

**`GridDataCell` not memoized — ✅ RESOLVED `a641d5c`.** The cell is now wrapped in
`memo`, so a row re-render (selection, truncation, pinning) re-runs `flexRender`
and `cellProps` only for cells whose own props changed, behind the existing per-row
memo. Covered by the existing cell-stability test.

**Body/head components unmemoized — ◯ OPEN (needs-judgment).** `GridBody`,
`GridVirtualizedBody`, and `GridHead` re-run their maps on every `GridData` render.
The row-level memo absorbs the DOM cost, so this is reconciliation/JS overhead —
bounded for a virtualized window, O(rows) for a large non-virtualized grid. Deferred
pending a profile; lower priority than the cell memo.

**Inline row closures — NOT A DEFECT.** The `onClick`/`onKeyDown` closures are
created inside the memoized row, not passed across a memo boundary, so they cost
only an allocation when the row already re-renders. The audit rated it trivial/leave.

### Public API & type safety

**`GridSelection.onValueChange` nullable payload — ✅ RESOLVED `da61784`.** Narrowed
to non-nullable to match the other grid bindings; the implementation already
coalesces a clear to an empty set. The editable selection seam, which had passed the
callback through raw, now applies the same coalescing.

**Editor `…Props` asymmetry — ✅ RESOLVED (documented) `438d741`.** Not a real
inconsistency: dedicated `…Props` types exist only where an editor adds options
(number/currency/date/select); boolean/text need none and use the shared
`GridEditableEditorProps`. Made explicit in their TSDoc rather than adding alias
exports (which would churn the public surface for no new contract).

**TSDoc gaps — ✅ RESOLVED `438d741`.** Documented the `GridColumnManagerConfig`
visibility triple (noting why it uses `onHiddenChange` not `onValueChange`),
`GridDataProps.rowClassName`/`maxHeight`/`rowLoading`/`className`, and the two
virtualization constants (CONVENTIONS §12.1).

*Confirmed correct (unchanged):* zero `any`/`@ts-ignore`, sound `GridProps` union,
benign localized TanStack-boundary casts.

### Complexity & cohesion

**Sort-state machine extracted — ✅ RESOLVED `aa4a7b4`.** `EMPTY_SORT`, the pure
`nextSort`, and `useGridSort` moved out of the 987-line `grid-data.tsx` into
`grid-sort-state.ts` — a closed unit, distinct from the value comparators in
`grid-sorting-utilities.ts`. `nextSort` is now unit-tested in isolation. The
optional sub-split of `nextSort` into `foldAdditive`/`collapseToColumn` was left as
essential domain logic.

**Menu-actions + pin-override extraction — ✅ RESOLVED `1946284`.**
`useGridMenuActions` + `DEFAULT_CONTEXT_MENU` moved to `grid-menu-actions.ts`, and
the pin-override model (`PinSide`/`PinOverrides`/`applyPinOverrides`) to
`grid-pin-overrides.ts`, trimming `grid-data.tsx` from 987 to ~855 lines.

**`toColumnDef` `deriveColumnBehavior` — ✅ RESOLVED `cf15cf5`.** The accessor /
sort-comparator / filter derivation moved to a named `deriveColumnBehavior(col)`
helper, flattening the `ColumnDef` return body.

### Magic numbers — NOT A DEFECT

On inspection every flagged literal was either already housed or intrinsic: the
`0.01` truncation epsilon is the documented `OVERFLOW_SLACK` constant (the analyzer
flagged its definition); the date-editor `4` is `\d{4}` in a `YYYY-MM-DD` regex; the
pagination `7`/`3`/`4` are positions in a fixed page-window layout. No action.

## Static-analyzer reliability appendix

The audit's most important meta-finding: a large fraction of the raw `code-quality`
output was false-positive for this codebase. Trust the tools as *pointers*.

| Analyzer output | Reality |
|-----------------|---------|
| **deep-nesting: 46 errors**, depths to 104, on pure type files | Counts brace/JSX/type-literal depth, not control flow. Essentially all artifact. |
| **magic-numbers** flags `grid-constants.ts` and `OVERFLOW_SLACK` | Those are the named-constant definitions; the regex `\d{4}` and page-window positions are intrinsic. |
| **excessive-parameters**: `GridColumnHeader` "17 params" | Counts destructured React props; the options-object it suggests is already in place. |
| **dead-code**: `GridEditableBooleanEditor`, `useGridSelection` | First is a public barrel export; second is a test-covered convenience wrapper. High-confidence dead-code count: 0. |
| **complexity**: `autoRemove` CC=15; `Commit` CC=8 | `autoRemove` is a one-line arrow (real owner: `toColumnDef`); `Commit` is a `type` alias. High-CC/Cog=1 switches are readable dispatch. |
| **check_style**: "0 issues" | Silent "basic" no-op — ran no linter. The real `biome check` + `tsc` gate is clean, but the tool gave false assurance. |
| **import-graph**: 10 "orphan" files incl. `index.ts` | Files importing only across the directory boundary — not unused. |
| **find_duplicates**: 0% | Genuinely clean. |

## Remaining work

- **Body/head memoization** (medium, perf) — profile a large non-virtualized grid first.
- **Optional cohesion** — extract `GridColumnResizeHandle`; group the pure
  `grid-data.tsx` resolvers into a sibling.
- **Sort-activation announcement** (medium, a11y) — only via a polite live-region,
  not by coupling the sort button's accessible name to state.

## Living record

As open items are resolved, mark the row in place with the resolving commit. A
future re-sweep takes a new `{date}-CODE-QUALITY-AUDIT.md`.

---

**See also:** [`ROADMAP.md`](../../src/modules/grid/ROADMAP.md) ·
[`index.ts`](../../src/modules/grid/index.ts) (public surface) · [`README.md`](../README.md) (audit index).
