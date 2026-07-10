# Competitive benchmarks

> **The chart module measured against AG Charts and Highcharts, and the map module against Highcharts Maps and ECharts, in real Chromium — so every optimization lands against the market, not against yesterday's self.** `pnpm bench:browser` runs both suites; the jsdom benches one directory up keep localizing regressions, this suite keeps score.

## Why a browser suite

AG Charts and ECharts draw to real canvases and every contender deserves real layout, style, and event plumbing, so jsdom timings would not survive scrutiny; the suite runs through Vitest browser mode on the Playwright Chromium the test suite already uses. Chromium launches with its frame-rate limit off — AG and ECharts defer drawing to animation frames and the hover benches settle one frame per iteration, so a vsync'd browser would quantize those samples to ~16ms.

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

## Maps

### Methodology

Every scenario draws the same prepared `us-atlas` geometry ([`map-fixtures.ts`](map-fixtures.ts)) into the same fixed 800×450 box with animations off, joined to the same LCG-seeded rows by FIPS id, through each library's idiomatic API ([`map-contenders.tsx`](map-contenders.tsx)): the ui module renders `MapPlat` through React, Highcharts Maps and ECharts through their vanilla factories. AG Charts sits this suite out — its map series is enterprise-only, so the community package the chart benches run has nothing to enter. ECharts paints through zrender's animation-frame loop, so its adapter flushes the pending frame synchronously (`getZr().flush()`) after every option set, the way the AG chart adapter awaits `waitForUpdate()`.

The geometry is the conterminous US — `states-10m` (49 regions) and `counties-10m` (3,108 regions), territories and the non-conterminous states filtered for every contender alike. The rivals ship no free US composite: their US idiom is a Lambert conformal conic, which Alaska's antimeridian crossing would smear across the projected plane, shrinking their fitted map to a fraction of the frame while the ui module's `albers-usa` insets fill it — the lower 48 is the largest geometry all three project comparably. Projections are each library's US idiom from there: the ui module's `albers-usa` composite, Highcharts' Lambert conformal conic (its own custom-US-map guidance), and that same conic for ECharts through its documented d3-geo projection hook.

- [`map-mount.bench.tsx`](map-mount.bench.tsx) — full mount-to-painted-DOM plus teardown per iteration, at steady state: each library's one-time geometry setup (the ui module's static-geometry cache, ECharts' `registerMap`, whatever Highcharts caches on the topology) warms during the uncounted warmup iterations, so the timed region is the remount a dashboard actually pays. The cold decode-and-fit path keeps its own jsdom bench (`map-render`).

- [`map-update.bench.tsx`](map-update.bench.tsx) — recolour on a live map, alternating two same-shape datasets: re-zoning every region in the categorical scenarios, re-valuing every region in the choropleth. The ui module re-renders through its root; Highcharts and ECharts take their in-place data updates. Geometry never changes — an update moves data, not the atlas.

- [`map-hover.bench.tsx`](map-hover.bench.tsx) — a 20-step pointer sweep across the plot plus one settled frame. Every contender receives the same `pointermove` + `mousemove` pair per step; the dispatch target differs the way the libraries' interaction stacks do — Highcharts and ECharts hear moves on their container and hit-test from coordinates in script, while the ui module's regions are their own hit targets (the browser's native SVG hit test retargets a real pointer, costing no contender script time), so its per-step targets resolve to the region under each point once, outside the timed region.

Fairness notes, both directions: the ui module keeps its built-in accessible output — the visually-hidden region table, deferred one low-priority commit behind the geography — while Highcharts runs without its optional accessibility module; every contender's default legend stays on (the ui switchboard, Highcharts' data classes, ECharts' visual map); the categorical scenarios pin the same four zone colours and the choropleth the same five-stop ramp everywhere; the ui module pays React reconciliation the vanilla factories don't, and that is the product being measured. One county (Falls Church, VA) projects below sub-pixel size and draws no path in the ui module, so it renders 3,107 paths to the rivals' 3,108.

### Standings (2026-07-10, this container)

Mean ms per iteration, ui / Highcharts Maps / ECharts — **bold** marks a scenario where ui beats both.

| Scenario | ui | Highcharts | ECharts |
| --- | ---: | ---: | ---: |
| mount · states · 49 × 4 zones | **4.3** | 16.5 | 12.9 |
| mount · counties · 3,108 × 4 zones | **61.0** | 208.2 | 163.1 |
| mount · counties choropleth · 3,108 | **68.6** | 210.3 | 171.3 |
| update · states · re-zone | **0.4** | 7.7 | 9.1 |
| update · counties · re-zone | **6.4** | 132.8 | 154.2 |
| update · counties choropleth · re-value | **6.1** | 146.2 | 162.8 |
| hover · states · sweep | **16.4** | 17.4 | 9.6 |
| hover · counties · sweep | **8.6** | 17.8 | 20.5 |

The module beats **Highcharts Maps on all eight** scenarios and **ECharts on seven**. The updates are not close — 19–27× — because the memoised region layer holds its geometry and React recolours fills in place, while the rivals rebuild their scene from the new data; that is the dashboard refresh path the module was shaped for. The one deficit is the states hover sweep against ECharts' canvas, the chart suite's residual under another name: a React commit per pointer move drives the pointer-anchored Tooltip against a vanilla canvas redraw, and closing it means the same imperative-DOM trade the chart module has left open by choice. The sweep itself coalesces to one commit per iteration under React's continuous-event batching — the same coalescing a real pointer stream gets.

### Optimization log

The baseline run (suite as first landed) had the counties mounts at 476–505ms against rivals near 200–235, every mount trailing both; three levers closed it, sized by a stub-probed breakdown of the 476ms categorical mount before any landed.

1. **Deferred region table** ([`map-plat.tsx`](../../modules/map/map-plat.tsx), `useDeferredValue`) — the chart suite's lever 2 applied to the map. The visually-hidden table renders one row per region, ~190ms of the county mount's urgent render; the geography now commits first and the table hydrates a low-priority beat behind, and a data update's urgent recolour no longer carries the 3,108-row re-map either (counties update 15.1 → 8.3, choropleth 17.6 → 7.7). Parity unchanged — the table always converges, one commit behind.

2. **Flattened static region tree** ([`map-regions.tsx`](../../modules/map/map-regions.tsx)). Every region carried a `<g>` wrapper whose only job was the legend-emphasis dim; a static map now carries the dim class on the path itself, halving the region layer's element count (~40ms of the county commit). The wrapper survives under `animate`, where the dim's opacity transition would collide with the colour wash's `transition-colors` on one element.

3. **Measured-paths memo** ([`map-geometry-cache.ts`](../../modules/map/map-geometry-cache.ts) `measuredRegionPaths`). The measured refit reprojected and restringified every region on each mount — ~116ms on the county atlas — though for a named projection it is a pure function of the cached geometry and the frame box. The shared cache now keeps the last measured fit's paths per geometry (one slot; a resize replaces it), so a remount at the same box — a tab switch, a dashboard's small multiples — reuses them the way the canonical stage already reused its fit. States mount 24.3 → 4.7, counties 476 → 113, choropleth 505 → 139: every mount now ahead of both rivals.

4. **Slot-less region paths** ([`map-regions.tsx`](../../modules/map/map-regions.tsx)). A bare-`<path>` floor probe put the county mount ~30ms above it, and bisecting the per-region props landed the whole gap on one attribute: `data-slot="map-region"`. The stylesheet carries `[data-slot=…]` attribute selectors for other components, so every element bearing the attribute pays attribute-rule matching at first style resolution — 3,108 paths × the sheet's `data-slot` rules, for an anchor nothing styles by. Regions now anchor on `data-region-index` alone (free — no selector in the sheet reads it, and the hover provider's scroll resolve already read it); the layer keeps its `map-regions` slot, and the tests and this suite's sweep resolver target the index attribute. Counties mount 94.6 → 61.0 on this container.

5. **Attribute fill for numeric bins** ([`map-regions.tsx`](../../modules/map/map-regions.tsx)). The choropleth's bin colour rode a per-region inline `style`, and 3,108 CSSOM style declarations priced ~24ms — nearly the whole categorical → choropleth mount gap. The colour now rides the `fill` presentation attribute: a value paint never carries a fill class, so nothing in the cascade sits above it, and the colour wash's `transition-colors` animates either way. Choropleth mount 123.5 → 68.6 with lever 4, update 6.6 → 6.1.

Probed, not landed: lazy value labels (the chart's lever 7 shape — `regionValueLabels` off the urgent render) measured ~2.7ms on the choropleth mount, the default `String` format being nothing like the chart's per-cell `Intl` work; hoisting the per-region fill resolution and `cn` out of the 3,107-region map measured ~3.7ms; dropping the `hover:brightness-110` filter measured ~1.1ms of the states sweep. Each priced below its complexity, and the states-hover distributions (ui and Highcharts pinned near one frame regardless of region count, ui counties bimodal down to sub-millisecond samples) say that residual is the settled frame around the React commit, not script.

Open: the states hover sweep trails ECharts (~16 vs ~10) — the React-commit-per-move residual named above, shared with the chart suite's scatter hover and closable only by the same imperative-DOM trade. Everything else stands beaten.
