# Chart roadmap

> **Goal: a full dashboard charting kit on one hand-rolled SVG foundation.** The module ships Bar, Line, Pie, and Combo on shared scales, frame parts, and a CVD-validated categorical palette; this file tracks what the foundation was shaped to absorb next.

## Status

The foundation is in place: pure scale and geometry cores (`chart-scale`, `chart-layout`, per-chart `*-geometry`), the shared frame (legend and visually-hidden data table as plain HTML around a `role="img"` plot), a hover context confined to the crosshair and tooltip overlays, the eight-slot series palette in `kata/chart`, and the Sparkline `animate` contract (static SVG by default, opt-in `motion/react` renderers inside `ReducedMotion`).

Bar draws grouped zero-baseline spans as one-end-rounded paths, so negative values already render and stacking is an offset pass away. Line breaks at missing values and surfaces isolated points as ringed markers. Pie sweeps positive shares with surface-colour gaps, fit-gated segment labels, and a donut hole for centered children. Combo layers bars behind pointed lines on one shared value axis.

The legend is the series switchboard: centered toggle buttons where pointing an entry dims the other series and clicking toggles one off — the sweep, scales, and readout re-derive while slot colours hold to the fixed order.

## Backlog

- **Stacked bars.** `stacked?: boolean` on `BarChart`: a domain-sum pass over the existing `(x0, x1, y0, y1)` spans, segment gaps via the pie's surface-stroke trick, rounded cap on the outermost segment only.

- **Curved lines.** `curve?: 'linear' | 'monotone'` on `LineChart` — monotone cubic keeps the interpolation inside the data envelope; the segment builder is the only touch point.

- **Time x-axis.** A time scale beside `bandScale` for date-keyed rows, with locale tick formatting through `@internationalized/date`.

- **Keyboard interaction parity.** A roving tabindex over categories driving the same hover context as the pointer, so the crosshair and tooltip answer arrow keys; today the visually-hidden table carries value parity instead.

- **Texture fills.** The 45°/135° hand-drawn fill as the identity channel for forced-colors, print, and full-severity CVD — opt-in, never default.

- **Angular pie sweep.** Animate slices by sweeping angle rather than the current staggered fade; needs arc interpolation, which `d`-string tweening does not give reliably.

- **Selective value labels.** Endpoint and extreme direct labels with collision handling — measure first, never clip.
