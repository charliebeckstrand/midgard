'use client'

import { useCallback, useRef } from 'react'
import {
	type ChartChrome,
	type ChartTier,
	chartChromeReserve,
	policyPlotHeight,
} from './chart-tier'

/**
 * The plot height the {@link chartPolicy} tier resolves against, stabilised so no
 * tier decision can perturb it — the fix that keeps a container-measured chart
 * from oscillating at the spark floor.
 *
 * A stacked figure (`aspect-fill` or free-form `fill`) shares its box with the
 * header and legend, so the `flex-1` plot's measured remainder shrinks while the
 * tier keeps that chrome and jumps back when spark drops it: feed that remainder
 * to the tier and it flips spark → compact → spark forever, with no fixed point.
 * {@link policyPlotHeight} already breaks the loop for `aspect-fill` by deriving
 * the height from the figure's own `width / ratio` — a value no measurement of a
 * tier-resized plot enters. A free-form `fill` frame has no ratio to derive from:
 * its height is the container's, genuinely measured. So recover a
 * chrome-independent container height from the measured remainder instead — add
 * back the reserve of the chrome *actually rendered this commit* (tracked across
 * renders), which reconstructs the same container height whether the plot is
 * currently framed (remainder + full reserve) or spark (remainder + none), then
 * take off the framed reserve so the tier always reads the height the plot has
 * when framed. That height is a fixed point: the spark decision no longer moves
 * the value it is decided from, so it converges in a bounded number of renders
 * rather than looping. The drawing still fills the measured remainder — only the
 * tier reads the stabilised height.
 *
 * @param frameHeight The plot's measured drawing height, still the drawing's.
 * @param frameWidth The measured plot (and figure) width.
 * @param outerAspect The `width / ratio` the figure carries under `aspect-fill`,
 * `null` for a free-form `fill` frame (and every non-stacked mode).
 * @param chrome The header and stacked legend the figure lays out around the plot.
 * @param fill Whether the frame is a free-form container fill (`sizing.mode ===
 * 'fill'`) — the case with no ratio, where the container height is recovered from
 * the rendered chrome rather than derived from the width.
 * @returns The stabilised tier height, and `commitTier` — call it in a layout
 * effect with the resolved tier so the next render's recovery reads the chrome
 * this commit actually rendered.
 * @internal
 */
export function useChartTierPlotHeight(
	frameHeight: number,
	frameWidth: number,
	outerAspect: number | null | undefined,
	chrome: ChartChrome,
	fill: boolean,
): { tierHeight: number; commitTier: (tier: ChartTier) => void } {
	const reserve = chartChromeReserve(chrome)

	// The reserve of the chrome rendered last commit: `reserve` while framed, `0`
	// once spark strips it. Seeded framed — the mount settle resolves the real tier
	// before paint. A free-form fill adds this back to the measured remainder to
	// recover the container height; every other mode ignores it.
	const renderedReserveRef = useRef(reserve)

	const tierHeight = fill
		? Math.max(0, frameHeight + renderedReserveRef.current - reserve)
		: policyPlotHeight(frameHeight, frameWidth, outerAspect, chrome)

	const commitTier = useCallback(
		(tier: ChartTier) => {
			renderedReserveRef.current = tier === 'spark' ? 0 : reserve
		},
		[reserve],
	)

	return { tierHeight, commitTier }
}
