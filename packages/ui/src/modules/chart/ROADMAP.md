# Chart roadmap

> **Goal: a full dashboard charting kit on one hand-rolled SVG foundation.** The module ships Bar, Line, Pie, and Combo on shared scales, frame parts, and a CVD-validated categorical palette; this file tracks what the foundation was shaped to absorb next.

## Status

The foundation is in place: pure scale and geometry cores (`chart-scale`, `chart-layout`, per-chart `*-geometry`), the shared frame (legend and visually-hidden data table as plain HTML around a `role="img"` plot), a hover context confined to the crosshair and tooltip overlays, the eight-slot series palette in `kata/chart`, and the Sparkline `animate` contract (static SVG by default, opt-in `motion/react` renderers inside `ReducedMotion`).

Bar draws grouped zero-baseline spans as one-end-rounded paths, so negative values already render; `stacked` piles each category's series into one part-to-whole column on the summed value axis, insetting the shared edges for the surface gap and rounding only the outermost segment. An `orientation` prop transposes the whole cartesian frame through `chart-orientation`'s single coordinate projection, so horizontal bars reuse the same scales, marks, hit test, and crosshair with categories down the side. Line breaks at missing values and surfaces isolated points as ringed markers. Pie sweeps positive shares with surface-colour gaps, fit-gated segment labels, and a donut hole for centered children. Combo layers bars behind pointed lines on one shared value axis.

The legend is the series switchboard: centered toggle buttons where pointing an entry dims the other series and clicking toggles one off — the sweep, scales, and readout re-derive while slot colours hold to the fixed order.

`AreaChart` fills each series under its band-edge line — stacked into a part-to-whole ribbon set or left as independent overlapping washes — reusing the line renderer and a stacked-domain pass on the shared scale. Line and combo lines take an `interpolation` prop: `'smooth'` draws a monotone cubic that never overshoots the data.

A `reference` prop annotates the four cartesian charts with fixed-value rules — targets, thresholds, averages — drawn across the band axis on the same `value → project → draw` path as the gridlines but on a raw domain value. Each value folds into the domain the way `min`/`max` pins do, so an off-data target stays on-frame, and the dashed rules draw over the marks so a mark crossing one stays legible. Each rule is a hover target floating a tooltip with its value and label, takes a named palette slot or any raw CSS colour (hex, `oklch()`), and carries visually-hidden parity beside the data table; horizontal orientation is free through the shared coordinate projection.

Keyboard navigation makes the cartesian plot a single tab stop that drives the same hover context as the pointer (`use-chart-keyboard`). Focus only rings the region — a click focuses it too, so seizing the readout would fight the pointer — and the first arrow reads the first data point; from there the band-axis arrows walk categories and the value-axis arrows cycle a category's series value points, visiting each series even where two overlap on one value, so the crosshair and tooltip answer arrow keys, Home / End jump to the ends, and Escape drops focus. Orientation transposes which arrow pair does which through the shared projection, and the visually-hidden data table still carries full value parity for assistive tech.

## Backlog

- **Time x-axis.** A time scale beside `bandScale` for date-keyed rows, with locale tick formatting through `@internationalized/date`.

- **Texture fills.** The 45°/135° hand-drawn fill as the identity channel for forced-colors, print, and full-severity CVD — opt-in, never default.

- **Selective value labels.** Endpoint and extreme direct labels with collision handling — measure first, never clip.
