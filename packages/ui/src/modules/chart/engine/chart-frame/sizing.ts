/**
 * The sizing policy of a chart frame. An explicit `height`, an aspect ratio, and
 * the legend placement resolve to the {@link FrameSizing} that the plot box
 * measures through. It holds no React, so the policy is unit-testable in
 * isolation. {@link useChartFrameSizing} measures the box through it.
 */

import type { FrameSizing } from '../../../../hooks'
import { parseAspectRatio } from '../../../../utilities'

/**
 * A chart's aspect ratio: a `width / height` number, a `"16/9"` string, or
 * `false` to leave the frame free-form. A free-form frame takes an explicit
 * `height`, else it fills the height of its container. The ratio is a
 * preference, not a demand. A definite-height parent shorter than it clamps the
 * chart. The chart then fills the height that leaves, rather than overflowing —
 * the box is law.
 *
 * A stacked (top / bottom) legend folds into the aspect box. The ratio there
 * governs the whole chart, so a legended chart fills a fixed-aspect tile
 * without the band spilling past it. A side (left / right) legend instead bands
 * beside the plot at its own width. The ratio there governs the plot alone, and
 * the drawing never squeezes to fit the panel.
 */
export type ChartAspectRatio = number | `${number}/${number}` | false

/**
 * Resolves a chart frame's sizing policy from its props. An explicit `height`
 * always wins as a fixed pixel box. Otherwise a live `aspectRatio` derives the
 * height from the width, and with the ratio off (or unparseable) the frame is
 * free-form and fills its container. Density never sets a height, so it can't
 * conflict with the ratio.
 *
 * @remarks The plot-only sizing: the ratio governs the drawing box alone. The
 * cartesian charts and the scatter read it through {@link chartFrameLayout}.
 * That function moves a live ratio to the figure, unless a side legend bands
 * beside the plot. The pie and the donut read it through {@link sectorFrameSizing} when a
 * `height` or an `aspectRatio` is set. {@link sectorFrame} then folds a stacked
 * legend into the box. {@link HeatmapChart} reads it as it is, its range legend
 * never sharing the box.
 * @internal
 */
export function chartFrameSizing(
	height: number | undefined,
	aspectRatio: ChartAspectRatio,
): FrameSizing {
	if (height !== undefined) return { mode: 'fixed', height }

	const ratio = parseAspectRatio(aspectRatio)

	return ratio === null ? { mode: 'fill' } : { mode: 'aspect', ratio }
}

/**
 * Whether a frame's plot grows into its region's height rather than reserving
 * one: the free-form `fill` and stacked `aspect-fill` modes. The one place the
 * two fill modes are read together — distinct from {@link chartPolicy}'s `fill`
 * flag, which is the free-form mode alone.
 *
 * @internal
 */
export function frameFills(sizing: FrameSizing): boolean {
	return sizing.mode === 'fill' || sizing.mode === 'aspect-fill'
}

/**
 * Resolves a chart frame's sizing under the box-law. A live aspect ratio is a
 * preference a definite-height parent can clamp. It is never a height the
 * drawing forces on the box. An explicit `height` is a fixed pixel box and a
 * ratio-off frame fills its container, both legend-agnostic.
 *
 * A live ratio hands the ratio to the figure wrapper as a CSS `aspect-ratio`. It
 * measures the plot's own resolved height through `aspect-fill`. A parent
 * shorter than the ratio's preference therefore clamps the whole chart, and the
 * plot fills whatever height actually resolved. The drawing fits the box rather
 * than overflowing it, a stacked legend's band folding into the same box.
 *
 * The measurement falls back to the full `width / ratio` until it lands. A
 * server render, an explicit `width`, or a test frame therefore still resolves a
 * deterministic height from the width alone.
 *
 * Only a side legend keeps the ratio on the plot box itself (`aspect`). It bands
 * beside the plot at its own width. The drawing therefore holds its ratio next
 * to the panel, rather than sharing a box with it.
 *
 * @param aside Whether the legend bands beside the plot (a left / right panel)
 * rather than above or below it. A side legend keeps the ratio on the plot box.
 * Every other live-ratio frame carries it on the figure, so the parent can clamp
 * the chart.
 * @returns The `sizing` that {@link usePlotFrame} measures the plot box through,
 * and the `outerAspect`: the `width / height` that the figure reserves through
 * CSS `aspect-ratio`. The plot then fills the space that the natural size of
 * the legend leaves. `outerAspect` is `null` when the plot box carries the ratio
 * itself, or when nothing reserves one.
 * @internal
 */
export function chartFrameLayout(
	height: number | undefined,
	aspectRatio: ChartAspectRatio,
	aside: boolean,
): { sizing: FrameSizing; outerAspect: number | null } {
	const sizing = chartFrameSizing(height, aspectRatio)

	// A fixed or free-form frame is legend-agnostic. A side legend bands beside
	// the plot at its own width, so the plot box holds the ratio itself and the
	// drawing never squeezes to fit the panel.
	if (sizing.mode !== 'aspect' || aside) return { sizing, outerAspect: null }

	// No legend or a stacked band: the figure carries the ratio and the plot
	// measures its resolved height, so a definite-height parent clamps the chart
	// (the box is law) rather than the drawing overflowing it.
	return { sizing: { mode: 'aspect-fill', ratio: sizing.ratio }, outerAspect: sizing.ratio }
}
