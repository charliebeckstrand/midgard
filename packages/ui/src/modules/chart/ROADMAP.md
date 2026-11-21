# Chart roadmap

> **Goal: test the charts that the apps use, and add the cartesian features of peer libraries.** Every chart type composes one engine, so a change to a core reaches each chart. Each optimization lands only on a measured delta.

## Status

The module exports `BarChart`, `LineChart`, `AreaChart`, `ComboChart`, `PieChart`, `DonutChart`, `ScatterChart`, `BubbleChart`, `HeatmapChart`, `ChoroplethChart`, and `SeatChart`. `SectorChart` is internal: Pie, Donut, and Seat compose it. `ChoroplethChart` draws over `MapPlat` from the map module. The elections app renders `SeatChart` with `ChartHeaderActionsFallback`, and the numbers app renders a `BarChart`.

The engine under `engine/` holds two layers. The pure cores compute scales, layout, geometry, hit tests, stacks, time ticks, and legend fits. The React shell renders the frame, the marks, the legend, the tooltip, and the data table over them. The [§Engine](#engine) section gives the rules of the pure layer.

The drawn line and area paths decimate to a per-column envelope above two points for each pixel. The hit test, the markers, the value labels, and the data table read the full-resolution runs. `chart-line-geometry.test.ts` and `chart-area-geometry.test.ts` hold this separation, and they pin the exact `d` strings of a chart below the threshold.

The line `trace` that the hit test reads is lazy. `lineGeometry` in `engine/chart-geometry/line.ts` wraps it in `once` (`utilities/once.ts`), so no render builds it and the first pointer move pays for it.

The visually-hidden data table renders in a deferred pass, and a pointer move does not render it again. `chart-table-render.test.tsx` holds the second rule. `chart-hover-renders.test.tsx`, `chart-parent-render.test.tsx`, and `chart-toggle-render.test.tsx` hold the render counts of the frame on a hover, a parent render, and a legend toggle.

The first paint draws the shell of the frame with no SVG. A `SeatChart` with no majority label and no hole content draws its seats at once. `chart-first-paint-server-markup.test.tsx` and `browser/geometry/seat-chart-prepaint.test.tsx` hold the first paint.

Measurement has three rungs. The [browser suite](../../__benchmarks__/browser/README.md) times mount, update, and hover in Chromium. The jsdom benches, such as `chart-resize.bench.tsx`, find the module that regressed. `chart-geometry.bench.ts`, `chart-scale.bench.ts`, and `chart-layout.bench.ts` time the pure cores in Node. The browser suite README gives the procedure for a before and after run.

## Engine

A pure chart core is framework-free. It has no `'use client'`, no runtime import of `react`, `react-dom`, or `motion`, and no runtime import from the module root. A type-only import is correct, such as `ChartAxisTick` from `chart-axes/axis.tsx`.

The pure files are each file in `chart-geometry/` and `chart-cartesian/`, and `chart-scale.ts`, `chart-coords.ts`, `chart-hit-test.ts`, `chart-layout.ts`, and `chart-time.ts`. The files `fit.ts`, `band.ts`, and `range.ts` in `chart-legend/` are pure too. The node-environment tests under `__tests__/geometry` and the Node benches import them with no DOM.

[`engine-purity-boundary.test.ts`](../../__tests__/boundary/engine-purity-boundary.test.ts) is the gate of the pure-core invariant. The folder also holds the shell, so the gate does not read all of `modules/chart/engine`. Its `CHART_PURE_CORES` list names the pure files and folders above. The gate applies the rules to each of them, and to each engine file that a runtime import from them reaches, such as `chart-constants.ts` and `chart-color/paint.ts`. Thus a pure core that imports a shell file at runtime fails the gate. A new pure core joins the list.

`module-filename-boundary.test.ts` holds the names of the engine. A file directly under `engine/` takes a `chart-` or `use-chart-` prefix. A concept folder, such as `chart-geometry/`, takes short kind names, does not nest, and has no barrel.

## Features

1. **Step interpolation (*P2*).** `LineInterpolation` in `engine/chart-geometry/line.ts` is `'linear' | 'smooth'`. Recharts (`type="step"`) and ECharts (`step`) draw a value that holds between samples, such as a price tier or a counter. A slope draws such a value wrong. Add `'step'` to `lineGeometry` and to `traceRun`, so the hit test follows each riser, and the area rides the same builder. `chart-line-geometry.test.ts` must pin the step `d` string, and a `line/step.tsx` docs example must show it.

2. **Reference band (*P2*).** `ChartReferenceLine` in `engine/chart-reference.ts` takes a line at a value or at a category, and no range. Recharts `ReferenceArea`, AG Charts range `crossLines`, and ECharts `markArea` shade a span, such as a target range or an outage. Add a range member with `from` and `to` on the value axis. Draw its wash under the marks in `chart-reference-lines.tsx`, and give it a legend chip and a readout as a line has. `chart-reference-lines.test.tsx` and the `reference-lines.tsx` docs example prove it.

3. **Normalized stack (*P3*).** `StackMode` in `engine/chart-cartesian/stack.ts` is `false`, `'signed'`, or `'positive'`, so a stack shows totals only. Recharts (`stackOffset="expand"`) and AG Charts (`normalizedTo`) scale each column to 100%. The open questions are the prop shape on `stacked` and whether the tooltip reads the share or the value. The domain goes in `chart-cartesian/axes.ts`. `chart-bar-geometry.test.ts` and `chart-area-geometry.test.ts` prove it.

4. **Category window with a brush (*P3*).** No chart can zoom to a span of its categories. ECharts `dataZoom`, Recharts `Brush`, and the AG Charts navigator do this for a long time series. The decimation is width-gated, so a narrow window draws at full resolution with no extra work. The open questions are the keyboard model of the brush and its place in the frame (`engine/chart-frame/cartesian.tsx`). A browser test must drive the brush by pointer and by keyboard.

## Pattern cleanup

1. **Verb-first names in the engine (*P3*).** CONVENTIONS.md §8.5 requires a verb at the start of a function name. Most engine exports take the d3 noun form, such as `linearScale`, `barMarks`, `lineGeometry`, and `seatLayout`. One file can mix the two forms, as `lineGeometry` and `buildLineSeries` do in `chart-geometry/line.ts`. The open question is a rename in one pull request for each concept folder, or a recorded d3 exemption in §8.5. Decide the rule first, because a rename touches each test and bench of the core.

## Performance

1. **A smooth case for the hit-test bench (*P2*).** The `thinMarksAt` group of [`chart-layout.bench.ts`](../../__benchmarks__/chart-layout.bench.ts) times only linear traces. On 2026-11-21 it measured about 0.4 ms for a linear line of 10,000 points. A smooth trace cuts each cubic into chords of 4 px or less, so it holds more points than its run. Add a smooth case, because the next item depends on it.

2. **Benches for the seat and pie cores (*P2*).** `SeatChart` is the chart of the elections app, and no bench at any rung measures it. `chart-geometry.bench.ts` has no case for `seatLayout` or `pieSlices`, and `chart-mount.bench.tsx` has no `SeatChart` scenario. Add a core case for each and a seat mount scenario to `browser/charts.tsx`. The work is instrumentation only, and it gives a later change a baseline.

3. **Sub-linear line hit test (*P3*).** `thinMarksAt` in `engine/chart-hit-test.ts` scans each segment of each trace on each pointer move. A binary search over the x-sorted trace can make it O(log n + k). The scan is under a millisecond at 10,000 points, and the hover cost is the React commit of each move. Take this item only when the smooth case of item 1 shows the scan gating a sweep.

4. **Imperative hover overlay (*P3*).** Each pointer move commits React to move the crosshair and the tooltip (`engine/chart-crosshair.tsx`, `engine/chart-tooltip.tsx`, `engine/use-chart-pointer.ts`). A write of the transform to the DOM on `pointermove` can remove that commit. Each sweep of `chart-hover.bench.tsx` awaits a frame, so the browser suite README reads the hover rows as unresolved. The open question is a hover bench that resolves under one frame. Take the change only when such a bench shows a cost, and only with the interaction suites green.

On 2026-11-21, `chart-geometry.bench.ts` measured the smooth `lineGeometry` build of 10,000 points at 3.4 to 3.8 ms (mean), with the lazy trace. Use it as the baseline of a change to the line core.

## Accessibility and testing

1. **Complete the chart cases of the a11y corpus (*P1*).** `a11y/cases/data-display.tsx` holds Bar, Line, Area, Pie, Donut, Seat, and Combo charts. It holds no `ScatterChart`, `BubbleChart`, `HeatmapChart`, or `ChoroplethChart`, so the sweep gates do not reach them. CONVENTIONS.md §10.5 puts a guarantee for each component of a kind in the corpus. Add a case for each, with an accessible name and a data table.

2. **Keyboard tests for `SeatChart` (*P1*).** `seat-chart.tsx` gives each group one keyboard stop at its middle seat. No test drives it: `seat-chart.test.tsx` sends no arrow key, and `chart-keyboard.test.tsx` renders no `SeatChart`. The elections app shows this chart. Add cases that step through the groups, read the readout of each group, and skip an empty group.

3. **A summary for a large data table (*P3*).** The hidden table holds one row for each category. A series of 10,000 points thus gives a table too long to read in full (WCAG 1.1.1, 1.3.1). The table is deferred, so it costs nothing on the urgent path, and its layout cost is the text boxes. The open question is a summary above some size that points to "View data" (`engine/chart-data-dialog.tsx`). A jsdom test must hold the row limit and the summary text.

## Not planned

- Structure-of-arrays point geometry. A head-to-head bench of `lineGeometry` measured it as a wash against `{ x, y }` objects, because the string synthesis is the floor. Each point consumer would change for no gain.

- The data table as an HTML string. It mounted faster and updated slower than the React table, and both run in the deferred pass. It also needs `dangerouslySetInnerHTML` and an escaper of its own.

- A style change to cut the layout of the data table. Each `display` change kept most of the cost. `content-visibility: auto` removes the table from the accessibility tree, and Safari drops the table semantics under a `display` change unless each element has a role.

- Retained scratch buffers for the path builders. The builders add to one string and keep no intermediate array, so no buffer remains to reuse.

- A canvas renderer. The marks take their paint from recipe classes (`engine/chart-color/paint.ts`), and forced colors and the image export read the SVG. The decimation already removed the large cost of a dense SVG line.

- A move of the React shell out of `engine/`. The engine purity gate gives the guarantee of purity with no change of path for each import.

- New chart families, such as treemap, sankey, radar, or candlestick. No app needs one, and each needs its own geometry, readout, and keyboard model.

---

**See also:** [`index.ts`](index.ts) (public surface) · [the browser suite](../../__benchmarks__/browser/README.md) · [`../../../docs/MODULES.md`](../../../docs/MODULES.md).
