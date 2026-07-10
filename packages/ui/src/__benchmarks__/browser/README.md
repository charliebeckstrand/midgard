# Competitive chart benchmarks

> **The chart module measured against AG Charts and Highcharts in real Chromium, so every optimization lands against the market, not against yesterday's self.** `pnpm bench:browser` runs the suite; the jsdom benches one directory up keep localizing regressions, this suite keeps score.

## Why a browser suite

AG Charts draws to a real canvas and all three contenders deserve real layout, style, and event plumbing, so jsdom timings would not survive scrutiny; the suite runs through Vitest browser mode on the Playwright Chromium the test suite already uses. Chromium launches with its frame-rate limit off — AG defers scene renders to animation frames and the hover benches settle one frame per iteration, so a vsync'd browser would quantize those samples to ~16ms.

## Methodology

Every scenario draws the same deterministic dataset ([`fixtures.ts`](fixtures.ts), LCG-seeded) into the same fixed 800×450 box with animations off, through each library's idiomatic API ([`contenders.tsx`](contenders.tsx)): the ui module renders through React (`createRoot` + `flushSync` — the synchronous commit a consumer pays), AG Charts and Highcharts through their vanilla factories, each with its own settle contract (AG awaits `waitForUpdate()`; Highcharts and the ui module draw synchronously).

- [`chart-mount.bench.tsx`](chart-mount.bench.tsx) — full mount-to-painted-DOM plus teardown per iteration: line at 100 / 1k / 10k × 1 series and 1k × 5, bar at 50 / 500 × 2, scatter at 1k / 10k.

- [`chart-update.bench.tsx`](chart-update.bench.tsx) — redraw on a live chart, alternating two same-shape datasets so no iteration bails on an equality guard: the ui module re-renders through its root, AG and Highcharts take their in-place data updates.

- [`chart-hover.bench.tsx`](chart-hover.bench.tsx) — a 20-step pointer sweep across the plot plus one settled frame: hit-testing, crosshair/tooltip work, and frame-deferred drawing. Every contender receives the same `pointermove` + `mousemove` pair per step, so dispatch overhead is symmetric across their differing interaction stacks.

Fairness notes, both directions: the ui module keeps its built-in accessible output (the visually-hidden data table renders one row per datum) while Highcharts runs without its optional accessibility module and AG registers its standard `AllCommunityModule`; Highcharts' `boost` module stays off, matching default installs; the ui module pays React reconciliation the vanilla factories don't, and that is the product being measured.

## Reading and driving improvements

Each `describe` groups one scenario's three contenders, so the `BENCH Summary` prints the head-to-head ratios directly. To hold a before/after line through an optimization, snapshot then compare:

```sh
pnpm bench:browser -- --outputJson bench-baseline.json
# …optimize…
pnpm bench:browser -- --compare bench-baseline.json
```

When a competitive scenario regresses or lags, the jsdom benches (`pnpm bench`) and the pure-geometry cores (`chart-scale`, `chart-layout`, per-chart `*-geometry`) are the ladder down to the responsible layer.

## Baseline (2026-07-10, this container)

Absolute numbers move with hardware; the ratios are the signal. Mean ms per iteration, ui / AG / Highcharts:

| Scenario | ui | AG Charts | Highcharts |
| --- | ---: | ---: | ---: |
| mount · line · 100 × 1 | 34.2 | 39.2 | 29.5 |
| mount · line · 1,000 × 1 | 239.7 | 36.9 | 33.9 |
| mount · line · 10,000 × 1 | 2,061.9 | 74.8 | 77.6 |
| mount · line · 1,000 × 5 | 623.8 | 67.0 | 60.5 |
| mount · bar · 50 × 2 | 53.9 | 38.5 | 35.3 |
| mount · bar · 500 × 2 | 396.2 | 63.0 | 102.2 |
| mount · scatter · 1,000 | 321.9 | 49.6 | 79.6 |
| mount · scatter · 10,000 | 2,575.7 | 88.1 | 446.2 |
| update · line · 1,000 × 1 | 74.5 | 13.4 | 11.4 |
| update · line · 10,000 × 1 | 670.0 | 46.7 | 49.9 |
| update · line · 1,000 × 5 | 201.0 | 30.4 | 30.2 |
| update · bar · 500 × 2 | 147.0 | 19.1 | 32.2 |
| update · scatter · 10,000 | 1,452.7 | 54.7 | 501.1 |
| hover · line · 1,000 · sweep | 23.8 | 17.1 | 40.0 |
| hover · scatter · 10,000 · sweep | 169.3 | 17.2 | 79.0 |

The shape of the gap is the finding. At dashboard-typical sizes the module is competitive — the 100-point mount beats AG Charts and the 1,000-point hover sweep beats Highcharts — but cost grows near-linearly with row count while both rivals stay almost flat, opening to ~27× on the 10,000-point mounts and ~13–48× on the large updates. Profile-first suspects for that slope: the hidden accessibility table (one DOM row per datum, rebuilt on every data swap), per-datum SVG node counts against the competitors' single-path / canvas marks, and the update path re-rendering the whole frame instead of patching marks. The slow ui rows carry ±10–30% rme (their iterations are so slow the 2s window yields ~10 samples); the ratios dwarf that noise.
