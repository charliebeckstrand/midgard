/**
 * Snap resolution shared by the crosshair and the tooltip: the per-category
 * band centers and value points a snapping crosshair meets, and the value
 * nearest a pointer among them. Pure and framework-free, so both overlays that
 * ride the snap read it the same way, whichever way the chart faces.
 */

import type { ResolvedCrosshair } from './chart-schema'

/**
 * The snap targets a chart hands its snapping overlays: where the rules meet
 * and where the tooltip anchors when `crosshair.snap` is on. Positions are
 * one-dimensional along their own axes — the frame projects them onto the
 * screen through the chart's orientation.
 *
 * @internal
 */
export type ChartSnap = {
	/** Each category's band-axis center — the band rule's and the tooltip's snapped band position. */
	bandPositions: number[]
	/** Per category, the visible series' value-axis positions — the value rule's and tooltip's snap targets. */
	valuePoints: number[][]
}

/**
 * The snap bundle for a chart's overlays, or `undefined` when the crosshair
 * doesn't snap — the shared gate every cartesian chart feeds its frame, so the
 * targets flow through only when a snap actually needs them.
 *
 * @internal
 */
export function snapTargets(
	crosshair: ResolvedCrosshair | null,
	bandPositions: number[],
	valuePoints: number[][],
): ChartSnap | undefined {
	if (!crosshair?.snap) return undefined

	return { bandPositions, valuePoints }
}

/** The plot-y among `candidates` nearest to `value`, or `null` when the category has none. @internal */
export function nearestValue(candidates: number[] | undefined, value: number): number | null {
	if (!candidates || candidates.length === 0) return null

	return candidates.reduce((best, y) => (Math.abs(y - value) < Math.abs(best - value) ? y : best))
}

/**
 * The position in `candidates` of the stop nearest `value`, or `null` when the
 * category has none — the index twin of {@link nearestValue}, for the mark
 * isolation that must name the series behind the stop the tooltip anchors.
 *
 * @internal
 */
export function nearestStopIndex(candidates: number[] | undefined, value: number): number | null {
	if (!candidates || candidates.length === 0) return null

	let best = 0

	for (let index = 1; index < candidates.length; index++) {
		if (
			Math.abs((candidates[index] as number) - value) <
			Math.abs((candidates[best] as number) - value)
		) {
			best = index
		}
	}

	return best
}

/**
 * The series behind the snapped stop nearest `coord` in category `index`'s
 * column, or `null` off every stop (an empty column, or no category). The same
 * resolution the tooltip anchors with ({@link nearestValue}), so the emphasised
 * mark and the snapped readout can never disagree: moving along the rule toward
 * another series' point hands both to it at the midpoint between the stops —
 * the tooltip always re-anchoring ahead of the pointer, never under it.
 *
 * @internal
 */
export function snappedSeriesAt(
	valuePoints: number[][],
	snapSeries: number[][],
	index: number | null,
	coord: number,
): number | null {
	if (index === null) return null

	const stop = nearestStopIndex(valuePoints[index], coord)

	return stop === null ? null : (snapSeries[index]?.[stop] ?? null)
}
