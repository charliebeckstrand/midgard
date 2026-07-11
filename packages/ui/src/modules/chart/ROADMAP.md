# Chart performance roadmap

> **Goal: benchmark-driven optimization of the shared chart engine.** The feature foundation is built — Bar, Line, Area, Pie, Donut, Combo, Scatter, Bubble, Heatmap, and Choropleth all compose one engine, and the [competitive suite](../../__benchmarks__/browser/README.md) already puts the module ahead of AG Charts and Highcharts on every mount and update. This file retires the feature roadmap (its shortlist shipped) and tracks what comes next: holding that lead and widening it, one measured change at a time, now that a single engine core carries every chart type so one optimization there reaches all of them.

## Status

The engine namespace refactor (#962) is clean: re-running the full browser suite on 2026-07-11 shows **no regression**. Every mount and every update scenario still beats both AG Charts and Highcharts at ratios matching or exceeding the [2026-07-10 standings](../../__benchmarks__/browser/README.md#standings-2026-07-10-this-container), the 10,000-point canvas cases included. The two hover sweeps — the only scenarios the module did not win outright — moved the right way: the line sweep is now a dead heat (ui 17.24 ms vs AG 17.07 ms) and the scatter sweep a slight ui lead (16.56 ms vs 17.66 ms), where the 2026-07-10 line had both trailing AG by a millisecond or two. The refactor folded line, area, and combo onto the shared `ChartCartesianAxes` and `drawnSeries`/`lineSeriesOf` builders without moving a number, which is the outcome a pure-rename-plus-dedupe refactor should have. The baseline stands; the ladder below is now the record of every subsequent move.

The foundation this optimizes is the engine described in [`CONVENTIONS.md`](../../../../../CONVENTIONS.md) and the retired feature roadmap: a d3-shaped functional core under `engine/` (pure scale, layout, geometry, hit-test, and colour math, framework-free and unit-tested), with the React shell rendering over it. Because every chart type routes through the same cores, the optimization surface is small and shared — `chart-geometry/*`, `chart-scale`, `chart-coords`, `chart-hit-test` — and each is covered by a pure `*.test.ts` suite (`__tests__/modules/chart-scale`, `chart-layout`, `chart-hit-test`, `heatmap-chart-geometry`, …), so a hot-path rewrite is proven correct before it is proven fast.

## How we measure

Three rungs, coarsest to finest. The **competitive browser suite** (`pnpm bench:browser`, real Chromium, production React) keeps score against the market — mount, update, and hover across line/bar/scatter at 50 to 10,000 points. The **jsdom benches** (`pnpm bench`) localize a regression to the module without a browser — `chart-resize` proves the ResizeObserver path stays one bounded rebuild per notification with no host cascade. The **pure cores** are the finest rung, and now instrumented: `chart-geometry.bench.ts` and `chart-scale.bench.ts` (node env, no React, no DOM) exercise `lineGeometry`, `barMarks`, `stackedBarMarks`, `scatterMarks`/`scatterDiscsPath`, and `linearScale` directly at 1k/10k over the same LCG fixture the browser suite draws, so a change to one core reads as a delta at the layer it changed rather than diluted through React reconciliation and the DOM commit. The captured before-line on this container: the 10k line path builder runs ~4.6 ms linear / ~11 ms smooth, the 10k scatter disc path ~5 ms, and `linearScale` ~0.19 ms over a 10k pool — the numbers avenues 2–4 must move.

To hold a before/after line through a change, snapshot then compare:

```sh
pnpm bench:browser -- --outputJson bench-baseline.json
# …optimize…
pnpm bench:browser -- --compare bench-baseline.json
```

Absolute numbers move with hardware; the ratios and the deltas are the signal.

## Optimization avenues

The organizing belief, and the reason the feature roadmap could retire into this one: elegant code and fast code usually agree, because both come from removing layers. The wins below are not micro-tuning around a fixed shape — they are core-concept changes that make the hot paths *smaller*. Where modern ES6 reads best it stays; where a `map().join()` or a spread allocates an array the loop it desugars to never needed, the tried-and-true vanilla form is both leaner and quicker, and that is the trade each item names explicitly. Every entry cites the file, its current shape, the hypothesis, and the bench that gates it.

### 1. Pure-core microbenchmarks (the prerequisite) — shipped

`chart-geometry.bench.ts` and `chart-scale.bench.ts` now sit beside the existing benches, exercising `lineGeometry` (linear and smooth), `barMarks`, `stackedBarMarks`, `scatterMarks`/`scatterDiscsPath`, and `linearScale` at 1k/10k in a node env — no React, no DOM — over the shared LCG fixture. This turns every avenue below from an end-to-end guess into a measured core delta, and gives the string- and allocation-level changes (2–4) a number the browser suite is too coarse to show. It ships nothing to users; it is pure instrumentation, and it came first because the rest lean on it. The baseline it captures (above) is the reference the next changes hold against.

### 2. Structure-of-arrays point geometry (the core-concept lever)

`engine/chart-geometry/line.ts` models a point as `{ x, y }` and a run as `LinePoint[]`. At 10,000 points `lineGeometry` allocates ten thousand small objects in `runs()`, walks them again in `points: pointRuns.flat()`, and hands `LinePoint[][][]` to the hit test, which chases each object header on every pointer move. The classic data-oriented rewrite is parallel `Float64Array` columns — `xs`, `ys` — instead of an array of objects: one contiguous allocation per run, no per-point header, cache-friendly linear reads, and near-zero GC pressure on the update and hover paths where the geometry rebuilds every frame. `segmentDistanceSquared` becomes index arithmetic into two typed arrays rather than four property loads. This is the single largest lever, it touches line/area/scatter across mount, update, and hover, and it is where the hover residual actually lives. Gated by the scatter/line hover sweeps and the 10k mount/update, proven by `chart-hit-test.test.ts` and the geometry suites. The public `LinePoint` shape can stay as the boundary type while the internal storage goes typed — the elegance is in the seam, the speed in the columns behind it.

### 3. Single-buffer path synthesis (ES6-elegance vs vanilla, named) — shipped

`segmentPath` built a linear segment as `run.map(p => \`${coord(p.x)} ${coord(p.y)}\`).join(' L ')` — for one 10k run an intermediate array of ten thousand strings and a join over all of them; `scatterDiscsPath` pushed per-disc parts to an array joined at the end; the rounded bar paths `.join(' ')` a fixed-length command array per bar. All three now accumulate into one string with `+=`, so the intermediate array never exists — `map().join()` is the elegant spelling of exactly the loop that allocates the array it then discards, and the loop that doesn't is both shorter and faster. A head-to-head microbench put accumulation at 1.22× the `map().join()` shape and 1.13× a preallocated-array join, so accumulation won on merit, not assumption. The measured core deltas: `barMarks` 1.27–1.43×, `scatterDiscsPath` 1.29–1.40×, `lineGeometry` linear 1.08× (its remaining cost is the point-object allocation avenue 2 owns, not the string). Output is byte-identical — the line, bar, scatter, area, combo, and sparkline suites pin the exact `d` strings (`lineGeometry` alone asserts `'M 0 1 L 10 2'` and its area close verbatim), and all 188 tests across those and the hit-test/transition consumers stayed green. `coord()` itself was measured too and left alone: an integer fast-path scored 1.02×, inside the noise, so `String(Math.round(v * 100) / 100)` stays — the honest non-move.

### 4. Single-pass domain reduction — shipped

`linearScale` (`engine/chart-scale.ts`) did `values.filter(Number.isFinite)` — a full copy — then `Math.min(...finite)` and `Math.max(...finite)`, spreading the array through `Function.prototype.apply` twice. It now folds the finite extent, the zero baseline, and the pins in one `for` pass — allocation-free, and no `apply` to overflow the argument limit on a large series. This scored the largest core delta of the campaign: **~4×** (10k pool 0.197 → 0.048 ms, 1k 0.018 → 0.005 ms), because the 10k-argument spread was itself the cost, not just the filter copy. It sits on every mount and update — every chart resolves its domain — so the win compounds across the family. All 19 `chart-scale.test.ts` cases green; the reduction runs over exactly the same value set, so the domain, ticks, and mapping are unchanged.

### 5. Sub-linear line hit testing

`nearestSeriesLine` (`engine/chart-hit-test.ts`) scans every segment of every run on every pointer move — O(points) per `pointermove`, the whole cost of the hover sweep at 10k. Points within a run are x-sorted, so a binary search to the segments straddling `pointerX ± tolerance` turns the per-move scan into O(log n + k) over only the local segments. This is the algorithmic complement to avenue 2: SoA makes each segment test cheap, the search makes the number of tests small. Gated directly by the hover sweeps, proven by `chart-hit-test.test.ts` (the sticky-hold and nearest-wins cases must survive the narrowed scan).

### 6. The imperative hover overlay (the last millisecond, by choice)

The hover residual the competitive README documents is not the marks or the hit test but a React commit per pointer move driving the crosshair and tooltip (`engine/chart-crosshair.tsx`, `engine/chart-tooltip.tsx`, `engine/use-chart-pointer.ts`), against AG's vanilla canvas redraw. Avenues 2 and 5 shrink the work *before* the commit; this one removes the commit — writing the crosshair transform and tooltip position to the DOM imperatively on `pointermove`, keeping React for structure and mount only. It trades the declarative hover model for the frame, so it is deliberately last and strictly bench-gated: taken only if the hover sweeps still trail after 2 and 5, and only behind the parity the `chart-hit-test` and interaction suites already enforce.

### 7. Retained scratch buffers across update frames

On the update path a live chart rebuilds its geometry from scratch each redraw, re-allocating the path builder's working arrays every frame. A module-scoped, length-guarded scratch buffer (grown, never shrunk, reused across frames) removes the per-frame allocation — the standard retained-buffer pattern, safe because the geometry cores are single-threaded and synchronous. Gated by the update benches, and only worth taking once avenue 2 has settled the point representation it would buffer.

## Principle

Optimize on measurement, not intuition: no avenue lands without a bench that moved, and no bench moves without the pure-core test suites staying green — correctness is the invariant, speed the variable. Prefer the change that removes a layer over the one that tunes around it; reach for vanilla JavaScript where an ES6 convenience is allocating the very structure the loop beneath it never needed, and keep the ES6 everywhere it costs nothing. The engine is the leverage — one core serves every chart — so a core-level win is a whole-module win, and that is why the work concentrates there.

---

**See also:** [`index.ts`](index.ts) (public surface) · [the competitive suite](../../__benchmarks__/browser/README.md) · [`../../../docs/MODULES.md`](../../../docs/MODULES.md).
