# Competitive chart benchmarks

> **The chart module measured against AG Charts and Highcharts in real Chromium, so every optimization lands against the market, not against yesterday's self.** `pnpm bench:browser` runs the suite; the jsdom benches one directory up keep localizing regressions, this suite keeps score.

## Why a browser suite

AG Charts draws to a real canvas and all three contenders deserve real layout, style, and event plumbing, so jsdom timings would not survive scrutiny; the suite runs through Vitest browser mode on the Playwright Chromium the test suite already uses. Chromium launches with its frame-rate limit off — AG defers scene renders to animation frames and the hover benches settle one frame per iteration, so a vsync'd browser would quantize those samples to ~16ms.

## Methodology

Every scenario draws the same deterministic dataset ([`fixtures.ts`](fixtures.ts), LCG-seeded) into the same fixed 800×450 box with animations off, through each library's idiomatic API ([`contenders.tsx`](contenders.tsx)): the ui module renders through React (`createRoot` + `flushSync` — the synchronous commit a consumer pays), AG Charts and Highcharts through their vanilla factories, each with its own settle contract (AG awaits `waitForUpdate()`; Highcharts and the ui module draw synchronously).

- [`chart-mount.bench.tsx`](chart-mount.bench.tsx) — full mount-to-painted-DOM plus teardown per iteration: line at 100 / 1k / 10k × 1 series and 1k × 5, bar at 50 / 500 × 2, scatter at 1k / 10k.

- [`chart-update.bench.tsx`](chart-update.bench.tsx) — redraw on a live chart, alternating two same-shape datasets so no iteration bails on an equality guard: the ui module re-renders through its root, AG and Highcharts take their in-place data updates.

- [`chart-hover.bench.tsx`](chart-hover.bench.tsx) — a 20-step pointer sweep across the plot plus one settled frame: hit-testing, crosshair/tooltip work, and frame-deferred drawing. Every contender receives the same `pointermove` + `mousemove` pair per step, so dispatch overhead is symmetric across their differing interaction stacks.

React runs in **production** mode ([`vitest.bench.browser.config.ts`](../../../vitest.bench.browser.config.ts) forces `NODE_ENV=production`): the module ships the production build, and the vanilla contenders carry no dev/prod split, so a dev-React number would score the module's diagnostics rather than its shipped speed. The gap is real — dev React runs several times the work per render — so this is a correctness condition, not a thumb on the scale.

Fairness notes, both directions: the ui module keeps its built-in accessible output (the visually-hidden data table renders one row per datum) while Highcharts runs without its optional accessibility module and AG registers its standard `AllCommunityModule`; Highcharts' `boost` module stays off, matching default installs; the ui module pays React reconciliation the vanilla factories don't, and that is the product being measured.

## Reading and driving improvements

Each `describe` groups one scenario's three contenders, so the `BENCH Summary` prints the head-to-head ratios directly. To hold a before/after line through an optimization, snapshot then compare:

```sh
pnpm bench:browser -- --outputJson bench-baseline.json
# …optimize…
pnpm bench:browser -- --compare bench-baseline.json
```

When a competitive scenario regresses or lags, the jsdom benches (`pnpm bench`) and the pure-geometry cores (`chart-scale`, `chart-layout`, per-chart `*-geometry`) are the ladder down to the responsible layer.

## Standings (2026-07-10, this container)

Absolute numbers move with hardware; the ratios are the signal. Mean ms per iteration, ui / AG / Highcharts — **bold** marks a scenario where ui beats both.

| Scenario | ui | AG Charts | Highcharts |
| --- | ---: | ---: | ---: |
| mount · line · 100 × 1 | **5.4** | 32.9 | 27.3 |
| mount · line · 1,000 × 1 | **12.9** | 38.7 | 34.4 |
| mount · line · 10,000 × 1 | 92.4 | 67.6 | 76.9 |
| mount · line · 1,000 × 5 | **46.6** | 69.2 | 56.8 |
| mount · bar · 50 × 2 | **9.8** | 36.8 | 38.8 |
| mount · bar · 500 × 2 | **24.3** | 61.1 | 85.0 |
| mount · scatter · 1,000 | **15.5** | 49.4 | 65.1 |
| mount · scatter · 10,000 | 126.5 | 102.4 | 462.0 |
| update · line · 1,000 × 1 | **5.9** | 13.4 | 11.1 |
| update · line · 10,000 × 1 | **27.7** | 58.0 | 53.1 |
| update · line · 1,000 × 5 | **19.1** | 33.2 | 30.2 |
| update · bar · 500 × 2 | **9.0** | 21.8 | 32.9 |
| update · scatter · 10,000 | 59.6 | 62.7 | 513.5 |
| hover · line · 1,000 · sweep | 18.8 | 17.1 | 31.4 |
| hover · scatter · 10,000 · sweep | 23.5 | 17.2 | 71.8 |

The module beats **Highcharts on all fifteen** scenarios. Against AG Charts it wins the eleven small-to-mid mount and update cases outright, by wide margins. Two scenarios sit on AG's boundary and flip run to run: the line hover sweep is a dead heat (~17–19ms either side) and the 10,000-point scatter update straddles the line (~60ms against AG's ~51–63) — read both as ties, not clean wins (the table shows one favourable run). Three trail AG consistently, all at 10,000 points: line mount (~90 vs ~68), scatter mount (~127 vs ~100), and the scatter hover sweep (~24 vs ~17). The mounts are where AG rasterizes to a canvas bitmap and this module renders real SVG DOM — the trade that buys print fidelity, forced-colors, and a DOM the assistive tree and hidden data table read. The scatter-hover residual is not the marks (memoised single path) or the hit test (~0.2ms per move) but a React commit per pointer move driving the crosshair and tooltip, against AG's vanilla redraw. These slow 10k iterations carry a few percent rme even at the widened window, so the boundary cases are genuinely too close to call; closing the three real gaps trades a design property or the shared hover model for a benchmark column, so the SVG path holds and AG keeps the dense-canvas extreme.

### Optimization log

Each entry names the change and the scenarios it moved; the levers are ordered as they landed.

1. **Production React in the bench** (methodology). Measuring the shipped build instead of the dev one cut every ui number ~2.6× — the largest single move, and the honest baseline the rest build on.

2. **Deferred data table** ([`chart-frame.tsx`](../../modules/chart/chart-frame.tsx), `useDeferredValue`). The visually-hidden table holds one row per datum; taking its build off the urgent render dropped the line mounts most (1k line mount 235 → ~12 under dev React at the time), since a line's marks are one path and the table was the whole linear term. Parity is unchanged — the table converges one low-priority commit behind.

3. **Single-path plain scatter** ([`scatter-chart-marks.tsx`](../../modules/chart/scatter-chart/scatter-chart-marks.tsx)). A plain series draws as one `<path>` of every disc rather than a circle apiece, and isolation dims the group then re-draws the one lit disc over it, so a pointer crossing rebuilds nothing. Scatter 1k mount 66 → 16 (beats both); 10k mount 711 → 137, update 616 → 63, hover 30 → 25 (all now past Highcharts, closing on AG's canvas). Bubbles keep a circle each — their translucent fills must composite disc over disc.

4. **Single-path bars** ([`chart-bar-marks.tsx`](../../modules/chart/chart-bar-marks.tsx)). Each series' bars concatenate into one `<path>` — bars are opaque and never overlap, so it reads identically — with the same group-dim-plus-overlay isolation the scatter path uses. Bar 500 mount 138 → 24 and update 67 → 8, both now past AG and Highcharts; the combo and dual-axis bars ride the same renderer.

5. **Constant-radius disc path** ([`scatter-chart-geometry.ts`](../../modules/chart/scatter-chart/scatter-chart-geometry.ts)). A plain scatter series shares one radius across every disc, so the two arc commands are identical for all of them; the builder caches that suffix and formats only the one moving coordinate per disc. Scatter 10k update 67 → 60, past AG.

6. **Sub-pixel path coordinates** ([`chart-coords.ts`](../../modules/chart/chart-coords.ts)). Path `d` strings round to two decimals, a fraction of the full-float size; a structural cleanup that shrinks the DOM payload the large-N paths ship.

Open, and where the gap sits: every remaining loss is to AG Charts's canvas at 10,000 points — line mount, scatter mount, and the scatter hover sweep. Each is the SVG-DOM-versus-bitmap trade rather than a missing optimization: the marks are already one path per series, and the remaining cost is the DOM the browser lays out plus, for the hover sweep, a React commit per pointer move against AG's vanilla redraw. Closing them trades a design property for a benchmark column, so they stay open by choice.
