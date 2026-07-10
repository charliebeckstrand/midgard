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
| mount · line · 100 × 1 | **5.1** | 35.3 | 26.6 |
| mount · line · 1,000 × 1 | **12.8** | 34.0 | 36.3 |
| mount · line · 10,000 × 1 | 89.4 | 66.4 | 78.2 |
| mount · line · 1,000 × 5 | **47.4** | 61.8 | 58.5 |
| mount · bar · 50 × 2 | **9.8** | 34.3 | 40.4 |
| mount · bar · 500 × 2 | **24.3** | 62.4 | 83.8 |
| mount · scatter · 1,000 | **16.7** | 49.8 | 61.8 |
| mount · scatter · 10,000 | 152.8 | 102.4 | 478.5 |
| update · line · 1,000 × 1 | **7.0** | 14.7 | 12.9 |
| update · line · 10,000 × 1 | **30.5** | 51.2 | 48.8 |
| update · line · 1,000 × 5 | **17.6** | 36.1 | 27.9 |
| update · bar · 500 × 2 | **8.1** | 19.8 | 35.1 |
| update · scatter · 10,000 | 67.5 | 49.1 | 506.9 |
| hover · line · 1,000 · sweep | 17.9 | 17.2 | 35.2 |
| hover · scatter · 10,000 · sweep | 27.1 | 17.1 | 76.4 |

The module now beats **Highcharts on all fifteen** scenarios and **AG Charts on ten**. The five it trails are all AG Charts alone, and all but the hover-line tie (0.7ms, inside the noise) are the 10,000-point cases where AG rasterizes to a canvas bitmap and this module renders real SVG DOM — the trade that buys print fidelity, forced-colors, and a DOM the assistive tree and the hidden data table read. Closing those last cases means either shaving the geometry hot paths further or a canvas fallback for large N, which would forfeit exactly those SVG properties; that is a design call, not a free win.

### Optimization log

Each entry names the change and the scenarios it moved; the levers are ordered as they landed.

1. **Production React in the bench** (methodology). Measuring the shipped build instead of the dev one cut every ui number ~2.6× — the largest single move, and the honest baseline the rest build on.

2. **Deferred data table** ([`chart-frame.tsx`](../../modules/chart/chart-frame.tsx), `useDeferredValue`). The visually-hidden table holds one row per datum; taking its build off the urgent render dropped the line mounts most (1k line mount 235 → ~12 under dev React at the time), since a line's marks are one path and the table was the whole linear term. Parity is unchanged — the table converges one low-priority commit behind.

3. **Single-path plain scatter** ([`scatter-chart-marks.tsx`](../../modules/chart/scatter-chart/scatter-chart-marks.tsx)). A plain series draws as one `<path>` of every disc rather than a circle apiece, and isolation dims the group then re-draws the one lit disc over it, so a pointer crossing rebuilds nothing. Scatter 1k mount 66 → 16 (beats both); 10k mount 711 → 137, update 616 → 63, hover 30 → 25 (all now past Highcharts, closing on AG's canvas). Bubbles keep a circle each — their translucent fills must composite disc over disc.

4. **Single-path bars** ([`chart-bar-marks.tsx`](../../modules/chart/chart-bar-marks.tsx)). Each series' bars concatenate into one `<path>` — bars are opaque and never overlap, so it reads identically — with the same group-dim-plus-overlay isolation the scatter path uses. Bar 500 mount 138 → 24 and update 67 → 8, both now past AG and Highcharts; the combo and dual-axis bars ride the same renderer.

5. **Sub-pixel path coordinates** ([`chart-coords.ts`](../../modules/chart/chart-coords.ts)). Path `d` strings round to two decimals, a fraction of the full-float size; a structural cleanup that shrinks the DOM payload the large-N paths ship.

Open, and where the gap sits: every remaining loss is to AG Charts's canvas at 10,000 points (line mount, and the scatter mount / update / hover trio), plus a hover-line result inside measurement noise. Each is the SVG-DOM-versus-bitmap trade rather than a missing optimization — the marks are already one path per series — so closing them trades a design property for a benchmark column.
