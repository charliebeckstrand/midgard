# Competitive benchmarks

> **The chart module measured against AG Charts and Highcharts, the grid module against AG Grid and MUI X DataGrid, and the map module against Highcharts Maps and ECharts, in real Chromium — so every optimization lands against the market, not against yesterday's self.** `pnpm bench:browser` runs all three suites; the jsdom benches one directory up keep localizing regressions, this suite keeps score.

## Why a browser suite

AG Charts and ECharts draw to real canvases, the grids virtualize against real scroll geometry, and every contender deserves real layout, style, and event plumbing, so jsdom timings would not survive scrutiny; the suite runs through Vitest browser mode on the Playwright Chromium the test suite already uses. Chromium launches with its frame-rate limit off — AG and ECharts defer drawing to animation frames and several benches settle frames inside the timed region, so a vsync'd browser would quantize those samples to ~16ms.

React runs in **production** mode ([`vitest.bench.browser.config.ts`](../../../vitest.bench.browser.config.ts) forces `NODE_ENV=production`): the modules ship the production build, and the vanilla contenders carry no dev/prod split, so a dev-React number would score the modules' diagnostics rather than their shipped speed. The gap is real — dev React runs several times the work per render — so this is a correctness condition, not a thumb on the scale.

## Reading and driving improvements

Each `describe` groups one scenario's three contenders, so the `BENCH Summary` prints the head-to-head ratios directly. To hold a before/after line through an optimization, snapshot then compare:

```sh
pnpm bench:browser -- --outputJson bench-baseline.json
# …optimize…
pnpm bench:browser -- --compare bench-baseline.json
```

When a competitive scenario regresses or lags, the jsdom benches (`pnpm bench`) and the pure cores (`chart-scale`, `chart-layout`, per-chart `*-geometry`; `map-render`'s cold/warm geometry split) are the ladder down to the responsible layer.

## Charts

### Methodology

Every scenario draws the same deterministic dataset ([`fixtures.ts`](fixtures.ts), LCG-seeded) into the same fixed 800×450 box with animations off, through each library's idiomatic API ([`contenders.tsx`](contenders.tsx)): the ui module renders through React (`createRoot` + `flushSync` — the synchronous commit a consumer pays), AG Charts and Highcharts through their vanilla factories, each with its own settle contract (AG awaits `waitForUpdate()`; Highcharts and the ui module draw synchronously).

- [`chart-mount.bench.tsx`](chart-mount.bench.tsx) — full mount-to-painted-DOM plus teardown per iteration: line at 100 / 1k / 10k × 1 series and 1k × 5, bar at 50 / 500 × 2, scatter at 1k / 10k.

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

The module beats **Highcharts on all fifteen** scenarios and **AG Charts on thirteen** — every mount and every update, the 10,000-point canvas cases included. The two it still trails are the hover sweeps, both within one or two milliseconds of AG (and the line sweep has read as a dead heat on other runs; the 10,000-point scatter update sits on the same boundary in the other direction, so read those edges as ties). The hover residual is not the marks (memoised single path per series) or the hit test (a squared-distance scan costing well under a millisecond) but a React commit per pointer move driving the crosshair and tooltip, against AG's vanilla canvas redraw; closing it means moving the shared hover layer to imperative DOM writes — a trade of the declarative hover model for the last millisecond, open by choice.

### Optimization log

Each entry names the change and the scenarios it moved; the levers are ordered as they landed.

1. **Production React in the bench** (methodology). Measuring the shipped build instead of the dev one cut every ui number ~2.6× — the largest single move, and the honest baseline the rest build on.

2. **Deferred data table** ([`chart-frame.tsx`](../../modules/chart/chart-frame.tsx), `useDeferredValue`). The visually-hidden table holds one row per datum; taking its build off the urgent render dropped the line mounts most (1k line mount 235 → ~12 under dev React at the time), since a line's marks are one path and the table was the whole linear term. Parity is unchanged — the table converges one low-priority commit behind.

3. **Single-path plain scatter** ([`scatter-chart-marks.tsx`](../../modules/chart/scatter-chart/scatter-chart-marks.tsx)). A plain series draws as one `<path>` of every disc rather than a circle apiece, and isolation dims the group then re-draws the one lit disc over it, so a pointer crossing rebuilds nothing. Scatter 1k mount 66 → 16 (beats both); 10k mount 711 → 137, update 616 → 63, hover 30 → 25 (all now past Highcharts, closing on AG's canvas). Bubbles keep a circle each — their translucent fills must composite disc over disc.

4. **Single-path bars** ([`chart-bar-marks.tsx`](../../modules/chart/chart-bar-marks.tsx)). Each series' bars concatenate into one `<path>` — bars are opaque and never overlap, so it reads identically — with the same group-dim-plus-overlay isolation the scatter path uses. Bar 500 mount 138 → 24 and update 67 → 8, both now past AG and Highcharts; the combo and dual-axis bars ride the same renderer.

5. **Constant-radius disc path** ([`scatter-chart-geometry.ts`](../../modules/chart/scatter-chart/scatter-chart-geometry.ts)). A plain scatter series shares one radius across every disc, so the two arc commands are identical for all of them; the builder caches that suffix and formats only the one moving coordinate per disc. Scatter 10k update 67 → 60, past AG.

6. **Sub-pixel path coordinates** ([`chart-coords.ts`](../../modules/chart/chart-coords.ts)). Path `d` strings round to two decimals, a fraction of the full-float size; a structural cleanup that shrinks the DOM payload the large-N paths ship.

7. **Lazy readout** ([`types.ts`](../../modules/chart/types.ts) `ChartReadoutSource`, every chart body). Building the readout formats every category × series cell through `Intl` — at 10,000 rows that outweighed drawing the marks, and it ran on the mount-critical render even after the table's render was deferred. Charts now hand the frame a cached thunk (`once`): the mount render only decides a readout exists, the hover tooltip materializes it on the first pointed frame, the deferred table a low-priority beat after mount, CSV export on selection. Line 10k mount 92 → ~66, scatter 10k mount 127 → ~81 — both past AG's canvas. Parity unchanged; the cache is shared by every consumer.

8. **Squared-distance hit test** ([`scatter-chart-geometry.ts`](../../modules/chart/scatter-chart/scatter-chart-geometry.ts) `scatterMarkAt`). The per-move scan stays in squared distances end to end — the held-disc hysteresis already compared squares — and rejects on each axis before multiplying, so the far discs cost two compares and no arithmetic; `Math.hypot`, which the scan called ten thousand times per move, is gone. Scatter 10k hover 23.5 → ~18, from ~3.5ms of scan to well under one.

9. **Early-exit date detection** ([`chart-time.ts`](../../modules/chart/chart-time.ts) `dateCategoryFormat`). The band axis's are-these-all-dates probe parsed every category (`Date.parse` per row) before answering; a non-date axis now fails on its first value, one parse instead of ten thousand. Worth ~11ms of the line 10k mount.

Open: the scatter hover sweep still trails AG by a whisker (~18 vs ~17) — the residual is a React commit per pointer move against AG's vanilla redraw, closable only by moving the shared crosshair/tooltip tracking to imperative DOM writes. Everything else stands beaten or tied.

## Grids

### Methodology

Every scenario drives the same deterministic shipment rows (`makeShipments` in [`../fixtures.ts`](../fixtures.ts), LCG-seeded, 8 columns) into the same fixed 960×600 box with animations off and fixed 120px columns, through each library's idiomatic API ([`grid-contenders.tsx`](grid-contenders.tsx)): the ui module and MUI X render through React (`createRoot` + `flushSync`), AG Grid through its vanilla `createGrid` factory. The settle contract is shared rather than per-library — each operation is timed until a paint probe sees the expected cell text in the live DOM — so a library that defers row DOM onto animation frames pays for exactly the frames it defers, and none is trusted about its own "ready" signal.

- [`grid-mount.bench.tsx`](grid-mount.bench.tsx) — full mount-to-painted-rows plus teardown per iteration, at 1k / 10k / 100k rows.

- [`grid-update.bench.tsx`](grid-update.bench.tsx) — whole-dataset refresh on a live grid (same row ids, new values), alternating two same-shape datasets so no iteration bails on an equality guard, at 10k / 100k.

- [`grid-sort.bench.tsx`](grid-sort.bench.tsx) — an asc/desc sort flip on `id` through each library's programmatic sort state, so the engine re-sorts the full dataset and repaints the window, at 10k / 100k.

- [`grid-scroll.bench.tsx`](grid-scroll.bench.tsx) — a top-to-bottom-and-back sweep in 12 even jumps, one settled frame per step plus a fully-painted probe at each end — the virtualization stress, at 10k / 100k.

Fairness notes, both directions: the ui grid keeps its built-in chrome (toolbar with export, accessible announcements) that the competitors' defaults don't carry; each library runs its own defaults otherwise (AG's community module set, MUI's MIT tier). MUI's MIT tier hard-caps `pageSize` at 100 and always paginates — full-set scrolling is Pro-licensed — so MUI runs mount/update/sort in its shipped paginated shape (the full dataset still flows through its client-side model) and sits out the scroll sweep. React runs in production mode for the same reason as the charts (see above); it covers MUI symmetrically.

### Standings (2026-07-10, this workstation)

Absolute numbers move with hardware — this table was re-measured on a faster machine than the round-one/two figures the optimization log's relative deltas cite, so read the deltas there, the ratios here. Mean ms per iteration, ui / AG Grid / MUI X — **bold** marks a scenario where ui beats both.

| Scenario | ui | AG Grid | MUI X |
| --- | ---: | ---: | ---: |
| mount · 1,000 × 8 | **4.6** | 10.9 | 9.9 |
| mount · 10,000 × 8 | **5.3** | 10.4 | 10.0 |
| mount · 100,000 × 8 | **15.8** | 50.4 | 30.8 |
| update · 10,000 × 8 | **3.5** | 5.8 | 19.8 |
| update · 100,000 × 8 | **13.0** | 57.0 | 26.6 |
| sort · 10,000 · flip | 24.8 | 12.5 | 6.9 |
| sort · 100,000 · flip | 156.2 | 26.9 | 67.9 |
| scroll · 10,000 · round trip | **211.3** | 219.2 | — |
| scroll · 100,000 · round trip | **204.2** | 264.1 | — |

The structural row-model lever landed, and the board turned over: the ui grid now beats **both** competitors on every mount, every update, and both scroll sweeps — the 100k mount an order of magnitude under AG (15.8 vs 50.4) and the 100k update over four times under it (13.0 vs 57.0). The whole linear term is gone from the untransformed paths, so mount and update barely move from 1k to 100k (5 → 16ms, 4 → 13ms) where the competitors climb.

What remains is **sort** — the one scenario the ui grid still trails (156 vs AG 27 at 100k). Sort is a genuine transform, so it materializes the engine row model by design (the lite-cell path can't skip what the sort must reorder), and it pays a per-comparison `WeakMap` + `Map` sort-key lookup and engine comparator dispatch O(N log N) times on top of that build. The next lever is array-indexed sort keys resolved once per sort against a plain array the body reads directly, taking the sort off the engine's row model the way mount and update now are. Below that, the per-cell render is the last rung — a cell-tree diet (`GridDataCell` → `TableCell` → span) for the residual per-row constant.

### Optimization log

Each entry names the change and the scenarios it moved.

1. **Cached natural collator** ([`grid-sorting-utilities.ts`](../../modules/grid/grid-sorting-utilities.ts)). The smart comparator's string fallback ran `localeCompare(…, { numeric: true })`, which re-resolves collation machinery on every call — O(N log N) times per sort; a shared `Intl.Collator` answers the same ordering. Sort 100k 1,562 → ~750, sort 10k 183 → ~104.

2. **Lazily-armed truncation measure** ([`use-truncation.ts`](../../hooks/use-truncation.ts)). Every mounted cell measured overflow (`scrollWidth` + two `Range`/element rect reads) in a layout effect on every commit — a scroll step remounts ~270 cells, and the census read ~350 of each per step, ~70ms of forced measurement for a flag that only gates hover/focus reveals no unvisited cell can show. The first pointer/focus contact now arms the element (a `flushSync` on the element-level event lands the state before the tooltip's root-delegated hover logic evaluates the same contact), and only armed elements re-measure. Scroll 10k round trip 3,627 → ~1,650, 100k 3,718 → ~1,680; update 100k 587 → ~435 (its remounted windows carried the same per-commit measures).

3. **Contact-mounted reveal machinery** ([`grid-cell-content.tsx`](../../modules/grid/grid-cell-content.tsx), `contacted` from [`use-truncation.ts`](../../hooks/use-truncation.ts)). Every data cell mounted the full floating-ui `Tooltip` hook stack to gate a reveal almost no cell ever opens — ~150µs of the ~250µs per-cell render, the largest single term in mount and scroll (measured by benching `cellTooltip: () => null` against the default). The stack now mounts on the first pointer/focus contact with a cell that measures truncated; the wrap reparents the span once at that mount, and the hook's callback ref re-binds its observation to the replacement node (the stranded-observer hazard that once kept the tooltip permanently mounted). Gating on *truncated*, not just contact, is a correctness condition too: an in-place editor lives inside the span, and a reparent triggered by its own focus or a passing pointer would tear down a focused editor holding a draft — a fitting cell stays a bare span through any contact. Scroll 10k 1,650 → 653 and 100k 1,680 → 655 (both now past AG); mount 1k 39 → 22 (past both); mount 10k 75 → 59; update 10k 73 → 47; plain 300-row mount ~700 → ~210, 500-row ~1,100 → ~340.

4. **Deferred observation, suspended drags, shared descriptors** ([`use-truncation.ts`](../../hooks/use-truncation.ts), [`grid-row.tsx`](../../modules/grid/grid-row.tsx), [`grid-cell-content.tsx`](../../modules/grid/grid-cell-content.tsx)). The width `ResizeObserver` and `fonts.ready` subscription defer to first contact with the rest of the reveal — an unvisited cell now costs two listener registrations and nothing else per mount or recycle. Truncation measurement stands down entirely while a column drag-resize is in flight (`suspended`; the reveal is held closed through a drag anyway) and the settle re-measures. The per-cell `{ kind: 'auto' }` tooltip descriptor and the static span/tooltip classes are shared module constants rather than per-render allocations.

5. **Lite-cell body path** ([`grid-row.tsx`](../../modules/grid/grid-row.tsx), [`grid-group-leaf-row.tsx`](../../modules/grid/grid-group-leaf-row.tsx)). The body rendered every cell through the engine — `table.getRow(key).getVisibleCells()` per row, `flexRender` per cell — which forced a TanStack `Row` object per datum even on a grid no sort, filter, or grouping had touched (the profile's `accessRows` / `createRow`, the whole linear term). Rows now render straight from `renderRows` × `visibleColumns`, calling each column's `cell(row)` inline with no engine row or cell object between; the pointer handlers resolve a clicked cell against the column list instead of the engine cells. The grouped body keeps engine cells (it needs their grouping model) and recovers the same column list from their `meta`.

6. **Materialization gated on active transform** ([`use-grid-table.ts`](../../modules/grid/use-grid-table.ts) `resolveActiveClientTransform`). With the body off the engine, the row model is built only when a transform is *actively* reshaping the rows — capability is not activity, so an empty sort list, a configured search with no query, and a filter surface with no entries all hand `rows` straight through. A plain mount and a data refresh no longer materialize at all. Mount 100k ~450 → 16 and update 100k ~440 → 13 (both now an order of magnitude past AG); mount and update stay near-flat 1k → 100k where the engine term used to dominate.

7. **Autosizer fingerprint off the row model** ([`use-grid-column-auto-size.ts`](../../modules/grid/use-grid-column-auto-size.ts), [`use-grid-table.ts`](../../modules/grid/use-grid-table.ts)). The column autosizer fingerprinted the rendered rows through `table.getRowModel()` — which alone materialized the engine model on every resizable-by-default grid, undoing lever 6. It now takes a `rowsSignature` (count and end keys) the grid already derived, so nothing touches the engine model on the plain path. The update bench's settle gained a one-frame yield per refresh ([`grid-update.bench.tsx`](grid-update.bench.tsx)): a synchronous contender otherwise settles in zero frames, so the harness chained dozens of `flushSync` refreshes in one tick with no paint between — an unrealistic cadence (a polling dashboard paints between refreshes) that piled the grid's one benign post-commit re-render into React's nested-update guard. The frame is near-free with the frame-rate limit off and lands on every contender alike; the post-commit re-render itself (a low-priority `update`-phase commit on a data swap, pre-existing and independent of these levers) stays open as a minor cleanup.

## Maps

### Methodology

Every scenario draws the same prepared `us-atlas` geometry ([`map-fixtures.ts`](map-fixtures.ts)) into the same fixed 800×450 box with animations off, joined to the same LCG-seeded rows by FIPS id, through each library's idiomatic API ([`map-contenders.tsx`](map-contenders.tsx)): the ui module renders `MapPlat` through React, Highcharts Maps and ECharts through their vanilla factories. AG Charts sits this suite out — its map series is enterprise-only, so the community package the chart benches run has nothing to enter. ECharts paints through zrender's animation-frame loop, so its adapter flushes the pending frame synchronously (`getZr().flush()`) after every option set, the way the AG chart adapter awaits `waitForUpdate()`.

The geometry is the conterminous US — `states-10m` (49 regions) and `counties-10m` (3,108 regions), territories and the non-conterminous states filtered for every contender alike. The rivals ship no free US composite: their US idiom is a Lambert conformal conic, which Alaska's antimeridian crossing would smear across the projected plane, shrinking their fitted map to a fraction of the frame while the ui module's `albers-usa` insets fill it — the lower 48 is the largest geometry all three project comparably. Projections are each library's US idiom from there: the ui module's `albers-usa` composite, Highcharts' Lambert conformal conic (its own custom-US-map guidance), and that same conic for ECharts through its documented d3-geo projection hook.

- [`map-mount.bench.tsx`](map-mount.bench.tsx) — full mount-to-painted-DOM plus teardown per iteration, at steady state: each library's one-time geometry setup (the ui module's static-geometry cache, ECharts' `registerMap`, whatever Highcharts caches on the topology) warms during the uncounted warmup iterations, so the timed region is the remount a dashboard actually pays. The cold decode-and-fit path keeps its own jsdom bench (`map-render`).

- [`map-update.bench.tsx`](map-update.bench.tsx) — recolour on a live map, alternating two same-shape datasets: re-zoning every region in the categorical scenarios, re-valuing every region in the choropleth. The ui module re-renders through its root; Highcharts and ECharts take their in-place data updates. Geometry never changes — an update moves data, not the atlas.

- [`map-hover.bench.tsx`](map-hover.bench.tsx) — a 20-step pointer sweep across the plot plus one settled frame. Every contender receives the same `pointermove` + `mousemove` pair per step; the dispatch target differs the way the libraries' interaction stacks do — Highcharts and ECharts hear moves on their container and hit-test from coordinates in script, while the ui module's regions are their own hit targets (the browser's native SVG hit test retargets a real pointer, costing no contender script time), so its per-step targets resolve to the region under each point once, outside the timed region.

- [`map-emphasis.bench.tsx`](map-emphasis.bench.tsx) — a legend-emphasis flip on the live county atlas: emphasise the first category (every region outside it recedes), settle two frames, release, settle again. The ui module and Highcharts take real pointer events on their legend UI — the switchboard chip; the data-class legend item, whose hover sets the other 2,337 points inactive — while ECharts' piecewise visual map draws on canvas, unreachable by a synthetic pointer without brittle pixel targeting, so it takes its documented `dispatchAction` highlight / downplay over the category's rows with `emphasis.focus: 'self'`, the programmatic form of the same hover link.

Fairness notes, both directions: the ui module keeps its built-in accessible output — the visually-hidden region table, deferred one low-priority commit behind the geography — while Highcharts runs without its optional accessibility module; every contender's default legend stays on (the ui switchboard, Highcharts' data classes, ECharts' visual map); the categorical scenarios pin the same four zone colours and the choropleth the same five-stop ramp everywhere; the ui module pays React reconciliation the vanilla factories don't, and that is the product being measured. One county (Falls Church, VA) projects below sub-pixel size and draws no path in the ui module, so it renders 3,107 paths to the rivals' 3,108.

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

(Every contender's absolutes ran ~1.6× an earlier same-day session here — container drift; the ratios are the comparison.) The module beats **Highcharts Maps on all nine** scenarios and **ECharts on eight, with the ninth a dead heat**: the states hover sweep — the suite's one standing deficit, the React-commit-per-crossing residual shared with the chart suite's scatter hover — reads 12.5 vs ECharts' 12.6 by mean since the layer-recede round, without the imperative-DOM trade (by median it still trails, ~17 vs ~13: an iteration that commits waits out the settle frame, one that converges on its previous end state bails at sub-millisecond cost). The choropleth's mount premium over the categorical map is fully erased, and the emphasis flip — the layer-recede round's own scenario — runs 2.1× ahead of ECharts' focus actions and 4.7× ahead of Highcharts' inactive-state hover: one recede transition plus the lit copies against their per-point state writes. The updates are not close — 19–31× — because the memoised region layer holds its geometry and React recolours fills in place, while the rivals rebuild their scene from the new data; that is the dashboard refresh path the module was shaped for.

### Optimization log

The baseline run (suite as first landed) had the counties mounts at 476–505ms against rivals near 200–235, every mount trailing both; three levers closed it, sized by a stub-probed breakdown of the 476ms categorical mount before any landed.

1. **Deferred region table** ([`map-plat.tsx`](../../modules/map/map-plat.tsx), `useDeferredValue`) — the chart suite's lever 2 applied to the map. The visually-hidden table renders one row per region, ~190ms of the county mount's urgent render; the geography now commits first and the table hydrates a low-priority beat behind, and a data update's urgent recolour no longer carries the 3,108-row re-map either (counties update 15.1 → 8.3, choropleth 17.6 → 7.7). Parity unchanged — the table always converges, one commit behind.

2. **Flattened static region tree** ([`map-regions.tsx`](../../modules/map/map-regions.tsx)). Every region carried a `<g>` wrapper whose only job was the legend-emphasis dim; a static map now carries the dim class on the path itself, halving the region layer's element count (~40ms of the county commit). The wrapper survives under `animate`, where the dim's opacity transition would collide with the colour wash's `transition-colors` on one element.

3. **Measured-paths memo** ([`map-geometry-cache.ts`](../../modules/map/map-geometry-cache.ts) `measuredRegionPaths`). The measured refit reprojected and restringified every region on each mount — ~116ms on the county atlas — though for a named projection it is a pure function of the cached geometry and the frame box. The shared cache now keeps the last measured fit's paths per geometry (one slot; a resize replaces it), so a remount at the same box — a tab switch, a dashboard's small multiples — reuses them the way the canonical stage already reused its fit. States mount 24.3 → 4.7, counties 476 → 113, choropleth 505 → 139: every mount now ahead of both rivals.

4. **Slot-less region paths** ([`map-regions.tsx`](../../modules/map/map-regions.tsx)). A bare-`<path>` floor probe put the county mount ~30ms above it, and bisecting the per-region props landed the whole gap on one attribute: `data-slot="map-region"`. The stylesheet carries `[data-slot=…]` attribute selectors for other components, so every element bearing the attribute pays attribute-rule matching at first style resolution — 3,108 paths × the sheet's `data-slot` rules, for an anchor nothing styles by. Regions now anchor on `data-region-index` alone (free — no selector in the sheet reads it, and the hover provider's scroll resolve already read it); the layer keeps its `map-regions` slot, and the tests and this suite's sweep resolver target the index attribute. Counties mount 94.6 → 61.0 on this container.

5. **Attribute fill for numeric bins** ([`map-regions.tsx`](../../modules/map/map-regions.tsx)). The choropleth's bin colour rode a per-region inline `style`, and 3,108 CSSOM style declarations priced ~24ms — nearly the whole categorical → choropleth mount gap. The colour now rides the `fill` presentation attribute: a value paint never carries a fill class, so nothing in the cascade sits above it, and the colour wash's `transition-colors` animates either way. Choropleth mount 123.5 → 68.6 with lever 4, update 6.6 → 6.1.

6. **Per-category paints, memoised regions, and a snap dim** ([`map-regions.tsx`](../../modules/map/map-regions.tsx), [`kata/map`](../../recipes/kata/map.ts) `region.dim`). Two edge probes motivated this: a legend-focus flip on a live county atlas cost ~990ms settled — ~85% of it the ~2,300 simultaneous per-path `transition-opacity` runs, the rest a 3,107-component re-render — and the pointed-mark isolation (#952) put that same shape on every region crossing, doubling the counties hover sweep (8.6 → 17.1 on its container). Three moves land together: each category's classes and fill resolve once for the whole layer (`regionFill` + `cn` ran per region; now per category); `Region` is memoised on resolved primitives with one shared track handler reading the index off the path's own anchor attribute, so a crossing re-renders the two regions whose dim flipped rather than the atlas; and the region dim snaps (`k.region.dim`, deliberately transition-free) instead of fading — an untransitioned opacity also composes with the wash's `transition-colors` on one element, so the `animate` wrapper is gone and an animated tree is one element per region too. Legend flip 990 → 142ms settled; the counties hover sweep back ahead of both rivals with sub-millisecond bail iterations; mounts and updates hold their ratios.

7. **Layer recede with lit copies** ([`map-regions.tsx`](../../modules/map/map-regions.tsx) `MapRegionsLit`). The chart marks' own isolation pattern (its levers 3–4: dim the group, redraw the lit mark over it) applied to the region layer, superseding lever 6's snap: the emphasis dim moves off the individual paths onto one recede wrapper (`k.group` at the layer — one transition), and the emphasised marks redraw lit above it, `pointer-events-none` copies over identical geometry — the pointed region alone, or a legend focus's whole category. The enter/leave fade lever 6 traded away returns at one animated element instead of thousands, `k.region.dim` and the per-region dim machinery go, and the base tree is blind to the shared emphasis: a crossing re-renders one copy path where lever 6 still ran 3,107 memo compares. Legend flip 142 → 56ms settled (990 before lever 6 — now faster *and* fading again); counties hover 15.2 → 9.3; states hover 16.8 → 12.5, pulling the suite's one open deficit to a dead heat with ECharts' canvas without the imperative-DOM trade. Lever 6's per-category paints, memoised `Region`, and shared track handler stay — they now serve toggles and the reveal. The flip graduated into the suite as its own competitive scenario ([`map-emphasis.bench.tsx`](map-emphasis.bench.tsx)).

Probed, not landed: lazy value labels (the chart's lever 7 shape — `regionValueLabels` off the urgent render) measured ~2.7ms on the choropleth mount, the default `String` format being nothing like the chart's per-cell `Intl` work; dropping the `hover:brightness-110` filter measured ~1.1ms of the states sweep; the destroy half of the mount-plus-teardown scenarios measured ~10ms of ~150. Each priced below its complexity. Path precision was already spent when the module landed (`REGION_PATH_DIGITS = 1` — the chart's lever 6 shape).

Open: nothing stands beaten against the module by mean — the states hover sweep's residual median gap (~17 vs ~13, the settle frame around a committing iteration) is the last trace of the React-commit-per-crossing trade, shared with the chart suite's scatter hover.
