# Competitive benchmarks

> **The chart module measured against AG Charts and Highcharts, the grid module against AG Grid and MUI X DataGrid, and the map module against Highcharts Maps and ECharts, in real Chromium — so every optimization lands against the market, not against yesterday's self.** `pnpm bench:browser` runs all three. It also runs the scenarios that keep no score against a rival and are here because jsdom cannot price them — the menu, popover, tooltip, and PDF-viewer benches. The jsdom benches one directory up keep localizing regressions; this suite sizes them.

## Why a browser suite

AG Charts and ECharts draw to real canvases, the grids virtualize against real scroll geometry, and every contender deserves real layout, style, and event plumbing, so jsdom timings would not survive scrutiny; the suite runs through Vitest browser mode on the Playwright Chromium the test suite already uses. Chromium launches with its frame-rate limit off — AG and ECharts defer drawing to animation frames and several benches settle frames inside the timed region, so a vsync'd browser would quantize those samples to ~16ms.

**That flag does not take effect in the headless container this suite runs in, and the scenarios that settle frames are quantized anyway.** Measured directly: a bare `await frame()` costs 17.4 ms and two cost 35.1 ms, exactly twice, while twenty pointer dispatches cost 0.044 ms. Every row whose timed region awaits a frame therefore reads the frame rather than the work — which is most of the hover sweeps, where ui's 16.6 ms and Highcharts' 17.5 ms both sit on one frame period. Read those rows as unresolved, not as standings, until the harness stops settling inside the sample; the mount and update rows are unaffected, because `mountBenches` settles on a paint probe rather than on frames.

React runs in **production** mode ([`vitest.bench.browser.config.ts`](../../../vitest.bench.browser.config.ts) forces `NODE_ENV=production`): the modules ship the production build, and the vanilla contenders carry no dev/prod split, so a dev-React number would score the modules' diagnostics rather than their shipped speed. The gap is real — dev React runs several times the work per render — so this is a correctness condition, not a thumb on the scale.

## Reading and driving improvements

Each `describe` groups one scenario's three contenders, so the `BENCH Summary` prints the head-to-head ratios directly. To hold a before/after line through an optimization, snapshot then compare:

```sh
pnpm bench:browser -- --outputJson bench-baseline.json
# …optimize…
pnpm bench:browser -- --compare bench-baseline.json
```

`pnpm bench:browser:compiler` runs the same suite with the React Compiler on the `ui` source ([`vitest.bench.browser.compiler.config.ts`](../../../vitest.bench.browser.compiler.config.ts)). An app with `reactCompiler: true` ships the modules in this form. The harness and the contenders stay plain, so the two runs differ only in the `ui` modules. To see what the compiler gains or costs, write a plain run with `--outputJson`, and then give that file to the compiled run with `--compare`. The run stops at setup if the compiler did not compile the `ui` source.

When a competitive scenario regresses or lags, the jsdom benches (`pnpm bench`) are the ladder down to the responsible layer. Their pure cores sit directly under these scenarios, drawing the same fixtures with no React and no DOM: `chart-scale` and per-chart `*-geometry` for the numbers going in and the paths coming out, `chart-layout` for the axis/tick/date/hit-test pass between them, `map-compute` for the projection fit, the region paths, and the region joins (with `map-render`'s cold/warm split for the geometry cache), `grid-compute` and `grid-sorting` for column allocation, export, and sort, `grid-group` for grouping and aggregation, `query-evaluate` for the filter walk, and `recipe` for the style resolution every one of them pays per element.

## Charts

### Methodology

Every scenario draws the same deterministic dataset ([`fixtures.ts`](fixtures.ts), LCG-seeded) into the same fixed 800×450 box with animations off, through each library's idiomatic API ([`contenders.tsx`](contenders.tsx)): the ui module renders through React (`createRoot` + `flushSync` — the synchronous commit a consumer pays), AG Charts and Highcharts through their vanilla factories, each with its own settle contract (AG awaits `waitForUpdate()`; Highcharts and the ui module draw synchronously).

- [`chart-mount.bench.tsx`](chart-mount.bench.tsx) — full mount-to-painted-DOM plus teardown per iteration: line at 100 / 1k / 10k × 1 series and 1k × 5, bar at 50 / 500 × 2, scatter at 1k / 10k. Plus the line scenarios again over ISO-date categories (`makeDatedTrend`, 1k / 10k), the time-series dashboard shape: every contender must decide how to label a date axis, and the ui module's band axis probes whether all categories parse as dates before formatting them through `Intl` — a pass a plain-label axis exits on its first value. Held beside the plain scenario of the same size, the pair prices the date path end to end; `chart-layout` splits it into the probe and the per-row labeling that follows.

- [`chart-update.bench.tsx`](chart-update.bench.tsx) — redraw on a live chart, alternating two same-shape datasets so no iteration bails on an equality guard: the ui module re-renders through its root, AG and Highcharts take their in-place data updates.

- [`chart-hover.bench.tsx`](chart-hover.bench.tsx) — a 20-step pointer sweep across the plot plus one settled frame: hit-testing, crosshair/tooltip work, and frame-deferred drawing. Every contender receives the same `pointermove` + `mousemove` pair per step, so dispatch overhead is symmetric across their differing interaction stacks.

Fairness notes, both directions: the ui module keeps its built-in accessible output (the visually-hidden data table renders one row per datum) while Highcharts runs without its optional accessibility module and AG registers its standard `AllCommunityModule`; Highcharts' `boost` module stays off, matching default installs; the ui module pays React reconciliation the vanilla factories don't, and that is the product being measured.

### Standings (2026-07-10, this container)

Absolute numbers move with hardware; the ratios are the signal. Mean ms per iteration, ui / AG / Highcharts — **bold** marks a scenario where ui beats both.

| Scenario | ui | AG Charts | Highcharts |
| --- | ---: | ---: | ---: |
| mount · line · 100 × 1 | **5.1** | 34.9 | 31.9 |
| mount · line · 1,000 × 1 | **9.9** | 34.3 | 36.5 |
| mount · line · 10,000 × 1 | **62.5** | 70.5 | 82.2 |
| mount · line · 1,000 × 5 | **36.1** | 66.4 | 62.6 |
| mount · bar · 50 × 2 | **10.1** | 34.4 | 33.1 |
| mount · bar · 500 × 2 | **21.3** | 58.6 | 87.6 |
| mount · scatter · 1,000 | **10.0** | 52.2 | 70.3 |
| mount · scatter · 10,000 | **77.0** | 92.8 | 466.2 |
| update · line · 1,000 × 1 | **5.1** | 13.8 | 11.3 |
| update · line · 10,000 × 1 | **20.7** | 50.7 | 51.9 |
| update · line · 1,000 × 5 | **14.6** | 34.5 | 29.1 |
| update · bar · 500 × 2 | **8.2** | 21.2 | 33.1 |
| update · scatter · 10,000 | **51.0** | 52.9 | 563.4 |
| hover · line · 1,000 · sweep | 18.4 | 17.2 | 33.6 |
| hover · scatter · 10,000 · sweep | 19.6 | 17.2 | 79.2 |

The module beats **Highcharts on all fifteen** scenarios and **AG Charts on thirteen** — every mount and every update, the 10,000-point canvas cases included. The two it still trails are the hover sweeps, both within one or two milliseconds of AG (and the line sweep has read as a dead heat on other runs; the 10,000-point scatter update sits on the same boundary in the other direction, so read those edges as ties). The hover residual is not the marks (memoized single path per series) or the hit test (a squared-distance scan costing well under a millisecond) but a React commit per pointer move driving the crosshair and tooltip, against AG's vanilla canvas redraw; closing it means moving the shared hover layer to imperative DOM writes — a trade of the declarative hover model for the last millisecond, open by choice.

### Optimization log

Each entry names the change and the scenarios it moved; the levers are ordered as they landed.

1. **Production React in the bench** (methodology). Measuring the shipped build instead of the dev one cut every ui number ~2.6× — the largest single move, and the honest baseline the rest build on.

2. **Deferred data table** ([`frame.tsx`](../../modules/chart/engine/chart-frame/frame.tsx), `useDeferredValue`). The visually-hidden table holds one row per datum; taking its build off the urgent render dropped the line mounts most (1k line mount 235 → ~12 under dev React at the time), since a line's marks are one path and the table was the whole linear term. Parity is unchanged — the table converges one low-priority commit behind.

3. **Single-path plain scatter** ([`scatter-chart-marks.tsx`](../../modules/chart/scatter-chart/scatter-chart-marks.tsx)). A plain series draws as one `<path>` of every disc rather than a circle apiece, and isolation dims the group then re-draws the one lit disc over it, so a pointer crossing rebuilds nothing. Scatter 1k mount 66 → 16 (beats both); 10k mount 711 → 137, update 616 → 63, hover 30 → 25 (all now past Highcharts, closing on AG's canvas). Bubbles keep a circle each — their translucent fills must composite disc over disc.

4. **Single-path bars** ([`bar.tsx`](../../modules/chart/engine/chart-marks/bar.tsx)). Each series' bars concatenate into one `<path>` — bars are opaque and never overlap, so it reads identically — with the same group-dim-plus-overlay isolation the scatter path uses. Bar 500 mount 138 → 24 and update 67 → 8, both now past AG and Highcharts; the combo and dual-axis bars ride the same renderer.

5. **Constant-radius disc path** ([`scatter.ts`](../../modules/chart/engine/chart-geometry/scatter.ts)). A plain scatter series shares one radius across every disc, so the two arc commands are identical for all of them; the builder caches that suffix and formats only the one moving coordinate per disc. Scatter 10k update 67 → 60, past AG.

6. **Sub-pixel path coordinates** ([`chart-coords.ts`](../../modules/chart/engine/chart-coords.ts)). Path `d` strings round to two decimals, a fraction of the full-float size; a structural cleanup that shrinks the DOM payload the large-N paths ship.

7. **Lazy readout** ([`types.ts`](../../modules/chart/engine/types.ts) `ChartReadoutSource`, every chart body). Building the readout formats every category × series cell through `Intl` — at 10,000 rows that outweighed drawing the marks, and it ran on the mount-critical render even after the table's render was deferred. Charts now hand the frame a cached thunk (`once`): the mount render only decides a readout exists, the hover tooltip materializes it on the first pointed frame, the deferred table a low-priority beat after mount, CSV export on selection. Line 10k mount 92 → ~66, scatter 10k mount 127 → ~81 — both past AG's canvas. Parity unchanged; the cache is shared by every consumer.

8. **Squared-distance hit test** ([`scatter.ts`](../../modules/chart/engine/chart-geometry/scatter.ts) `scatterMarkAt`). The per-move scan stays in squared distances end to end — the held-disc hysteresis already compared squares — and rejects on each axis before multiplying, so the far discs cost two compares and no arithmetic; `Math.hypot`, which the scan called ten thousand times per move, is gone. Scatter 10k hover 23.5 → ~18, from ~3.5ms of scan to well under one.

9. **Early-exit date detection** ([`chart-time.ts`](../../modules/chart/engine/chart-time.ts) `dateCategoryFormat`). The band axis's are-these-all-dates probe parsed every category (`Date.parse` per row) before answering; a non-date axis now fails on its first value, one parse instead of ten thousand. Worth ~11ms of the line 10k mount.

Open: the scatter hover sweep still trails AG by a whisker (~18 vs ~17) — the residual is a React commit per pointer move against AG's vanilla redraw, closable only by moving the shared crosshair/tooltip tracking to imperative DOM writes. The ten-thousand-row date axis trails both rivals; see below. Every other scenario stands beaten or tied.

#### Date-axis mounts (2026-08-02, this container)

Added with the pure-core suite, so these carry no earlier baseline. Mean ms per iteration, each rung the median of three runs, beside the plain-label scenario of the same size.

| Scenario | ui | AG Charts | Highcharts |
| --- | ---: | ---: | ---: |
| mount · line · 1,000 × 1 | **8.6** | 30.2 | 22.0 |
| mount · line · dated · 1,000 × 1 | **10.2** | 27.5 | 22.7 |
| mount · line · 10,000 × 1 | **39.7** | 53.8 | 60.5 |
| mount · line · dated · 10,000 × 1 | 60.3 | 55.4 | **55.0** |

A date axis costs the module ~1.6ms at a thousand rows and ~20ms at ten thousand, where it gives up a 1.35× lead and lands ~1.1× behind both rivals. Neither rival pays a comparable surcharge. The pure cores account for the whole 20ms: the are-these-dates probe parses every category (3.8ms at ten thousand, against ~0.0004ms for a non-date axis, which exits on its first value), and `resolveCategories` then labels every row through the resolved formatter — a second parse plus an `Intl` format apiece, 15.6ms at ten thousand.

Open: the axis draws about a dozen labels whatever the row count, so most of that labeling is discarded. Formatting on demand does not reach it alone, because `verticalLayout` sizes the band gutter from the longest label and so measures every one; the whole array has to exist before the layout can run. Closing it means giving the gutter estimate a width it can reach without the labels — the two rungs above put ~20ms behind that change.

## Grids

### Methodology

Every scenario drives the same deterministic shipment rows (`shipments` in [`../fixtures.ts`](../fixtures.ts), LCG-seeded, 8 columns) into the same fixed 960×600 box with animations off and fixed 120px columns, through each library's idiomatic API ([`grid-contenders.tsx`](grid-contenders.tsx)): the ui module and MUI X render through React (`createRoot` + `flushSync`), AG Grid through its vanilla `createGrid` factory. The settle contract is shared rather than per-library — each operation is timed until a paint probe sees the expected cell text in the live DOM — so a library that defers row DOM onto animation frames pays for exactly the frames it defers, and none is trusted about its own "ready" signal.

- [`grid-mount.bench.tsx`](grid-mount.bench.tsx) — full mount-to-painted-rows plus teardown per iteration, at 1k / 10k / 100k rows.

- [`grid-update.bench.tsx`](grid-update.bench.tsx) — whole-dataset refresh on a live grid (same row ids, new values), alternating two same-shape datasets so no iteration bails on an equality guard, at 10k / 100k.

- [`grid-sort.bench.tsx`](grid-sort.bench.tsx) — an asc/desc sort flip on `id` through each library's programmatic sort state, so the engine re-sorts the full dataset and repaints the window, at 10k / 100k.

- [`grid-scroll.bench.tsx`](grid-scroll.bench.tsx) — a top-to-bottom-and-back sweep in 12 even jumps, one settled frame per step plus a fully-painted probe at each end — the virtualization stress, at 10k / 100k.

- [`grid-filter.bench.tsx`](grid-filter.bench.tsx) — a quick-filter term applied and then cleared, settled on painted survivors at each end, so one sample covers the narrowing a keystroke produces and the widening a backspace does, at 10k / 100k. Each library takes its own quick filter (the ui module's `search` binding, AG's `quickFilterText`, MUI's `filterModel.quickFilterValues`) and all three scan the same eight columns — the ui grid searches the columns declaring a `value` accessor, so every bench column declares one.

- [`grid-column-filter.bench.tsx`](grid-column-filter.bench.tsx) — a `contains` filter on the carrier column, applied and then cleared, at 10k / 100k. It settles on painted survivors at each end, as the quick-filter scenario does. Each library takes its own column filter: the ui module's `columnFilters` binding, AG's filter model, and MUI's `filterModel.items`. Only this scenario mounts the carrier column as filterable, so no filter affordance adds to the cost of the others.

- [`grid-paginate.bench.tsx`](grid-paginate.bench.tsx) — client pagination with 100 rows on each page, the cap of MUI's MIT tier, at 10k / 100k. Three scenarios run: a mount, a flip to the second page and back, and an asc/desc sort flip on `id`. Each library pages through its own pagination: the ui module's `pagination` binding, AG's `pagination` option, and MUI's `paginationModel`. Only this scenario mounts the grids paginated.

- [`grid-total.bench.tsx`](grid-total.bench.tsx) — a grand total that sums the loads and the weight, at 10k / 100k. Three scenarios run: a mount, an asc/desc sort flip on `id`, and a quick filter applied and cleared. AG Grid holds its grand-total row in the Enterprise tier, and MUI X holds its aggregation in the Premium tier, so the ui grid runs alone. A contender names the mount options that it cannot run (`unsupported` in [`grid-contenders.tsx`](grid-contenders.tsx)), and the harness leaves it out of those scenarios.

Fairness notes, both directions: the ui grid keeps its built-in chrome (toolbar with export, accessible announcements) that the competitors' defaults don't carry; each library runs its own defaults otherwise (AG's community module set, MUI's MIT tier). MUI's MIT tier hard-caps `pageSize` at 100 and always paginates — full-set scrolling is Pro-licensed — so MUI runs mount/update/sort in its shipped paginated shape (the full dataset still flows through its client-side model) and sits out the scroll sweep. React runs in production mode for the same reason as the charts (see above); it covers MUI symmetrically.

### Standings (2026-07-10, this workstation)

Absolute numbers move with hardware — this table was re-measured on a faster machine than the round-one/two figures the optimization log's relative deltas cite, so read the deltas there, the ratios here. Mean ms per iteration, ui (before this suite's off-engine work → after) / AG Grid / MUI X — **bold** marks a scenario where the ui number beats both rivals. The `before` column benches the pre-off-engine grid source through the same harness on the same machine, so the before/after is a true same-machine delta.

| Scenario | ui before | ui | AG Grid | MUI X |
| --- | ---: | ---: | ---: | ---: |
| mount · 1,000 × 8 | 7.3 | **4.9** | 11.0 | 9.7 |
| mount · 10,000 × 8 | 17.5 | **5.5** | 15.6 | 10.6 |
| mount · 100,000 × 8 | 157 | **16.0** | 50.1 | 25.4 |
| update · 10,000 × 8 | 15.8 | **3.0** | 5.3 | 19.8 |
| update · 100,000 × 8 | 155 | **12.2** | 54.2 | 24.5 |
| sort · 10,000 · flip | 24.8 | 9.5 | 9.8 | 6.5 |
| sort · 100,000 · flip | 162 | 40.2 | 23.1 | 31.3 |
| scroll · 10,000 · round trip | 235 | **206.7** | 217.0 | — |
| scroll · 100,000 · round trip | 218 | **206.7** | 246.3 | — |

The structural row-model lever landed, and the board turned over: the ui grid now beats **both** competitors on every mount and every update — the 100k mount ~3× under AG (16 vs 50) and the 100k update over 4× under it (12 vs 54). The whole linear term is gone from the untransformed paths, so mount and update barely move from 1k to 100k (5 → 16ms, 3 → 12ms) where the competitors climb. Scroll is unchanged here — that win landed earlier (#954's lazy truncation) and still beats AG; this PR left it flat, as the before/after shows.

#### Quick filter (2026-08-02, this container)

Added with the pure-core suite, so it carries no earlier baseline. Mean ms per iteration for one apply-and-clear cycle.

| Scenario | ui | AG Grid | MUI X |
| --- | ---: | ---: | ---: |
| filter · 10,000 · apply + clear | 51.1 | 65.6 | 46.9 |
| filter · 100,000 · apply + clear | 211.9 | 204.9 | 173.5 |

The suite's second open scenario, and the only one besides sort where the module does not lead: MUI takes both sizes (1.09× at 10k, 1.22× at 100k) and AG draws level at 100k. Filtering is the one path that still forces the engine's row model — `resolveActiveEngineTransform` counts a non-empty query as an active transform, so a filtered grid materializes a `Row` per datum, exactly the linear term levers 5–8 took off mount, update, and sort. The same off-engine treatment applies: a sole-filter grid can scan `rows` directly through the shared `columnAccessor`, as `sortRowsSmart` does. Below that sits the decode — a quick filter reads every searchable cell of every row on every keystroke — which is the same cached-`SortKey` lever sort is waiting on, over the same values.

Sort took the off-engine path too and closed most of its gap — 100k sort fell from 162 to 40ms (from 7× behind AG to 1.7×, from 5× behind MUI to 1.3×), and 10k from 25 to 9.5ms (now edging AG, still behind MUI's 6.5). A sort that is the grid's only transform now orders `rows` directly, off the engine, like mount and update — but it still trails both rivals at 100k, the suite's one open scenario. The 40-vs-23 residual is the decode: an asc↔desc flip re-derives every row's `SortKey` (the `parseNumeric` regex work) even though only the direction changed. The next lever is caching the decoded keys per (rows, column) so a flip re-sorts without re-decoding — a `WeakMap` keyed on the `rows` array, no manual invalidation — which should close the AG gap. Below that, the per-cell render is the last rung — a cell-tree diet (`GridDataCell` → `TableCell` → span) for the residual per-row constant.

#### React Compiler (2026-09-25, this container)

`pnpm bench:browser:compiler` runs the suite with the React Compiler on the `ui` source. This entry compares it with the plain run, after the engine boundary compiled in full. The table gives the ui grid only, in ms per iteration. Each value is the median over interleaved pairs of runs: four pairs for the grouped body and resize, and two pairs for the rest.

The contenders stay plain in both runs, so their change measures the noise. It reached ±43% between runs, so read only a change that each pair shows.

| Scenario | plain | compiled | change | each pair |
| --- | ---: | ---: | ---: | --- |
| mount · 1,000 × 8 | 24.3 | 24.0 | −1% | same sign |
| mount · 100,000 × 8 | 58.6 | 56.2 | −4% | mixed |
| update · 10,000 × 8 | 10.7 | 11.2 | +5% | same sign |
| update · 100,000 × 8 | 37.6 | 36.7 | −2% | mixed |
| sort · 10,000 · flip | 26.4 | 22.5 | −15% | same sign |
| sort · 100,000 · flip | 50.3 | 51.0 | +1% | mixed |
| filter · 100,000 · apply + clear | 226 | 228 | +1% | mixed |
| grouped body · collapsed rows live | 6.06 | 6.38 | +5% | mixed |
| grouped body · all expanded · rested | 6.39 | 6.64 | +4% | mixed |
| resize · 1,000 · `truncate` | 109 | 118 | +8% | same sign |
| resize · 3,000 · `truncate` | 219 | 228 | +4% | mixed |

The compiler is about neutral for the grid in this suite. Two changes held in each pair. The 10,000-row sort flip was 15% faster, over two pairs only. The 1,000-row resize with truncation was 8% slower, over four pairs. The first two pairs showed the grouped body slower, but the next two pairs reversed it.

A CPU profile of that resize took 20 toggles in each build. It put the script work at 765ms plain and 785ms compiled, about 1ms a toggle. The rest of the gap was in the frames that the sample waits out. Each resize then rendered the cells of all rows again in both builds. The compiled row kept its cells in a memo block that each resize made stale, so the block added its cache work. Entry 10 of the grid log removes that cost: a resize now renders no row, and the compiled resize is level with the plain one.

### Optimization log

Each entry names the change and the scenarios it moved.

1. **Cached natural collator** ([`grid-sorting-utilities.ts`](../../modules/grid/engine/grid-sort/utilities.ts)). The smart comparator's string fallback ran `localeCompare(…, { numeric: true })`, which re-resolves collation machinery on every call — O(N log N) times per sort; a shared `Intl.Collator` answers the same ordering. Sort 100k 1,562 → ~750, sort 10k 183 → ~104.

2. **Lazily-armed truncation measure** ([`use-truncation.ts`](../../hooks/use-truncation.ts)). Every mounted cell measured overflow (`scrollWidth` + two `Range`/element rect reads) in a layout effect on every commit — a scroll step remounts ~270 cells, and the census read ~350 of each per step, ~70ms of forced measurement for a flag that only gates hover/focus reveals no unvisited cell can show. The first pointer/focus contact now arms the element (a `flushSync` on the element-level event lands the state before the tooltip's root-delegated hover logic evaluates the same contact), and only armed elements re-measure. Scroll 10k round trip 3,627 → ~1,650, 100k 3,718 → ~1,680; update 100k 587 → ~435 (its remounted windows carried the same per-commit measures).

3. **Contact-mounted reveal machinery** ([`grid-cell-content.tsx`](../../modules/grid/grid-cell-content.tsx), `contacted` from [`use-truncation.ts`](../../hooks/use-truncation.ts)). Every data cell mounted the full floating-ui `Tooltip` hook stack to gate a reveal almost no cell ever opens — ~150µs of the ~250µs per-cell render, the largest single term in mount and scroll (measured by benching `cellTooltip: () => null` against the default). The stack now mounts on the first pointer/focus contact with a cell that measures truncated; the wrap reparents the span once at that mount, and the hook's callback ref re-binds its observation to the replacement node (the stranded-observer hazard that once kept the tooltip permanently mounted). Gating on *truncated*, not just contact, is a correctness condition too: an in-place editor lives inside the span, and a reparent triggered by its own focus or a passing pointer would tear down a focused editor holding a draft — a fitting cell stays a bare span through any contact. Scroll 10k 1,650 → 653 and 100k 1,680 → 655 (both now past AG); mount 1k 39 → 22 (past both); mount 10k 75 → 59; update 10k 73 → 47; plain 300-row mount ~700 → ~210, 500-row ~1,100 → ~340.

4. **Deferred observation, suspended drags, shared descriptors** ([`use-truncation.ts`](../../hooks/use-truncation.ts), [`grid-row.tsx`](../../modules/grid/grid-row.tsx), [`grid-cell-content.tsx`](../../modules/grid/grid-cell-content.tsx)). The width `ResizeObserver` and `fonts.ready` subscription defer to first contact with the rest of the reveal — an unvisited cell now costs two listener registrations and nothing else per mount or recycle. Truncation measurement stands down entirely while a column drag-resize is in flight (`suspended`; the reveal is held closed through a drag anyway) and the settle re-measures. The per-cell `{ kind: 'auto' }` tooltip descriptor and the static span/tooltip classes are shared module constants rather than per-render allocations.

5. **Lite-cell body path** ([`grid-row.tsx`](../../modules/grid/grid-row.tsx), [`grid-group-leaf-row.tsx`](../../modules/grid/grid-group-leaf-row.tsx)). The body rendered every cell through the engine — `table.getRow(key).getVisibleCells()` per row, `flexRender` per cell — which forced a TanStack `Row` object per datum even on a grid no sort, filter, or grouping had touched (the engine's row construction in the profile, the whole linear term). Rows now render straight from `renderRows` × `visibleColumns`, calling each column's `cell(row)` inline with no engine row or cell object between; the pointer handlers resolve a clicked cell against the column list instead of the engine cells. The grouped body kept engine cells at first. It now renders from the grid's plain group tree in the same way.

6. **Materialization gated on active transform** ([`use-grid-table.ts`](../../modules/grid/use-grid-table.ts) `resolveActiveEngineTransform`). With the body off the engine, the row model is built only when a transform is *actively* reshaping the rows — capability is not activity, so an empty sort list, a configured search with no query, and a filter surface with no entries all hand `rows` straight through. A plain mount and a data refresh no longer materialize at all. Mount 100k ~450 → 16 and update 100k ~440 → 13 (both now an order of magnitude past AG); mount and update stay near-flat 1k → 100k where the engine term used to dominate.

7. **Autosizer fingerprint off the row model** ([`use-grid-column-sizing.ts`](../../modules/grid/use-grid-column-sizing.ts), [`use-grid-table.ts`](../../modules/grid/use-grid-table.ts)). The column autosizer fingerprinted the rendered rows through `table.getRowModel()` — which alone materialized the engine model on every resizable-by-default grid, undoing lever 6. It now takes a `rowsSignature` (count and end keys) the grid already derived, so nothing touches the engine model on the plain path. The update bench's settle gained a one-frame yield per refresh ([`grid-update.bench.tsx`](grid-update.bench.tsx)): a synchronous contender otherwise settles in zero frames, so the harness chained dozens of `flushSync` refreshes in one tick with no paint between — an unrealistic cadence (a polling dashboard paints between refreshes) that piled the grid's one benign post-commit re-render into React's nested-update guard. The frame is near-free with the frame-rate limit off and lands on every contender alike; the post-commit re-render itself (a low-priority `update`-phase commit on a data swap, pre-existing and independent of these levers) stays open as a minor cleanup.

8. **Off-engine client sort** ([`grid-sorting-utilities.ts`](../../modules/grid/engine/grid-sort/utilities.ts) `sortRowsSmart`, [`use-grid-table.ts`](../../modules/grid/use-grid-table.ts) `useClientView`). Sort was the last transform still forcing the engine model — a plain sorted grid built a `Row` per datum and paid a per-comparison `WeakMap` + `Map` sort-key lookup on top. A sort that is the grid's *sole* transform now orders `rows` directly through `sortRowsSmart`, a decorate-sort-undecorate that decodes each row's `SortKey` once and sorts pre-decoded keys — matching the engine's `makeSmartSortingFn` exactly (empties last under both directions, multi-column priority, stable tie-break) so it interchanges with `getSortedRowModel` when a filter or grouping is also live. The column accessor the sort reads is the shared `columnAccessor` (one resolution sort, filter, aggregation, and export now all read through). Sort 100k 162 → 40 (from 7× behind AG to 1.7×, still trailing both rivals), 10k 25 → 9.5 (now edging AG, still behind MUI). The residual is the re-decode on a direction flip — the open `WeakMap`-cache lever above.

9. **Off-engine quick search** ([`search.ts`](../../modules/grid/engine/grid-search/search.ts) `searchRowIndices`, [`use-grid-table.ts`](../../modules/grid/use-grid-table.ts) `useClientView`, 2026-09-25, this container). The quick search was the last common transform that forced the engine model. TanStack Table v9 also made that model dearer: each filter pass gives each row two new objects. A search that is the only transform now runs off the engine, and a sort after it orders the kept rows. A property test holds the kept rows equal to those of the engine filter. Median of three interleaved pairs against the engine search: the 100k apply-and-clear cycle fell from 229.8 to 119.1ms (−48%, each pair −44% to −49%), and the 10k cycle fell from 58.1 to 47.6ms (−18%). At 100k the module now leads both contenders (AG 234.7ms, MUI 177.0ms), and at 10k it sits level with MUI. The contenders and the sort flips stayed within noise. A search next to pagination, a column filter, or grouping still runs in the engine.

10. **Settle through a store, not the rows** ([`settle.ts`](../../modules/grid/engine/grid-sizing/settle.ts) `GridSettleStore`, [`use-grid-truncation.ts`](../../modules/grid/use-grid-truncation.ts), 2026-09-25, this container). Each row took the settled width of every column as a prop, only so that a visited cell could measure its truncation again. A resize therefore rendered every row, and every cell of the resized column. The grid now publishes the settled widths to a store after each commit, and the store calls only the listeners of the changed columns. Only a visited cell subscribes, so a resize renders no row. Median of three interleaved pairs against the previous build, un-windowed, with truncation: 1k 109.3 → 97.1ms (−11%) and 3k 215.5 → 171.2ms (−21%). With the React Compiler: 1k 118.7 → 98.2ms (−17%) and 3k 225.7 → 168.1ms (−25%). The compiled 1k resize is now level with the plain one.

11. **Off-engine column filters** ([`filter.ts`](../../modules/grid/engine/grid-filter/filter.ts) `compileColumnFilters`, [`query-evaluate.ts`](../../modules/query/engine/query-evaluate.ts) `compileQuery`, [`use-grid-table.ts`](../../modules/grid/use-grid-table.ts) `useClientView`, 2026-09-25, this container). A column filter forced the engine row model, and the engine filter walked the query tree for each row. The grid now compiles each filter into a row test one time for each filter change. The compile drops each rule that puts no constraint on the rows, so a row walks only the rules that remain. The column filters and the quick search then run in one pass over the rows, when no pagination or grouping is live. Property tests hold the kept rows equal to those of the engine filter, and the compiled test equal to `evaluateQuery`. The new column-filter scenario gives the median of three interleaved pairs against `main`:

    | Scenario | `main` | branch | each pair |
    | --- | ---: | ---: | --- |
    | column filter · 100,000 · plain | 150.9 | 84.6 | −44%, −45%, −38% |
    | column filter · 100,000 · compiled | 142.3 | 91.4 | −43%, −36%, −31% |
    | column filter · 10,000 · plain | 51.4 | 48.7 | −2%, −11%, −11% |
    | column filter · 10,000 · compiled | 47.7 | 47.6 | mixed |

    At 100k the module now leads both contenders in one run on the same machine (AG 119.0ms, MUI 102.5ms). At 10k all three sit near 45ms. The quick filter and the sort flips stayed within noise in both builds. A filter next to pagination or grouping still runs in the engine.

12. **Build the row index map only for a cursor** ([`grid-data.tsx`](../../modules/grid/grid-data.tsx), 2026-09-25, this container). The grid built a map from each row to its index on each change of the rows, and only the cursor reads it. A grid with no cursor now skips it. Medians of three interleaved pairs: mount 100,000 rows 57.3 → 44.5 ms (−22%), update 100,000 rows 39.4 → 25.9 ms (−34%), and the 10,000-row mount and update 10% to 12% faster. The contenders held level or got slower in the same pairs. A run without this change put the 100,000-row mount back at 58 ms and the update at 36 ms, so this change carries the mount, and most of the update. The same change set removed three render fan-outs, which no bench here times. The start and the end of a drag no longer render each truncating cell. A row that opens for edit renders only its own cells. The engine no longer holds a copy of the selection.

13. **Off-engine client pagination** ([`use-grid-table.ts`](../../modules/grid/use-grid-table.ts) `useClientView`, [`views.ts`](../../modules/grid/engine/grid-table/views.ts) `buildPaginationView`, [`grid-pagination-utilities.ts`](../../modules/grid/engine/grid-pagination-utilities.ts) `pageCountOf`, 2026-09-25, this container). Pagination forced the engine row model, so a paginated grid built a `Row` for each datum on mount and sorted through the engine. The grid now slices the page from its own view, after the filters and the sort. The footer counts the pages itself, by the rules of the engine. A manual pagination no longer builds the engine model either. Only grouping, or a filter that only the engine can apply, still builds it. A property test drives `useGridTable` against a stock engine table with random rows, filters, sorts, and pages, and holds the rows, the keys, and the page totals equal. The new pagination scenario gives the median of three interleaved pairs against `main`:

    | Scenario | `main` | branch | each pair |
    | --- | ---: | ---: | --- |
    | paginate · 100,000 · mount · plain | 159.5 | 28.1 | −83%, −83%, −81% |
    | paginate · 100,000 · mount · compiled | 172.6 | 26.7 | −84%, −85%, −85% |
    | paginate · 100,000 · sort flip · plain | 140.5 | 21.2 | −84%, −86%, −84% |
    | paginate · 100,000 · sort flip · compiled | 126.5 | 21.0 | −81%, −83%, −84% |
    | paginate · 10,000 · mount · plain | 42.0 | 28.1 | −32%, −35%, −32% |
    | paginate · 10,000 · sort flip · plain | 29.1 | 22.2 | −20%, −26%, −22% |

    The page flips stayed within noise, since both paths slice a cached order. At 100k the module now leads both contenders on the paginated mount (AG 160.3ms, MUI 84.2ms) and the paginated sort flip (AG 68.1ms, MUI 89.7ms). The quick filter and the column filter stayed within noise over seven pairs, with a median change of 4% or less.

14. **Off-engine grand total** ([`use-grid-table.ts`](../../modules/grid/use-grid-table.ts) `useGrandTotalRows`, [`grid-aggregate.ts`](../../modules/grid/engine/grid-aggregate.ts) `cachedAggregate`, 2026-09-25, this container). A grand total read the filtered model of the engine, so a grid with a total built a `Row` for each datum on mount, even with no filter. Each render of the total row also parsed every cell of each summed column again. The total now reads the rows that the client view already keeps, and each aggregate is computed one time for each row array and column. A property test holds the rows of the total equal to the filtered rows of the engine. The new grand-total scenario gives the median of three interleaved pairs against `main`:

    | Scenario | `main` | branch | each pair |
    | --- | ---: | ---: | --- |
    | total · 100,000 · mount · plain | 204.0 | 49.2 | −77%, −78%, −75% |
    | total · 100,000 · mount · compiled | 198.0 | 46.6 | −77%, −76%, −77% |
    | total · 100,000 · filter + clear · plain | 250.2 | 106.7 | −52%, −57%, −63% |
    | total · 100,000 · filter + clear · compiled | 227.9 | 99.3 | −57%, −54%, −60% |
    | total · 100,000 · sort flip · plain | 44.6 | 35.6 | −17%, −21%, −24% |
    | total · 100,000 · sort flip · compiled | 38.7 | 34.7 | −10%, −27%, −10% |
    | total · 10,000 · mount · plain | 39.6 | 27.1 | −43%, −28%, −26% |

    The sort flips and the quick filters with no total stayed within noise in both builds. A grouped grid still reads the total from the engine, which builds its model for the groups.

## Maps

### Methodology

Every scenario draws the same prepared `us-atlas` geometry ([`map-fixtures.ts`](map-fixtures.ts)) into the same fixed 800×450 box with animations off, joined to the same LCG-seeded rows by FIPS id, through each library's idiomatic API ([`map-contenders.tsx`](map-contenders.tsx)): the ui module renders `MapPlat` through React, Highcharts Maps and ECharts through their vanilla factories. AG Charts sits this suite out — its map series is enterprise-only, so the community package the chart benches run has nothing to enter. ECharts paints through zrender's animation-frame loop, so its adapter flushes the pending frame synchronously (`getZr().flush()`) after every option set, the way the AG chart adapter awaits `waitForUpdate()`.

The geometry is the conterminous US — `states-10m` (49 regions) and `counties-10m` (3,108 regions), territories and the non-conterminous states filtered for every contender alike. The rivals ship no free US composite: their US idiom is a Lambert conformal conic, which Alaska's antimeridian crossing would smear across the projected plane, shrinking their fitted map to a fraction of the frame while the ui module's `albers-usa` insets fill it — the lower 48 is the largest geometry all three project comparably. Projections are each library's US idiom from there: the ui module's `albers-usa` composite, Highcharts' Lambert conformal conic (its own custom-US-map guidance), and that same conic for ECharts through its documented d3-geo projection hook.

- [`map-mount.bench.tsx`](map-mount.bench.tsx) — full mount-to-painted-DOM plus teardown per iteration, at steady state: each library's one-time geometry setup (the ui module's static-geometry cache, ECharts' `registerMap`, whatever Highcharts caches on the topology) warms during the uncounted warmup iterations, so the timed region is the remount a dashboard actually pays. The cold decode-and-fit path keeps its own jsdom bench (`map-render`).

- [`map-update.bench.tsx`](map-update.bench.tsx) — recolor on a live map, alternating two same-shape datasets: re-zoning every region in the categorical scenarios, re-valuing every region in the choropleth. The ui module re-renders through its root; Highcharts and ECharts take their in-place data updates. Geometry never changes — an update moves data, not the atlas.

- [`map-hover.bench.tsx`](map-hover.bench.tsx) — a 20-step pointer sweep across the plot plus one settled frame. Every contender receives the same `pointermove` + `mousemove` pair per step; the dispatch target differs the way the libraries' interaction stacks do — Highcharts and ECharts hear moves on their container and hit-test from coordinates in script, while the ui module's regions are their own hit targets (the browser's native SVG hit test retargets a real pointer, costing no contender script time), so its per-step targets resolve to the region under each point once, outside the timed region.

- [`map-emphasis.bench.tsx`](map-emphasis.bench.tsx) — a legend-emphasis flip on the live county atlas: emphasize the first category (every region outside it recedes), settle two frames, release, settle again. The ui module and Highcharts take real pointer events on their legend UI — the switchboard chip; the data-class legend item, whose hover sets the other 2,337 points inactive — while ECharts' piecewise visual map draws on canvas, unreachable by a synthetic pointer without brittle pixel targeting, so it takes its documented `dispatchAction` highlight / downplay over the category's rows with `emphasis.focus: 'self'`, the programmatic form of the same hover link.

- [`map-overlay.bench.tsx`](map-overlay.bench.tsx) — the overlay marks, which every scenario above draws none of. Three describes, and the only ui-only ones in the suite: the rivals' marker layers are a different feature with a different contract, so these measure the module against itself rather than against the market. Two hundred dots mount as one `MapPoints` against one `MapPoint` each — the plural form registers one legend entry where the singular pays two hundred state commits. The same dots then mount over a coverage territory (`COVERAGE_AREA`: every conterminous state's rings, 140 of them, ~9,900 vertices), and a third describes notches that scene's zoom in and back out from the plot's own keyboard. The zone scenarios exist because a dot on a zone sizes its pointer target against the room that zone can spare, so every dot reads every visible zone once per rebuild — a coupling no bench on bare geography can see, and one that shipped a regression before these existed. Reintroducing it scores the mount at 23.7ms against 12.9 and the zoom cycle at 60.2 against 48.0, both far outside their ~5% run-to-run spread.

Fairness notes, both directions: the ui module keeps its built-in accessible output — the visually-hidden region table, deferred one low-priority commit behind the geography — while Highcharts runs without its optional accessibility module; every contender's default legend stays on (the ui switchboard, Highcharts' data classes, ECharts' visual map); the categorical scenarios pin the same four zone colors and the choropleth the same five-stop ramp everywhere; the ui module pays React reconciliation the vanilla factories don't, and that is the product being measured. One county (Falls Church, VA) projects below sub-pixel size and draws no path in the ui module, so it renders 3,107 paths to the rivals' 3,108.

### Standings (2026-07-10, this container)

Mean ms per iteration, ui / Highcharts Maps / ECharts — **bold** marks a scenario where ui beats both.

| Scenario | ui | Highcharts | ECharts |
| --- | ---: | ---: | ---: |
| mount · states · 49 × 4 zones | **6.8** | 29.0 | 20.4 |
| mount · counties · 3,108 × 4 zones | **102.4** | 339.2 | 287.3 |
| mount · counties choropleth · 3,108 | **101.5** | 331.4 | 305.8 |
| update · states · re-zone | **0.6** | 11.8 | 19.6 |
| update · counties · re-zone | **9.1** | 224.3 | 286.5 |
| update · counties choropleth · re-value | **11.2** | 208.8 | 282.4 |
| hover · states · sweep | **12.5** | 17.9 | 12.6 |
| hover · counties · sweep | **9.3** | 18.7 | 25.8 |
| emphasis · counties · isolate zone + release | **62.0** | 291.4 | 131.6 |

(Every contender's absolutes ran ~1.6× an earlier same-day session here — container drift; the ratios are the comparison.) The module beats **Highcharts Maps on all nine** scenarios and **ECharts on eight, with the ninth a dead heat**: the states hover sweep — the suite's one standing deficit, the React-commit-per-crossing residual shared with the chart suite's scatter hover — reads 12.5 vs ECharts' 12.6 by mean since the layer-recede round, without the imperative-DOM trade (by median it still trails, ~17 vs ~13: an iteration that commits waits out the settle frame, one that converges on its previous end state bails at sub-millisecond cost). The choropleth's mount premium over the categorical map is fully erased, and the emphasis flip — the layer-recede round's own scenario — runs 2.1× ahead of ECharts' focus actions and 4.7× ahead of Highcharts' inactive-state hover: one recede transition plus the lit copies against their per-point state writes. The updates are not close — 19–31× — because the memoized region layer holds its geometry and React recolors fills in place, while the rivals rebuild their scene from the new data; that is the dashboard refresh path the module was shaped for.

### Optimization log

The baseline run (suite as first landed) had the counties mounts at 476–505ms against rivals near 200–235, every mount trailing both; three levers closed it, sized by a stub-probed breakdown of the 476ms categorical mount before any landed.

1. **Deferred region table** ([`map-plat.tsx`](../../modules/map/map-plat.tsx), `useDeferredValue`) — the chart suite's lever 2 applied to the map. The visually-hidden table renders one row per region, ~190ms of the county mount's urgent render; the geography now commits first and the table hydrates a low-priority beat behind, and a data update's urgent recolor no longer carries the 3,108-row re-map either (counties update 15.1 → 8.3, choropleth 17.6 → 7.7). Parity unchanged — the table always converges, one commit behind.

2. **Flattened static region tree** ([`map-regions.tsx`](../../modules/map/map-regions.tsx)). Every region carried a `<g>` wrapper whose only job was the legend-emphasis dim; a static map now carries the dim class on the path itself, halving the region layer's element count (~40ms of the county commit). The wrapper survives under `animate`, where the dim's opacity transition would collide with the color wash's `transition-colors` on one element.

3. **Measured-paths memo** ([`map-geometry/cache.ts`](../../modules/map/engine/map-geometry/cache.ts) `measuredRegionPaths`). The measured refit reprojected and restringified every region on each mount — ~116ms on the county atlas — though for a named projection it is a pure function of the cached geometry and the frame box. The shared cache now keeps the last measured fit's paths per geometry (one slot; a resize replaces it), so a remount at the same box — a tab switch, a dashboard's small multiples — reuses them the way the canonical stage already reused its fit. States mount 24.3 → 4.7, counties 476 → 113, choropleth 505 → 139: every mount now ahead of both rivals.

4. **Slot-less region paths** ([`map-regions.tsx`](../../modules/map/map-regions.tsx)). A bare-`<path>` floor probe put the county mount ~30ms above it, and bisecting the per-region props landed the whole gap on one attribute: `data-slot="map-region"`. The stylesheet carries `[data-slot=…]` attribute selectors for other components, so every element bearing the attribute pays attribute-rule matching at first style resolution — 3,108 paths × the sheet's `data-slot` rules, for an anchor nothing styles by. Regions now anchor on `data-region-index` alone (free — no selector in the sheet reads it, and the hover provider's scroll resolve already read it); the layer keeps its `map-regions` slot, and the tests and this suite's sweep resolver target the index attribute. Counties mount 94.6 → 61.0 on this container.

5. **Attribute fill for numeric bins** ([`map-regions.tsx`](../../modules/map/map-regions.tsx)). The choropleth's bin color rode a per-region inline `style`, and 3,108 CSSOM style declarations priced ~24ms — nearly the whole categorical → choropleth mount gap. The color now rides the `fill` presentation attribute: a value paint never carries a fill class, so nothing in the cascade sits above it, and the color wash's `transition-colors` animates either way. Choropleth mount 123.5 → 68.6 with lever 4, update 6.6 → 6.1.

6. **Per-category paints, memoized regions, and a snap dim** ([`map-region/paint.ts`](../../modules/map/engine/map-region/paint.ts) for the paints, [`map-regions.tsx`](../../modules/map/map-regions.tsx) for the memoized `Region` and its track handler, [`kata/map`](../../recipes/kata/map.ts) `region.dim`). Two edge probes motivated this: a legend-focus flip on a live county atlas cost ~990ms settled — ~85% of it the ~2,300 simultaneous per-path `transition-opacity` runs, the rest a 3,107-component re-render — and the pointed-mark isolation (#952) put that same shape on every region crossing, doubling the counties hover sweep (8.6 → 17.1 on its container). Three moves land together: each category's classes and fill resolve once for the whole layer (they resolved once for each region; now once for each category); `Region` is memoized on resolved primitives with one shared track handler reading the index off the path's own anchor attribute, so a crossing re-renders the two regions whose dim flipped rather than the atlas; and the region dim snaps (`k.region.dim`, deliberately transition-free) instead of fading — an untransitioned opacity also composes with the wash's `transition-colors` on one element, so the `animate` wrapper is gone and an animated tree is one element per region too. Legend flip 990 → 142ms settled; the counties hover sweep back ahead of both rivals with sub-millisecond bail iterations; mounts and updates hold their ratios.

7. **Layer recede with lit copies** ([`map-regions-lit.tsx`](../../modules/map/map-regions-lit.tsx), wired from [`map-regions.tsx`](../../modules/map/map-regions.tsx)). The chart marks' own isolation pattern (its levers 3–4: dim the group, redraw the lit mark over it) applied to the region layer, superseding lever 6's snap: the emphasis dim moves off the individual paths onto one recede wrapper (`k.group` at the layer — one transition), and the emphasized marks redraw lit above it, `pointer-events-none` copies over identical geometry — the pointed region alone, or a legend focus's whole category. The enter/leave fade lever 6 traded away returns at one animated element instead of thousands, `k.region.dim` and the per-region dim machinery go, and the base tree is blind to the shared emphasis: a crossing re-renders one copy path where lever 6 still ran 3,107 memo compares. Legend flip 142 → 56ms settled (990 before lever 6 — now faster *and* fading again); counties hover 15.2 → 9.3; states hover 16.8 → 12.5, pulling the suite's one open deficit to a dead heat with ECharts' canvas without the imperative-DOM trade. Lever 6's per-category paints, memoized `Region`, and shared track handler stay — they now serve toggles and the reveal. The flip graduated into the suite as its own competitive scenario ([`map-emphasis.bench.tsx`](map-emphasis.bench.tsx)).

8. **One projection walk per atlas** ([`map-geometry/projected.ts`](../../modules/map/engine/map-geometry/projected.ts), read from [`map-geometry/cache.ts`](../../modules/map/engine/map-geometry/cache.ts)). A map draws the atlas under two fits in one mount and another on every resize, and each streamed every coordinate through d3-geo afresh. The geography is now walked once into a flat buffer of frame coordinates and each fit's paths are emitted from it by arithmetic — sound because two fits of one projection differ by a scale and a translation on the frame, the same fact `scaleCanonicalFit` already derives the measured fit from, and checked per emit against a witness position the buffer keeps rather than assumed. The strings come out byte for byte identical wherever d3 would resample the geography alike at both fits, which every quantized atlas satisfies; a sparse polygon at a frame far from the one the buffer was drawn at parts by vertex density along a curve, never by placement, and both halves are pinned across `states-10m` under `albers-usa`. Formatting turned out to be 21.0 of the emit's 22.4 ms — one decimal divides to a tenth no double holds, so every coordinate took V8's shortest-representation search — so the emit formats from the integer `Math.round` already produced. Counties 246.3 → 12.8 ms per fit and states 33.4 → 2.0 ms on the new `map-compute` rung; the counties mount 230.4 → 170.9 ms and the states cold rung 94.2 → 80.0 ms on `map-render`. Deliberately invisible in the table above, which is why the rung landed in `map-compute` rather than as a scenario here: this suite warms the cross-instance caches in its uncounted iterations, so the pass is already paid before it times anything and every scenario reads unchanged — what the lever moves is the first county map on a page, and every resize after it, where a drag re-drew the whole atlas at each committed size because the measured slot holds one box.

9. **The fit measured from the buffer** ([`map-geometry/projected.ts`](../../modules/map/engine/map-geometry/projected.ts) `probeCanonicalFit`, with d3's fit arithmetic factored into [`map-projection/resolve.ts`](../../modules/map/engine/map-projection/resolve.ts)). Lever 8 left two walks over the same coordinates a step apart: `fitProjectionWidth` streamed the geography at a probe scale to read its bounds, and the buffer streamed it again to record the points. Bounds are a scan of those points, so one walk now does both — counties 124.8 + 144.2 → 132.9 ms, states 16.1 + 18.1 → 16.2 ms, and the states cold rung 80.0 → 48.9 ms on `map-render`. The buffer is drawn at probe scale and read several times larger, so the probe walk resolves a curve four times finer than d3's default (`PROBE_REFINEMENT`), which costs a quantized atlas nothing — `counties-10m` streams the same 63,888 points either way — and keeps the frame bit-identical and every path byte for byte the walk's own. Invisible here for lever 8's reason; the cost is that a `deferPaint` map now retains the buffer whether or not it paints, traded against the bounds walk it no longer runs.

10. **The refit as a transform, not a rewrite** ([`use-map-shape.ts`](../../modules/map/use-map-shape.ts) `regionFrameFor`, applied in [`map-regions.tsx`](../../modules/map/map-regions.tsx)). The measured fit is a scale and a translation on the canonical one, so the region layer carries the paths it already drew under one group transform instead of emitting them again and rewriting every `d`. In isolation: 3,107 `d` attributes plus forced layout 47.05 ms against 0.15 ms for the transform. End to end, a settled county resize 88.96 → 53.95 ms — ~35 ms of that is the two frames the measurement waits out either way, so the work falls ~54 → ~19 ms. Constant-pixel specs in that layer divide by the frame's scale on top of the zoom scale, so a seam stays one device pixel; overlays, chrome and hit targets are untouched, still placed in measured units.

	Invisible in the mount and update rows, and this time for a reason worth recording: `mountBenches` tears down inside the same microtask, and the refit rides the plot frame's transition priority, so it never commits before teardown. The rows above read the same either side of this change — measured by stashing it and re-running, not by comparing against a figure from another session, which is how container drift once made this lever look 2× larger than it is.

Probed and rejected — **a direct projection walk in place of d3's stream**. The walk is what a mount now costs, and almost none of it is projection: `geoStream`'s structural pass over `counties-10m` is 1.6 ms and calling `projection(point)` on every coordinate is 16.8 ms, against 180–209 ms for the same geography through `geoPath`. The rest is the pipeline — antimeridian preclip, the resample stream, the clip extents, and a stream adapter per layer — and `albers-usa` pays it three times over, because `geoAlbersUsa` multiplexes every coordinate through all three sub-projections whatever accepts it (geography holding only lower-48 counties still costs 179.6 ms against mercator's 67.4). It does not survive the guard it needs. d3 subdivides a segment only when its squared frame chord exceeds `4 · delta2`, which is cheap and exact to test — but it is a *necessary* condition, not a sufficient one, and the three inner tests that follow read the raw projection at the great-circle midpoint of *rotated* coordinates, neither of which d3 exposes. Testing only the necessary condition is sound and takes 88% of county features at probe scale (blended 37.6 ms against 207.6, zero mismatches) while taking 11% of states, 2% of the world atlas under equal-earth, and none of it under mercator — the win needs many small features, and it needs `PROBE_REFINEMENT` back at 1, which is the sparse-geography guard above. Approximating the inner tests instead — a lon/lat midpoint rather than the great-circle one — takes 97% and draws one country wrong out of 175. Reopen only with a faithful port of `resample`'s recursion, and only for a consumer whose geography is counties-shaped.

Probed, not landed: lazy value labels (the chart's lever 7 shape — the region value labels off the urgent render) measured ~2.7ms on the choropleth mount, the default `String` format being nothing like the chart's per-cell `Intl` work; dropping the `hover:brightness-110` filter measured ~1.1ms of the states sweep; the destroy half of the mount-plus-teardown scenarios measured ~10ms of ~150. Each priced below its complexity. Path precision was already spent when the module landed (`REGION_PATH_DIGITS = 1` — the chart's lever 6 shape).

Open: nothing stands beaten against the module by mean — the states hover sweep's residual median gap (~17 vs ~13, the settle frame around a committing iteration) is the last trace of the React-commit-per-crossing trade, shared with the chart suite's scatter hover.

## Menus

This suite keeps no standings. `Menu` has no contender here. It runs in a browser because jsdom prices two of its paths wrong.

### Methodology

Every probe ([`menu-probe.tsx`](menu-probe.tsx)) mounts one open dropdown. It settles three frames, so the engine has placed the panel. It then hands the bench that menu's trigger and its rows. Focus rests on the trigger, so the rows rove by `aria-activedescendant` — the model the jsdom suite also drives. Nothing settles a frame inside a timed region, so no sample reads the frame period rather than the work. The row centers are resolved at mount, so no sample carries the layout read that resolving them needs.

The open bench is the one exception. It mounts that same `Dropdown` closed, and clicks it open.

- [`menu-keyboard.bench.tsx`](menu-keyboard.bench.tsx) — one `keydown` on the trigger. `dispatch only` carries a key no handler acts on, and is the floor to subtract. Each row count runs twice, capped and uncapped. A capped panel has a real scroller for the roving move to find. An uncapped one — the default — has none. The typeahead rung fires the buffer's idle reset after each press, on a fake clock, so each press starts from an empty buffer. A floor rung prices that clock.

- [`menu-pointer.bench.tsx`](menu-pointer.bench.tsx) — one sweep, which visits every row of the panel once. The second scenario repeats the 24-row sweep with a submenu open. Each arrival then lies on the course into that panel, so it measures the panel, passes the travel test, and leaves the cursor where it is.

- [`menu-open.bench.tsx`](menu-open.bench.tsx) — one click on a closed menu. The timed region is the commit the click drives, from the event to the panel in the DOM. It stops there, because the engine places the panel a frame later. A second scenario re-renders a panel that is already open, which is what a reposition does. A third prices one `cn` call on the panel classes, so a reader can weigh it against the first two.

- [`menu-mount.bench.tsx`](menu-mount.bench.tsx) — fifty closed menus, mounted and torn down. Four rungs ladder the shell apart, each containing the one above it, so a step is what that layer costs across the whole fan-out. A second scenario mounts one open 24-row panel, plain and with six of its rows as submenus. The step over six is what one `MenuSub` costs above the `MenuItem` it replaces.

### Findings (2026-09-22, a third container)

Mean ms per press, and per sweep, in Chromium, median of three runs. The whole table was measured in one session, on a container slower than the one the 2026-09-21 figures came from, so its rows read against each other only.

| Scenario | 8 rows | 24 rows | 64 rows |
| --- | ---: | ---: | ---: |
| `keydown`, no handler acts | — | 0.025 | — |
| ArrowDown · uncapped | 0.178 | 0.176 | 0.207 |
| ArrowDown · capped | 0.174 | 0.187 | 0.227 |
| typeahead · one letter | 0.190 | 0.205 | 0.234 |
| pointer sweep · one pass | 0.169 | 0.536 | 1.555 |
| pointer sweep · submenu open | — | 0.433 | — |

The fake clock that the typeahead rung carries costs 0.003 ms a press.

**The scroll-ancestor walk is a jsdom artifact.** The jsdom rove rung reads about 1.4 ms per arrow press. An ablation there puts nine tenths of that on the `getComputedStyle` walk which looks for a scroll container. Chromium charges 0.18 ms for the whole press, 0.15 ms of it above the dispatch floor. Giving the walk a scroller to find moves that by 0.02 ms or less. The jsdom engine resolves style in JavaScript, so it prices the walk far above the browser. No change is warranted, and `../menu.bench.tsx` now says so where a reader meets the number.

**Typeahead costs about one arrow press.** Every label starts with the letter, so each press stops at its first candidate and moves the cursor one row. An earlier version of the rung let the buffer grow by one letter on each iteration, so the match walked a longer query each time. That is why the 2026-09-21 table read 8 rows as slower than 24.

**The travel test costs less than the move it replaces.** With a submenu open, an arrival on the course into its panel reads the panel's rect, passes the test, and returns before it moves the cursor. A 24-row sweep then costs 0.433 ms, against 0.536 ms with no submenu open, where every arrival moves the cursor. The geometry that replaces a hover timer therefore costs nothing a reader could feel. An earlier version of the rung sent each arrival to its row's center, which shares the parent row's x. The first arrival failed the test and closed the submenu, so the rung timed a plain sweep, and its 0.327 ms against 0.324 compared a sweep with itself.

### The open: what a click costs (2026-09-21, a slower container)

This is the path a reader waits on, and it had no rung until now. Mean ms for one open, median of three runs.

**This table comes from a different container from the tables above and below, and that container is slower.** The closed-menu fan-out rung reads 1.953 ms there and 2.872 ms here. Read rows inside one table against each other, never across the two.

| Rung | Median | Above the floor | Per row |
| --- | ---: | ---: | ---: |
| never opened (the floor) | 0.313 | — | — |
| open · empty panel | 2.960 | 2.647 | — |
| open · 8 rows | 3.593 | 3.280 | 0.079 |
| open · 24 rows | 5.137 | 4.824 | 0.091 |
| open · 64 rows | 8.917 | 8.604 | 0.093 |

**Read every figure below as an upper bound on the open alone.** The floor tears down a closed tree, while each rung above it tears down what the open built. A closed floor cannot subtract an open teardown, so the step is the open plus that teardown. The shares and the shape hold; the absolute milliseconds run high by whatever the teardown costs.

**The shell is the open, not the rows.** An empty panel costs 2.65 ms above the floor. That is the portal, the positioned wrapper, the animated surface, the `Density`, and the viewport, with nothing in it. A 24-row panel costs 4.82 ms, and 55% of that is the shell. Even at 64 rows the shell is 31%.

**A row costs about 0.09 ms.** Eight rows read 0.079 ms each and sixty-four read 0.093, so the panel is very nearly linear in its row count. These rows carry a `MenuLabel` and nothing else. A row with an icon costs the `## Icons` rung on top.

Holding the panel open is a different order of cost. Mean ms for one re-render of an open panel, median of three runs.

| Scenario | Median |
| --- | ---: |
| no rows (what a reposition rebuilds) | 0.103 |
| 24 rows | 0.176 |

**A reposition costs 0.103 ms.** It re-renders `Menu`, `MenuTrigger`, `MenuContent`, `FloatingSurface`, and `PopoverPanel`. The rows keep their element identity and stand, so the 24-row figure is the upper bound a change that reached them would pay. A panel that repositions for a whole second of scrolling therefore spends about 6 ms, against 4.8 ms to open once.

**The `cn` memo miss on the panel classes costs nothing a reader could feel.** `cn` memoizes only string, boolean, and nullish arguments, so `PopoverPanel`'s array bundles take an un-memoized merge on every render. Priced directly, that call costs 1.01 µs where a pre-flattened string costs 0.25 µs. The saving is 0.77 µs.

The call count is the rest of the answer, and it was counted rather than assumed. An open of a 24-row panel makes two such calls, and a re-render makes one. Pre-flattening the bundles would therefore take 0.03% off an open and 0.7% off a reposition. The worst shape in the component is a `MenuDescription` on every row, whose recipe value is an array as well: twenty-four rows make 26 calls, which is 0.020 ms of a 4.8 ms open, or 0.4%.

**No change is warranted.** The saving is two orders of magnitude below the run-to-run spread of the rung it would land in, so no bench in this suite could show it. The `cn` doccomment's ~13% figure is a ten-thousand-row grid, where the call runs once per row per render. A panel is one element, and the arithmetic does not carry across.

### Where the empty shell goes (2026-09-22, a slower container)

The open table above leaves 2.65 ms on an empty panel and names no layer. [`menu-shell.bench.tsx`](menu-shell.bench.tsx) ablates it. Every rung mounts one empty open surface and tears it down, so a step is what that layer costs on one open. Mean ms, median of three runs. These tables predate the gate in the next section, so the static and dropdown rungs still carry the overflow watch.

| Rung | Median | Step |
| --- | ---: | ---: |
| 1 · plain div | 0.106 | — |
| 2 · motion.div | 0.229 | 0.123 |
| 3 · AnimatePresence + motion.div | 0.258 | 0.030 |
| 4 · PopoverPanel | 0.252 | — |
| 5 · static menu (no portal, no positioning) | 0.744 | 0.493 |
| 6 · open dropdown (the real thing) | 1.800 | 1.056 |

**The floating layer is 62% of the shell.** It costs 1.06 ms of the 1.69 ms an open dropdown spends above a plain div. `static menu` is the ablation the library already ships: `MenuContent` gates the portal on `isStatic`, so that rung builds the same panel with no portal, no positioned wrapper, and no `autoUpdate`.

**`PopoverPanel`'s own hooks are free.** The roving handler, the scroll-within helper, and the autofocus effect do not separate from the rung below them. Its cost is the `motion.div`, at 0.123 ms, and `AnimatePresence` at 0.030. Motion was the first suspect and it is 9% of the shell.

Most of the floating layer is the engine, not the wrapper. These rungs read floating-ui directly, against a plain `div`, so nothing of this package is in them.

| Rung | Median | Step |
| --- | ---: | ---: |
| 1 · button + plain div | 0.104 | — |
| 2 · useFloating, no autoUpdate | 0.389 | 0.285 |
| 3 · useFloating + autoUpdate | 0.600 | 0.211 |
| 4 · + FloatingPortal | 0.749 | 0.149 |

**`autoUpdate` costs 0.211 ms, which is 12% of the whole shell.** The default options start a `ResizeObserver` on both elements and an `IntersectionObserver` for the layout-shift watch, and they walk the scroll ancestors. The positioning pass and its middleware cost 0.285, and `FloatingPortal` 0.149. Those three are 0.645 of the 1.056, so the rest — about 0.41 — is `FloatingSurface`, `PresencePortal`, and `MenuTrigger`.

The other 25% is `MenuContent`. Split at the `Menu` root:

| Rung | Median | Step |
| --- | ---: | ---: |
| 1 · Menu root only (no panel to build) | 0.183 | — |
| 2 · + MenuContent, static | 0.754 | 0.571 |

The root's whole hook tree is 0.077 ms above a plain div, so `MenuContent` is 0.571 of it. `PopoverPanel` accounts for 0.146. One hook accounts for most of the rest.

| Rung | Median | Step |
| --- | ---: | ---: |
| 1 · plain div | 0.099 | — |
| 2 · + useScrollOverflow | 0.233 | 0.134 |
| 3 · + Density around it | 0.222 | — |

**`Density` is free. The overflow watch is not.** `useScrollOverflow` reads `scrollTop`, `clientHeight`, and `scrollHeight` the moment its ref attaches, which forces style and layout on a node the browser has just inserted. It then starts a `ResizeObserver` over the node **and each of its children**, a `MutationObserver`, and a scroll listener.

That per-child `observe` makes the watch scale with the row count, so it lands in the open table's per-row figure as well.

| Rung | Median | Watch |
| --- | ---: | ---: |
| 24 rows · plain | 0.189 | — |
| 24 rows · watched | 0.938 | 0.749 |
| 64 rows · plain | 0.325 | — |
| 64 rows · watched | 1.919 | 1.594 |

**The overflow watch reads as about a third of what a row costs to open.** It runs 0.031 ms per row at 24 rows and 0.025 at 64, against the 0.09 ms the open table charges for a whole row. On a 24-row menu it is 0.75 ms of rows plus its own 0.13 ms. This is a mount-bench figure, and it overstates the open path; the correction follows below.

**On the default menu it can never fire.** `capped` defaults to `false`, and an uncapped viewport carries no `max-h`, so it grows with its content. Measured directly, and pinned by [`menu-scroll-overflow.test.tsx`](../../__tests__/browser/menu-scroll-overflow.test.tsx): at 8, 24, and 64 rows an uncapped viewport reads `clientHeight === scrollHeight`, and neither overflow attribute is ever stamped. Only a capped panel overflows, at any size. The watch therefore starts a `ResizeObserver` per row, a `MutationObserver`, and a forced layout read, to maintain two attributes that cannot change.

**The mount bench overprices the watch, and most of the gap is deferred layout.** The watched arm reads `clientHeight` as its ref attaches, which forces a layout the plain arm never triggers before its teardown. Force the same layout on both arms, and the gap collapses. The 24-row gap falls from 0.749 ms to 0.028, and the 64-row gap from 1.594 to 0.068. What the gate removes is the observer setup and one forced read, not a per-row layout pass. The layout itself is work the panel owes at paint either way.

### Gating the overflow watch (2026-09-22, this container)

The watch is now gated on `capped`. Since lever 6, [`MenuViewport`](../../components/menu/menu-viewport.tsx) reads that flag through `useMenuCapped` and passes it to the hook as `enabled`, and the flag is what emits the `max-h`. An uncapped viewport's ref therefore attaches and does nothing, so the default menu wires no observer it can never use.

The open path was measured before and after, back to back in this session. The prior file was restored and re-run, rather than compared against a figure from an earlier hour. Mean ms for one open, median of three runs.

| Open | Before | After |
| --- | ---: | ---: |
| empty panel | 3.182 | 3.214 |
| 8 rows | 4.156 | 4.185 |
| 24 rows | 5.843 | 5.778 |
| 64 rows | 10.183 | 9.667 |

**These medians read at the noise floor.** Each rung tears down what the open built, and the container drifts run to run, so the teardown and the drift swamp the saving. The 24-row and 64-row rungs move the right way; the empty and 8-row rungs do not.

A tighter ablation toggles the ref in one process, so no cross-run drift enters and the empty shell is torn down the same way on both arms. It reads the open commit directly. Mean ms, median of five runs.

| Open commit | Wired | Gated |
| --- | ---: | ---: |
| 24 rows | 4.690 | 4.474 |
| 64 rows | 8.931 | 8.706 |

**The gate saves about 0.22 ms of the open commit at both sizes, or 4.6% at 24 rows.** That is the forced read and the observer setup, removed from the synchronous region a click handler blocks on. The layout the watched arm forced still runs at paint, so the saving is the duplication, not a whole reflow.

**The mount bench projected 0.88 ms, or 18% of a 24-row open, and that figure does not survive the reflow control.** The projection counted deferred layout as removed work. The real open-commit win is small. The change lands on two counts even so. The first is the measured saving. The second is a dead watch struck from the default root panel, with the lifetime `ResizeObserver` callbacks this suite never priced.

`MenuSub` now takes the same gate, and the gate itself moved into the hook as an `enabled` option ([`use-scroll-overflow.ts`](../../hooks/use-scroll-overflow.ts)). **That half is unmeasured, and no figure above stands in for it.** No bench in this suite opens a submenu: [`menu-mount.bench.tsx`](menu-mount.bench.tsx) prices a *closed* submenu row, and [`menu-pointer.bench.tsx`](menu-pointer.bench.tsx) sweeps with one *already* open. The mount bench is the wrong instrument besides. The reflow control above collapsed its 24-row gap from 0.749 ms to 0.028, so a figure quoted from it here would repeat the error this section corrects.

The submenu gate therefore lands on the dead work alone. The invariant holds verbatim: `MenuSub` renders the same `MenuViewport`, which reads the same `capped`. `FloatingSurface` mounts the panel per open through `PresencePortal`, so the watch was set up on every submenu open, to hold two attributes that cannot change.

The submenu's teardown was a separate defect, and it closed first. `MenuSub` wrapped the hook's ref in a callback that discarded the return, so React held no ref cleanup and the observers outlived every closed panel. [#1171](https://github.com/charliebeckstrand/midgard/pull/1171) composed the two refs, and the watch now stops on detach.

### Fan-out: what a closed menu costs (2026-09-21, this container)

A grid puts a filter menu on every column and an action menu on every row. The closed menu is therefore the one a page multiplies. Mean ms for 50, median of three runs.

| Rung | Before | After | Step after | Per menu |
| --- | ---: | ---: | ---: | ---: |
| 1 · bare buttons | 0.151 | 0.152 | — | — |
| 2 · useMenuState only | 0.939 | 0.937 | 0.785 | 0.0157 |
| 3 · trigger only (no panel to build) | 3.127 | 1.768 | 0.831 | 0.0166 |
| 4 · closed menus (the real thing) | 3.347 | 1.953 | 0.185 | 0.0037 |

**A closed menu cost 0.064 ms, which was 22× a bare button. It now costs 0.036 ms, or 13×.** Fifty went from 3.3 ms of mount to 2.0 ms. This one was never a jsdom artifact. The jsdom suite read the same fan-out at 10× a bare button and the browser read 22×, so jsdom understated it.

**Two thirds of the original figure was `MenuTrigger`, and most of that was one wasted render.** `setReference` is a state setter, and the ref callback called it during the commit, so every closed menu rendered twice. That was counted on the component itself rather than inferred: `MenuTrigger` ran twice per closed menu before the change and once after. Lever 2 below is the fix.

**The panel tree the portal discards is the smallest term, at 7%.** `MenuContent` and `FloatingSurface` build a viewport, a `Density`, and a `PopoverPanel` on every render, for a portal that renders none of them. Gating that construction would save about 0.004 ms per menu. That sits inside the run-to-run spread of the rung, so it is not worth the branch.

What remains is the price of wiring floating-ui to a trigger. A page still pays it per menu, whether or not a reader opens one. The trigger and the hook tree are now the two largest terms, at 0.0166 and 0.0157 ms. Reaching the hook tree means deferring the whole machinery to the first open, which is an architectural change to how `Menu` splits. It would need `useClick`'s trigger behavior reproduced on the closed path, against a delicate keyboard model, for about another 0.016 ms per menu.

### Submenu rows: the other multiplier (2026-09-21, this container)

A submenu row lives inside the panel, so a menu pays for it on every open rather than once at mount. It carries a floating surface of its own. Mean ms for one open 24-row panel, median of three runs.

| Scenario | Before | After |
| --- | ---: | ---: |
| plain rows | 3.932 | 3.899 |
| 6 of them submenus | 4.886 | 4.443 |
| **cost of one `MenuSub`** | **0.159** | **0.091** |

**A `MenuSub` cost 0.159 ms above the `MenuItem` it replaces, and now costs 0.091 ms.** It rendered twice for the same reason the root trigger did, and lever 3 below is the same fix one level down. An open menu carrying six of them saves 0.44 ms per open.

What is left is a whole `useFloatingUI`, a `MenuPointerLevel`, three `useId` calls, and a closed floating surface. The `useScrollOverflow` this once listed left the closed row with lever 6, which moved it into `MenuViewport` — a component the shut panel never renders. That is per row, while the submenu is shut. That is two and a half times what a closed root menu costs.

### Optimization log

1. **Element-addressed pointer cursor** ([`use-menu-pointer.tsx`](../../components/menu/use-menu-pointer.tsx), `setVirtualActiveElement` in [`use-a11y-roving.ts`](../../hooks/a11y/use-a11y-roving.ts)). An arrival used to read the panel's whole item list back out. It then found the row's index in that list, and `setVirtualActive` scanned the list twice more. That is three linear passes to move one attribute the event had already named. The arrival now addresses its row directly. Per move: 0.018 → 0.013 ms at 8 rows, 0.022 → 0.014 at 24, 0.031 → 0.014 at 64. The sweep is therefore flat in the row count, where it used to grow. One pass at 64 rows: 1.99 → 0.90 ms, **2.20× faster**. Both halves were measured against this bench as it now stands. The prior file was restored and re-run, rather than compared against a figure from an earlier session.

2. **Reference registered at the first open, not at mount** ([`menu-trigger.tsx`](../../components/menu/menu-trigger.tsx)). The trigger handed floating-ui its node through the ref callback, which calls a state setter, so every closed menu on a page rendered twice. It now stashes the node and registers it in a layout effect on the first open. Positioning, `autoUpdate`, the escape layer, and outside-press all begin there anyway. A node swap after that first open still forwards at once. Fifty closed menus: 3.35 → 1.95 ms, **1.71× faster**, and `MenuTrigger` runs once per closed menu instead of twice. Open latency was unchanged at 0.71 ms for a toggle read back to a placed panel, measured both ways on the same probe. That probe was a one-off in [#1168](https://github.com/charliebeckstrand/midgard/pull/1168), and the suite does not keep it: [`menu-open.bench.tsx`](menu-open.bench.tsx) stops at the commit, before placement, so no rung here reproduces the figure.

3. **The same deferral on `MenuSub`** ([`menu-sub.tsx`](../../components/menu/menu-sub.tsx)). A submenu row registered its own trigger with the engine at mount. Every one of them therefore rendered twice, inside a panel that had just opened. It now stashes the node and registers it on the submenu's first open, exactly as lever 2 does for the root. One `MenuSub`: 0.159 → 0.091 ms, **1.75× faster**, and a panel with six of them opens 0.44 ms sooner.

4. **The overflow watch gated on `capped`** ([`menu-content.tsx`](../../components/menu/menu-content.tsx)). The watch attached to the viewport on every open, and observed the node and each row, to hold two edge attributes. On the uncapped default it can never fire: the viewport carries no `max-h`, so it never overflows. It now attaches only while `capped`, and [`menu-scroll-overflow.test.tsx`](../../__tests__/browser/menu-scroll-overflow.test.tsx) pins that invariant. One open commit: 0.22 ms saved at 24 rows, measured wired against gated in one process. That is the modest end of a change made for its correctness — see `Gating the overflow watch` above for why the earlier projection was larger. `MenuSub` kept the same dead watch until lever 5. Its teardown closed separately, in [#1171](https://github.com/charliebeckstrand/midgard/pull/1171).

5. **The gate moved into the hook, and `MenuSub` took it** ([`use-scroll-overflow.ts`](../../hooks/use-scroll-overflow.ts), [`menu-sub.tsx`](../../components/menu/menu-sub.tsx)). Lever 4 gated `MenuContent` with a ternary at the ref. `useScrollOverflow` now takes an `enabled` option, and both menu call sites state the gate once, where the hook is called. `MenuSub` read the same `capped` and rendered the same capped viewport, so it wired the same dead watch on every submenu open. **Unmeasured.** No bench in this suite opens a submenu, and the mount bench overprices this class of change — see `Gating the overflow watch` above.

6. **The viewport extracted, and the gate with it** ([`menu-viewport.tsx`](../../components/menu/menu-viewport.tsx)). Levers 4 and 5 left both panels stating the same three decisions: the `data-slot` anchor, `k.viewport({ density, capped })`, and the gated watch. `MenuViewport` now owns all three, and `MenuContent` and `MenuSub` render it. **No perf claim for an open.** The work per open is unchanged. A closed `MenuSub` row no longer calls `useScrollOverflow`, because the hook moved into a component that the shut panel never renders; that saving is unmeasured. What changes otherwise is that one place states the gate, where two did.

## Popovers

`Popover` has no contender here either. It shares `Menu`'s trigger shape, so it shares one of `Menu`'s findings.

### Methodology

[`popover-mount.bench.tsx`](popover-mount.bench.tsx) is [`menu-mount.bench.tsx`](menu-mount.bench.tsx) one component over: fifty closed popovers, mounted and torn down. A closed popover renders no panel, because `PresencePortal` mounts nothing until it opens, so the rungs price the shell. Each rung contains the one above it, so a step is what that layer costs across the whole fan-out.

### Fan-out: what a closed popover costs (2026-09-21, a slower container)

A page multiplies the closed popover the way a grid multiplies the closed menu: an info affordance beside every field. Mean ms for 50, median of three runs.

| Rung | Before | After |
| --- | ---: | ---: |
| 1 · bare buttons | 0.211 | 0.195 |
| 2 · trigger only (no panel to build) | 3.894 | 2.472 |
| 3 · closed popovers (the real thing) | 4.457 | 2.535 |

**A closed popover cost 0.085 ms, which was 21× a bare button. It now costs 0.047 ms, or 13×.** Fifty went from 4.5 ms of mount to 2.5 ms, **1.76× faster**. That puts it level with the closed menu, which reads 0.053 ms per menu in this same container.

**The cause was the same wasted render `Menu` paid.** `PopoverTrigger` handed floating-ui its node through the ref callback, and `setReference` is a state setter, so every closed popover rendered twice. That was counted on the component itself, not inferred: ten closed popovers ran `PopoverTrigger` twenty times before the change and ten times after.

The panel-tree step — rung 3 over rung 2 — is 0.06 ms across fifty after the change. That sits inside the run-to-run spread of the rung, so read it as the menu's own 7% finding, not as a figure.

### Optimization log

1. **Reference registered at the first open, not at mount** ([`popover-trigger.tsx`](../../components/popover/popover-trigger.tsx)). Lever 2 of the menu log, transferred. `Popover` wires `useClick`, `dismiss`, and `role` exactly as `Menu` does, and its outside-press is armed on `open`, so the trigger has no use for a reference while it is shut. It now stashes the node and registers it in a layout effect on the first open. A node swap after that open still forwards at once. Fifty closed popovers: 4.46 → 2.54 ms, **1.76× faster**. The panel still lands at its anchored position, on the first open and on every later one.

**The deferral moves one render; it does not delete it.** `setReference` is a state setter, so the open now pays the shell re-render the mount used to pay. That is the `no rows` rung of the re-render table above: 0.103 ms, against 0.038 ms saved for each closed popover. The trade therefore pays from the third closed popover on a page, and a fan-out of fifty is a wide margin. A later open costs nothing, because both floating-ui setters compare the node before they set it. The first-open cost is reasoned from the bench above, not measured on `Popover` itself.

**Not transferred to `Tooltip`.** `useHover` runs an effect keyed on `elements.domReference`, which binds its listeners to the reference node itself. Deferring registration there would break the hover close path and the safe-polygon handling, so `TooltipTrigger` needs its reference at mount.

**Not transferred to the color picker.** `use-color-picker-state.ts` reaches `refs.setReference` through the same shared hook, but its interactions are not the menu's. It wires no `useClick`: the trigger owns its own toggle, and `useFloatingUI` gives it `useDismiss` with `outsidePress` and `escapeKey` both off. Its reference is also the `Control` wrapper, not the button. The deferral would therefore be a new shape rather than a copy, and no rung sizes it yet. The same holds for `DatePicker`, `Listbox`, and `Combobox`, which register their own references at mount.

## Icons

`Icon` wraps a lucide element, and every menu row, button affix, nav item, and badge can carry one. This rung says whose cost that is.

### Methodology

[`icon-mount.bench.tsx`](icon-mount.bench.tsx) builds the same 24 glyphs five ways, each one step further from the bare element, and mounts and tears down each way. A mount is what a reader pays for an icon, and no memo helps a mount, so no rung re-renders. `empty spans` carries the host, the React root, and 24 trivial elements, so every later rung reads against it.

### Findings (2026-09-21, this container)

Mean ms for 24 glyphs, in Chromium. Each figure is the median of four runs, because the steps here are small enough that one run cannot separate them.

| Rung | Median | Step | Per icon |
| --- | ---: | ---: | ---: |
| empty spans | 0.100 | — | — |
| plain svg | 0.321 | 0.222 | 0.0092 |
| lucide bare | 0.435 | 0.114 | 0.0047 |
| Icon + lucide | 0.469 | 0.034 | 0.0014 |
| Icon + lucide · numeric size | 0.483 | 0.015 | 0.0006 |

**An icon costs about 0.015 ms, and the SVG elements are most of it.** Building the elements is 0.0092 ms per glyph and lucide's own wrapper another 0.0047 ms. Twenty-four icons cost 0.37 ms above a bare span. A 24-row menu with an icon on every row therefore pays about a third of a millisecond for the set.

**This package's wrapper does not separate from the noise.** The `Icon` step is 0.034 ms over 24 glyphs, and `lucide bare` alone swings 0.411 to 0.470 across the four runs. The step is smaller than the spread of the rung it is measured against, so read it as an upper bound, not as a figure. The numeric-size branch, which also builds a `style` object, sits the same way.

**The jsdom ratio is the engine again.** The jsdom menu suite reads a row with an icon at twice the cost of a row without one. The same tree costs 2.90 ms in jsdom and 0.37 ms here — 7.9× — because jsdom builds DOM and resolves style in JavaScript. No change is warranted. `Icon` is a `cloneElement` and a memoized `cn` call, and the numbers say so.
