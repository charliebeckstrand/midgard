# Competitive benchmarks

> **The chart module measured against AG Charts and Highcharts, the grid module against AG Grid and MUI X DataGrid, in real Chromium — so every optimization lands against the market, not against yesterday's self.** `pnpm bench:browser` runs both suites; the jsdom benches one directory up keep localizing regressions, this suite keeps score.

## Why a browser suite

AG draws to a real canvas, the grids virtualize against real scroll geometry, and every contender deserves real layout, style, and event plumbing, so jsdom timings would not survive scrutiny; the suite runs through Vitest browser mode on the Playwright Chromium the test suite already uses. Chromium launches with its frame-rate limit off — AG defers work to animation frames and several benches settle frames inside the timed region, so a vsync'd browser would quantize those samples to ~16ms.

## Charts

### Methodology

Every scenario draws the same deterministic dataset ([`fixtures.ts`](fixtures.ts), LCG-seeded) into the same fixed 800×450 box with animations off, through each library's idiomatic API ([`contenders.tsx`](contenders.tsx)): the ui module renders through React (`createRoot` + `flushSync` — the synchronous commit a consumer pays), AG Charts and Highcharts through their vanilla factories, each with its own settle contract (AG awaits `waitForUpdate()`; Highcharts and the ui module draw synchronously).

- [`chart-mount.bench.tsx`](chart-mount.bench.tsx) — full mount-to-painted-DOM plus teardown per iteration: line at 100 / 1k / 10k × 1 series and 1k × 5, bar at 50 / 500 × 2, scatter at 1k / 10k.

- [`chart-update.bench.tsx`](chart-update.bench.tsx) — redraw on a live chart, alternating two same-shape datasets so no iteration bails on an equality guard: the ui module re-renders through its root, AG and Highcharts take their in-place data updates.

- [`chart-hover.bench.tsx`](chart-hover.bench.tsx) — a 20-step pointer sweep across the plot plus one settled frame: hit-testing, crosshair/tooltip work, and frame-deferred drawing. Every contender receives the same `pointermove` + `mousemove` pair per step, so dispatch overhead is symmetric across their differing interaction stacks.

React runs in **production** mode ([`vitest.bench.browser.config.ts`](../../../vitest.bench.browser.config.ts) forces `NODE_ENV=production`): the module ships the production build, and the vanilla contenders carry no dev/prod split, so a dev-React number would score the module's diagnostics rather than its shipped speed. The gap is real — dev React runs several times the work per render — so this is a correctness condition, not a thumb on the scale.

Fairness notes, both directions: the ui module keeps its built-in accessible output (the visually-hidden data table renders one row per datum) while Highcharts runs without its optional accessibility module and AG registers its standard `AllCommunityModule`; Highcharts' `boost` module stays off, matching default installs; the ui module pays React reconciliation the vanilla factories don't, and that is the product being measured.

### Reading and driving improvements

Each `describe` groups one scenario's three contenders, so the `BENCH Summary` prints the head-to-head ratios directly. To hold a before/after line through an optimization, snapshot then compare:

```sh
pnpm bench:browser -- --outputJson bench-baseline.json
# …optimize…
pnpm bench:browser -- --compare bench-baseline.json
```

When a competitive scenario regresses or lags, the jsdom benches (`pnpm bench`) and the pure-geometry cores (`chart-scale`, `chart-layout`, per-chart `*-geometry`) are the ladder down to the responsible layer.

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

#### Optimization log

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

### Standings (2026-07-10, this container, pre-optimization baseline)

Absolute numbers move with hardware; the ratios are the signal. Mean ms per iteration, ui / AG Grid / MUI X — **bold** marks a scenario where ui beats both.

| Scenario | ui | AG Grid | MUI X |
| --- | ---: | ---: | ---: |
| mount · 1,000 × 8 | 39.3 | 53.8 | 34.8 |
| mount · 10,000 × 8 | 75.2 | 32.9 | 35.1 |
| mount · 100,000 × 8 | 471.4 | 135.4 | 92.1 |
| update · 10,000 × 8 | 72.7 | 64.9 | 37.2 |
| update · 100,000 × 8 | 587.3 | 167.2 | 111.6 |
| sort · 10,000 · flip | 182.8 | 84.8 | 27.3 |
| sort · 100,000 · flip | 1562.1 | 85.6 | 100.8 |
| scroll · 10,000 · round trip | 3627.3 | 1954.7 | — |
| scroll · 100,000 · round trip | 3718.0 | 866.7 | — |

The baseline reads plainly: the ui grid holds its own at 1k rows and falls away linearly as the dataset grows — mount runs ~4.4µs per row that virtualization never renders (39 → 75 → 471ms across 1k → 10k → 100k, where AG and MUI stay flat), sort at 100k trails AG by 18×, and the scroll sweep pays ~150ms per step at every scale. The linear mount/update term, the sort engine, and the per-step scroll render are the three levers, in that order of leverage; the optimization log below will track them as they land.

#### Optimization log

*(empty — baseline recorded, levers pending)*
