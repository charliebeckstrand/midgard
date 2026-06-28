# Grid dynamic column sizing — design

> **Content-aware column autosizing to replace explicit width wiring.** By default the grid sizes columns to their content: when columns fit with room to spare it gives them equal width but widens any column whose data would otherwise truncate (leaving the slack on columns that don't need it); a one-word header reserves room for its word plus its icons, while a multi-word header may truncate. A column `width` (or controlled `columnSizing`) supersedes the dynamic system. This file is the hardened design — pre-implementation findings from the `grid-autosize-design` workflow (4 parallel lenses + synthesis); it is not yet built.

## Goal

Today the default path is already fixed layout (`resizable` defaults `true` → `table-fixed` + a px `<colgroup>` from the engine's `columnSizing`), and `useGridColumnFit` distributes width by scaling proportionally around a flat `DEFAULT_COLUMN_SIZE` (150px) base — it never measures content, so it cannot avoid truncation or honor a header's natural width.

The redesign keeps the proven fixed-layout rendering vehicle but makes its *inputs* content-aware (measured per-column intrinsic widths) and its *distribution* principled (a two-regime content-first allocator), and turns `width` from the primary mechanism into an override.

## Architecture — three units

Split the work into three units with clean boundaries so each is testable in isolation.

`measureColumnIntrinsics(table, visibleColumns, containerEl, opts) → Map<id, {min, content, max}>` — impure, reads the DOM, no React. It produces a per-column intrinsic profile.

`allocate(profiles, available) → Record<id, number>` — pure, no DOM or engine. It distributes the available width across the profiles. This is the only unit with non-trivial logic to unit-test, and it runs cleanly in jsdom.

`useGridColumnAutoSize` — the React shell. It orchestrates measure → allocate → `table.setColumnSizing` in a pre-paint `useLayoutEffect`, owns the stand-down/re-arm state, and wires the `ResizeObserver`, `document.fonts.ready`, and measurement-signature dependencies. It keeps the same public surface (`{ sizeToFit }`) so `use-grid-table.ts` and the `GridColumnResize.sizeToFit` graft are unchanged.

`fitSizes` and `useGridColumnFit` are deleted wholesale — only `use-grid-table.ts` imports them, so there are no external consumers to deprecate.

## Allocation — the pure core

Drop the "max-min fair water-filling" framing from the original sketch; the lenses showed it is the wrong objective, since proportional scaling leaves narrow columns truncating while a wide column wastes its surplus. The requirement is a **two-regime content-first allocator**.

Clamp each column's measured `content` to `[min, max]` to get its `desired` width.

**Deficit** (`Σdesired ≥ available`): hold every column at `desired` and let the table overflow horizontally — never shrink below `min`, never proportionally squish. This preserves the deficit behavior the current browser tests assert (declared widths held, table overflows). The sub-min terminal case (`available < Σmin`, or `available ≤ 0`) collapses into this: hold at `min` and let the wrapper scroll.

**Surplus** (`Σdesired < available`): give each column `desired`, then distribute the remainder by raising the *narrowest* columns toward an equal target, each capped at `max`, iterating until the remainder is exhausted or every column has hit `max`. This widens the cramped/truncating columns first and leaves the slack columns at the equal share — exactly the stated behavior. If every column reaches `max` with width left over, stop: the table is narrower than the container, which is acceptable (stretching past a column's `max` would violate the user's ceiling).

Keep the existing carry-remainder rounding: floor each width, accumulate the fractional carry, and hand the whole leftover pixels to the largest fractional parts so `Σwidths === available` exactly. This is what prevents a phantom horizontal scrollbar; unit-test the invariant against pathological inputs (three 133.33px columns in 400px; N columns in a prime width).

Exclude non-data columns (`select`/`actions`) and manually-pinned columns from the data allocation: measure them, write their sizing, and subtract their widths from `available` before allocating the rest.

## Measurement

**Source.** Cells already carry `data-grid-col` on both `<th>` and `<td>`. Read body intrinsics from the live truncating leaf (`span.truncate`, whose `scrollWidth` is the true content width regardless of the column's current width — the proven `useGridTruncation` approach) when `truncate` is on. For the editable grid (`truncate={false}`, no truncating span) read the `<td>`'s own `scrollWidth` directly; the cell is mounted and laid out. Defer any hidden shadow-mirror / `getComputedStyle` replication strategy — it is a style-snapshot maintenance burden, and only justified if a concrete editor-overflow case proves the `<td>` read insufficient.

**`content`.** `content = max(headerIntrinsic, max over all body cells of cellIntrinsic) + cellChrome`, then `min(that, CONTENT_CAP, maxWidth)`. `CONTENT_CAP` is a single `grid-constants` knob (start ~480px) so one pathological cell cannot starve the rest; an explicit `column.maxWidth` overrides the cap, since `maxWidth` is the user's deliberate ceiling.

**`min` (data column) — header-driven.** If the title is a string and a single token (`/^\S+$/` after trim) → `min = full header intrinsic width`, so a one-word header never truncates. Otherwise (multi-word string or non-string `ReactNode`) → `min = iconClusterWidth + small text allowance`, allowing truncation. Floor `min` at `column.minWidth ?? DEFAULT_MIN_COLUMN_SIZE`, and never let `min` exceed `content`.

**Icon cluster.** Measure the affordance cluster (sort + pin + filter, all `shrink-0`) once per density from a hidden probe and cache it in a `Map` keyed by density — do not hardcode it, since density and the present icon set change its width.

**`min` (select/actions).** The natural width of the rendered control. Recommendation (open question): keep `SELECT_COLUMN_SIZE` (48px) as a deterministic floor/seed and skip measuring these fixed-shape columns.

**Measure all rows, not the visible window.** For non-virtualized grids every row is mounted, so iterate every `td[data-grid-col=id]`. For virtualized grids only the window is mounted, so cache per-`(rowKey, columnId)` intrinsics in a ref-held `Map` and take a running max that never decreases within a measurement signature. This kills the scroll/page width jitter and the re-allocation churn — allocation re-runs against the stable cached baseline, not a fresh window read.

**Measurement signature.** `hash([visibleColumnIds, density, rowsSignature])`, where `rowsSignature` derives from the rendered row keys (`getKey`), not array identity, so a new `rows` reference with the same keys does not thrash. On signature change → full re-measure (clear cache). On container-width change only (`ResizeObserver`) → re-allocate against cached profiles, no DOM re-measure. On `document.fonts.ready` → one-shot cache clear + re-measure + re-allocate (mirrors `useGridTruncation`). Reorder is a no-op for measurement (the cache is id-keyed).

## Wiring and behavior

**Pre-paint apply.** Run measure → allocate → apply in `useLayoutEffect` so the first paint carries real widths (no 150px flash). The `<colgroup>` (`resolveResizeLayout`) and headers already read `resize.getSize()`, so once the engine has sizing pre-paint both render correctly with no further change in `grid-data.tsx` / `grid-head.tsx`.

**`toColumnDef` change (atomic).** Remove the `DEFAULT_COLUMN_SIZE` fallback for width-less data columns; keep `size` only when `column.width` parses (and the select natural-width seed if retained). This **must** ship in the same commit as the autosizer — a width-less column with no engine size and no autosizer renders `<col style={{width: undefined}}>` and breaks fixed layout and pinning offsets. `minSize`/`maxSize` pass-through (`col.minWidth`/`maxWidth`) is unchanged; the header-driven single-word `min` is enforced by writing the measured value into the engine sizing/bounds, not by mutating `columnDef.minSize` at definition time (which has no measurement).

**Stand-down gate (hard, ref-checked).** Return early — install no observers, measure nothing, make `sizeToFit()` a no-op — when controlled (`columnSizingConfig.value != null`) or `resizable === false`. Mirror controlled and manual state into refs so every async callback re-checks them at callback time, closing the "half controlled, half auto" merge hazard.

**Manual pinning (per-column).** On a drag-resize commit (engine `columnSizingInfo.isResizingColumn` transition) add that column id to a `pinnedRef` `Set`. `allocate()` treats pinned columns as fixed at their current engine size; unpinned siblings still auto-size. `sizeToFit()` clears the set and re-allocates everything. This replaces the single global `manualRef`, so dragging one column no longer disarms autosize for the whole grid.

**Idempotent apply (loop guard).** After `allocate()`, shallow-compare the result to the engine's current `columnSizing` and skip `setColumnSizing` when unchanged. Combined with the signature gate, this breaks the `setColumnSizing → onColumnSizingChange → re-render → ResizeObserver → apply` cycle; deterministic allocation that sums to exactly `available` yields a byte-identical output for a stable input, so the comparison short-circuits within a pass or two.

**No-layout stand-down + recovery.** If `containerEl.clientWidth === 0` (jsdom, `display:none`, collapsed accordion) skip the synchronous apply but still install the `ResizeObserver`; its first non-zero callback performs the initial fit. This keeps jsdom inert (matching today) and recovers when a hidden grid becomes visible.

**Empty grid.** With no body rows mounted, measure header intrinsics + icon cluster only and set `content = headerIntrinsic`. Data arrival changes `rowsSignature` → re-measure with body cells. No special branch beyond "the body-cell loop yields nothing".

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| `measure → setColumnSizing → ResizeObserver → measure` infinite loop | blocker | Idempotent apply (skip write when unchanged) + signature gate (resize re-allocates only). |
| Controlled `columnSizing` partially overwritten on page/scroll/font events | blocker | Hard ref-checked gate; controlled grid installs no observers and never fires `onValueChange` itself. |
| Virtualized/paginated width jitter as wider rows scroll in | blocker | Per-`(rowKey,columnId)` cache; content profile is a running max, never decreasing within a signature. |
| Removing the 150px default without the autosizer → `<col width=undefined>` | blocker | Couple removal with the new hook in one commit; CI gate blocks the half-state. |
| A single outlier cell drags the table wide or starves siblings | major | `CONTENT_CAP` caps per-column content; `column.maxWidth` overrides; deficit holds neighbors at `min`. |
| Editable grid (`truncate=false`) has no truncating span to read | major | Measure the `<td>` `scrollWidth` directly (the `data-grid-col` attribute already marks it). |
| Web fonts load after first measure → text reflows wider and clips | major | Wire `document.fonts.ready` to clear-cache, re-measure, re-allocate (one-shot, bounded). |
| Global manual disarm clips untouched columns' new content | major | Per-column `pinnedRef`; only the dragged column holds, siblings keep fitting. |
| Density change invalidates cached intrinsics | minor | Density is part of the measurement signature; a change clears the cache and re-measures. |
| All columns hit `maxWidth` with width left over | minor | Accept trailing whitespace; do not stretch past a column's ceiling. |
| Zero / sub-min container width | minor | Deficit hold at `min` + an `available ≤ 0` early return; never scale toward zero. |

## Test plan

Unit (jsdom, pure `allocate()`) — new `__tests__/components/grid-column-allocate.test.ts`: deficit holds desired and overflows; surplus widens narrow columns first toward equal and caps at `max`, stopping with slack when all at `max`; `content` clamped to `[min,max]`, `CONTENT_CAP`, and `maxWidth` (`maxWidth` overrides the cap); single-outlier capped with neighbors held at `min`; rounding invariant `Σwidths === available` for adversarial inputs; pinned and select/actions excluded and subtracted; empty list → `{}`; `available ≤ 0` → min-hold; `min` never exceeds `content`.

Unit (jsdom) — header-min heuristic (single-token vs multi-word vs `ReactNode`, floored at `minWidth ?? DEFAULT_MIN_COLUMN_SIZE`) behind a measurement seam, and the signature derivation (same row keys + new array ref → no clear; changed keys/ids/density → clear; width-only change → re-allocate path).

Browser (real layout) — rewrite `__tests__/browser/grid-column-fit.test.tsx` against the two-regime allocator: width-less columns auto-size to content; a long single-word header stays untruncated; a multi-word-header column with short cells gets a narrow `min` and truncates; deficit-overflow, surplus-growth, and the outline-chrome "no phantom scrollbar" assertions retained.

Browser — the loop/idempotency settle (bounded `setColumnSizing` writes on frame resize); virtualization monotonic non-decreasing width on scroll; pagination stability across page turns; `fonts.ready` post-settle growth; editable `truncate=false` sizing without clipping the editor; controlled stand-down (grid never calls `onValueChange`, `sizeToFit` inert); per-column manual pin + re-arm.

Existing tests that change — `__tests__/components/grid-resize.test.tsx`: the literal `200px`/`120px`/`320px` colgroup/header assertions stay valid for declared-width columns, but add coverage for width-less auto-sized columns; the "width-less selection column → 48px" assertion depends on open question 3 (keep `SELECT_COLUMN_SIZE` as the floor, or assert a range). `grid-truncate.test.tsx`, pinning, reorder, and filter suites are unaffected (they use declared widths or non-width concerns).

Verify gate — `biome check .`, `turbo run check-types`, scoped Vitest (`test:related` / `test:changed`) for the grid module, then the browser layout suite.

## Open questions

These are genuine forks for the human; the rest of the design is settled.

1. `CONTENT_CAP` — ship a single fixed `grid-constants` value (~480px) with `column.maxWidth` as the per-column override, or expose a grid-level prop now? Recommendation: fixed constant, no new public API until a consumer needs it.

2. Multi-word / non-string header `min` — what exact "small text allowance" pairs with the measured icon-cluster width: a fixed px (e.g. 32px), an em multiple, or "enough for ~N characters"? This sets how aggressively multi-word headers truncate, and wants a product call on the minimum legible header stub.

3. Select/actions width — keep `SELECT_COLUMN_SIZE` (48px) as a stable floor/seed for the checkbox column (deterministic, font-independent, matches the existing test) and skip measuring it, or fully measure these fixed-shape controls? Recommendation: keep the constant as a floor.

## Provenance

Produced by the `grid-autosize-design` workflow: four parallel `Explore` lenses (width consumers, adversarial edge cases, measurement strategy, allocation math) and an Opus synthesizer, over the grid module at this branch's base. The raw lens reports are not committed; this document is their synthesis.

---

**See also:** [`ROADMAP.md`](ROADMAP.md) (feature backlog — "Fit-to-content sizing") · [`index.ts`](index.ts) (public surface).
