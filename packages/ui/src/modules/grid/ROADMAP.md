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

## The frontier — sort is the one axis the module still loses

Against AG Grid and MUI X DataGrid at `HEAD`, the module wins mount and update outright and trails on sort alone. Mean ms, ui / AG / MUI — **bold** where ui leads:

| Scenario | ui | AG Grid | MUI X |
| --- | ---: | ---: | ---: |
| mount · 10,000 | **17.7** | 31.3 | 34.2 |
| mount · 100,000 | **46.8** | 147.9 | 100.3 |
| update · 10,000 | **10.2** | 16.9 | 25.4 |
| update · 100,000 | **39.9** | 181.5 | 81.4 |
| sort · 10,000 | 29.8 | 26.8 | 22.3 |
| sort · 100,000 | 111.6 | 75.4 | 89.9 |

Sort is the priority because it is the only red cell, and the node benches say why it is red: it is not the comparator. The engine already runs the decorated path — values decorated once through `toSortKey`, then `compareSortKeys` over the keys with no reparsing — and that pass costs ~5 ms for 10,000 string rows (1.7 ms to decorate, 4.9 ms to compare), ~7 ms at the outside. The browser sort of the same 10,000 rows costs ~30 ms. The missing ~23 ms is not arithmetic; it is the React commit that re-keys the virtualized window on every sort. AG and MUI repaint a sorted window by moving DOM imperatively; the module reconciles a keyed list. Sort is repaint-bound, and the avenues below attack the repaint first and the comparator second.

## Optimization avenues

Ranked by measured headroom, each falling out of a core concept rather than a micro-tweak — elegant because it removes a layer, fast because vanilla beats the abstraction on the hot path.

1. **Repaint the sort; don't reconcile it.** The dominant sort cost is the keyed-list commit, not the sort (~23 ms of ~30 ms at 10,000 rows). A sort reorders rows but leaves the visible *set* of cells identical — same components, same data, new order — so the window's row nodes can be reordered in place (a permutation applied to existing DOM, cell text repainted) instead of remounted through React's reconciler. This is the trade the chart module's hover residual already names, made here against a concrete 23-ms target; it composes directly with avenue 3, whose output is exactly the permutation an imperative reorder consumes.

2. **Reuse one `Intl.Collator`; retire per-call `localeCompare`.** The string comparator is `localeCompare`-bound (10,000 string keys sort in 4.9 ms against 2.7 ms for numeric). `a.localeCompare(b)` reconstructs collation state on every call; a single `new Intl.Collator(locale, { numeric: true })` bound once and its `.compare` reused is several times faster and collates numerically in the runtime — `Item 2` before `Item 10` natively — which can retire the regex decorate for the common string column outright. The tried-and-true vanilla form is both leaner and quicker than the method-per-value idiom.

3. **Sort a typed index permutation; materialize once.** Decorate into a parallel keys array, sort a `Uint32Array` of indices by those keys — cache-friendly, no object churn, no reference shuffling — then project the rows once at the end. The Schwartzian transform on a typed array is the classic fast path, and its permutation is reusable: it is what avenue 1 reorders DOM by, and what avenue 4 reverses.

4. **A direction flip is a reverse, not a re-sort.** For a total order, descending is the reverse of the ascending permutation. The asc↔desc flip — the exact bench scenario, and the common user gesture — need not re-decorate or re-sort; cache the last permutation keyed by column and data identity and reverse it in O(n). This turns the module's worst-measured interaction into a linear pass.

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
