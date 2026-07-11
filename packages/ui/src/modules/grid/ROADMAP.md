# Grid roadmap

> **Goal: benchmark-driven optimization of the centralized engine — faster and steadier, measured against the market on every change.** The feature migration is done (AG-Grid-class power on a TanStack Table engine, its pure core factored into [`engine/`](engine)); this file retires the feature backlog and turns the module toward speed and stability. Every claim here is a measured number, held with the browser suite ([`__benchmarks__/browser`](../../__benchmarks__/browser)) that keeps competitive score and the node benches ([`grid-compute.bench.ts`](../../__benchmarks__/grid-compute.bench.ts), [`grid-sorting.bench.ts`](../../__benchmarks__/grid-sorting.bench.ts)) that localize the layer.

## Baseline — the engine refactor did not regress; it won

The first question this roadmap had to answer — did centralizing the engine (taking the body and sort off the row model in #957, then factoring the module into `engine/` in #961) cost anything at runtime — has a clean answer: no, and by a wide margin. The check is a pure-engine A/B — the last commit before the engine work (`c35dad9`) against `HEAD`, deps identical, the sort and mount browser harnesses byte-for-byte unchanged across the span, so the delta is the engine and nothing else. Mean ms per iteration, real Chromium, this container (2026-07-11):

| Scenario | Pre-refactor (`c35dad9`) | Post-refactor (`HEAD`) | Change |
| --- | ---: | ---: | ---: |
| mount · 1,000 rows | 23.1 | 18.7 | 1.24× faster |
| mount · 10,000 rows | 59.7 | 17.7 | **3.4× faster** |
| mount · 100,000 rows | 536.7 | 46.8 | **11.5× faster** |
| sort · 10,000 rows | 67.8 | 29.8 | **2.3× faster** |
| sort · 100,000 rows | 445.8 | 111.6 | **4.0× faster** |

The centralized engine is not a tax to claw back — it is the single largest speedup in the module's history, and it also halved sort's run-to-run variance (±26–30% pre-refactor to ±16–19% post). The regression hunt found the opposite of a regression; the optimization work below builds up from a proven floor, not down from a suspected hole.

## Standing — the module now leads every competitive axis

Against AG Grid and MUI X DataGrid, the module trailed on sort alone; avenue 4 (below) closed it by caching the sort permutation across re-sorts of unchanged rows. It now leads mount, update, sort, and scroll — the whole competitive suite. Mean ms, this container, ui / AG / MUI — **bold** where ui leads (MUI's MIT tier paginates at 100 rows, so it has no full-set scroll to measure):

| Scenario | ui | AG Grid | MUI X |
| --- | ---: | ---: | ---: |
| mount · 10,000 | **17.7** | 31.3 | 34.2 |
| mount · 100,000 | **46.8** | 147.9 | 100.3 |
| update · 10,000 | **10.2** | 16.9 | 25.4 |
| update · 100,000 | **39.9** | 181.5 | 81.4 |
| sort · 10,000 (was 29.8, last) | **21.8** | 26.8 | 23.6 |
| sort · 100,000 (was 111.6, last) | **48.6** | 72.3 | 100.5 |
| scroll · 10,000 · round trip | **616** | 715 | — |
| scroll · 100,000 · round trip | **596** | 918 | — |

The node benches localized where sort's time went before avenue 4 landed. The comparator was never the problem — the engine already runs the decorated path (values decorated once through `toSortKey`, then `compareSortKeys` over the keys, over a single reused `Intl.Collator`; the per-call `localeCompare` tax was banked before this work began) — and that pass is ~5 ms for 10,000 rows. But the whole `sortRowsSmart` (decode + sort + materialize) is ~50 ms for 100,000 rows, ~45% of the 111 ms the browser sort cost, and every asc↔desc flip re-ran all of it from scratch. The `sortRowsSmart` split bench now holds that line: at 100,000 rows `computeSortOrder` (the cached half) is ~69 ms against `materializeSort`'s ~2 ms, so a cached flip pays ~33× less. The remaining ~46 ms of the browser sort is the top-level React commit and the virtualizer recompute — not the ~30-row window, which is memoized and moves rather than remounts — so avenue 1 (imperative repaint) targets an already-small surface and is held as low-ROI until a profile says otherwise.

## Optimization avenues

With the competitive suite swept, the shipped avenues (2, 4) are the wins that got there; the open ones (1, 3, 5, 6) are held against measured ROI rather than pursued for their own sake — an avenue lands only when a profile says it moves a real number. Each falls out of a core concept rather than a micro-tweak — elegant because it removes a layer, fast because vanilla beats the abstraction on the hot path.

1. **Repaint the sort; don't reconcile it — *held, low-ROI*.** The premise was that the residual sort cost is the keyed-list commit, repaintable in place from the cached permutation. But the residual sits in the top-level React commit and the virtualizer recompute, not the window: the window is ~30 memoized rows that React *moves* rather than remounts, so an imperative reorder there attacks an already-small surface. Reopen only if a flame profile pins measurable time on the window's reconciliation specifically; until then the cached-permutation path (avenue 4) has taken the tractable share.

2. **Fast-reject the text column's decode — *shipped*.** `parseNumeric` ran its three regex strips (currency, grouping, percent) plus a decimal test over *every* value, including a text column's whole set — names, cities, statuses — none of which is a number. An anchored O(1) probe (`NUMERIC_START`) now rejects a value that can't begin a number before any strip runs; every numeric shape passes the gate unchanged, so ordering is identical. Decode of a string column fell ~4.5× (`toSortKey` over 10,000 strings, 1.68 ms → 0.37 ms); numeric columns are neutral (they pass the gate), a digit-led non-number like a date pays one extra anchored test (~30 ns/value). This cuts the cold cost of a first sort, the case the permutation cache (avenue 4) can't help. (The collator reuse this avenue first proposed was already in place; corrected here.)

3. **Sort a typed index permutation.** `computeSortOrder` already sorts an index array rather than shuffling row objects — the permutation is the return value avenue 4 caches and avenue 1 repaints by. The remaining step is the typed backing: a `Uint32Array` of indices, cache-friendly and churn-free, for the very large sets where the plain array's boxing shows.

4. **Reuse the sort permutation across re-sorts — *shipped*.** A re-sort of unchanged rows by a spec already seen — an asc↔desc flip, the costliest gesture and the common user action, or an unrelated re-render — need not decode or sort again: the permutation depends only on the rows and the sort spec (column + direction), not on `getKey`. `computeSortOrder` / `materializeSort` split the pure sort into its costly and cheap halves, and `useSortView` caches the permutation keyed by the sort spec, scoped to the current rows and columns so a stale order never outlives its data. Result: 100,000-row sort fell 111.6 ms → 48.6 ms (2.3×) and 10,000-row 29.8 ms → 21.8 ms, turning the module's one losing axis into a win over both AG and MUI.

5. **Freeze column allocation after first fill.** The module already wins update, but `allocateColumnWidths` still redistributes on every `rowsSig` change though the running-max cache exists; a refresh that does not change the column set should not recompute widths. Widen-only, freeze-after-fill takes recompute off the hot refresh path (and is the prerequisite the retired infinite-scroll note flagged for append-cost stability).

6. **Measure churn, not just wall time — stability is a GC story.** The second goal is steadiness, and jank is allocation-driven: decorate-per-sort and per-render array building drive the pauses. Extend the node benches with allocation-count assertions — sort and refresh cost O(page), not O(total), as the loaded set grows — so a regression in churn is caught as a number before it surfaces as a stutter. This is the guardrail the other five avenues are proven against.

## Method

The loop is the one the benchmark README documents: snapshot, optimize, compare. `pnpm bench:browser -- --outputJson baseline.json` before an avenue, `--compare baseline.json` after, so every change carries its own before/after and the competitive ratios never drift silently. When a browser scenario moves, the node benches (`pnpm bench`) and the pure cores (`grid-sort/utilities`, `grid-column/allocate`) are the ladder down to the responsible function — the same descend-to-localize the chart and map suites use. An avenue ships only when its browser number improves and no other regresses; the competitive table above is the scoreboard, re-run per change.

## Engine — the substrate the optimization rides

Every avenue lands in [`engine/`](engine), the module's pure functional core: a d3-style library of framework-free functions each feature slice consumes, all callable and benchable outside React, which is why the sort and allocation costs above are measurable as pure functions before they are measured as renders. The layering invariant is what keeps them optimizable in isolation — no `'use client'`, no runtime `react` / `motion` / `@dnd-kit` / `@floating-ui` imports, no runtime imports from the module root (one documented exception: `engine/grid-table/options.ts` re-exporting the TanStack row-model factories) — enforced by the greps below, all of which must print nothing:

```bash
rg -nP "^\s*import\s+(?!type\b)[^;]*from\s+'(react|react-dom|motion|framer-motion|@dnd-kit|@floating-ui)" packages/ui/src/modules/grid/engine

rg -nP "^\s*import\s+(?!type\b)[^;]*from\s+'@tanstack" packages/ui/src/modules/grid/engine | rg -v "grid-table/options.ts"

rg -l "'use client'" packages/ui/src/modules/grid/engine

find packages/ui/src/modules/grid/engine -name 'index.*'
```

Because each shared rule has exactly one definition, its `*.test.ts` suite is where an optimization is proven safe before it is proven fast: the comparator lives once in `grid-sort/utilities`, the allocator once in `grid-column/allocate`, so a rewrite that holds the tests holds the module.

---

**See also:** [`__benchmarks__/browser/README.md`](../../__benchmarks__/browser/README.md) (the competitive suite and its methodology) · [`index.ts`](index.ts) (public surface) · [`../../docs/MODULES.md`](../../../docs/MODULES.md). Residual feature work — the editing increments, cell/range selection, nested grouping, variable-height virtualization — is retired from this tracker; the editing design persists in [`../../docs/2026-07-08-GRID-EDITING-PLAN.md`](../../../docs/2026-07-08-GRID-EDITING-PLAN.md).
