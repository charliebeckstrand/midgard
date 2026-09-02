/**
 * Snap resolution shared by the crosshair and the tooltip: the per-category
 * band centers and value points a snapping crosshair meets, and the value
 * nearest a pointer among them. Pure and framework-free, so both overlays that
 * ride the snap read it the same way, whichever way the chart faces.
 */

import type { ResolvedCrosshair } from './chart-crosshair'

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

/**
 * The position in `candidates` of the stop nearest `value`, or `null` when the
 * category has none. The first of two equidistant stops wins. The one
 * nearest-by-distance primitive: {@link nearestValue} and the scatter's
 * `nearestCenterIndex` both read through it, so the tooltip anchor and the mark
 * isolation can never disagree.
 *
 * @internal
 */
export function nearestStopIndex(candidates: number[] | undefined, value: number): number | null {
	if (!candidates || candidates.length === 0) return null

	return candidates.reduce<number>(
		(best, candidate, index) =>
			Math.abs(candidate - value) < Math.abs((candidates[best] as number) - value) ? index : best,
		0,
	)
}

/** The plot-y among `candidates` nearest to `value`, or `null` when the category has none. @internal */
export function nearestValue(candidates: number[] | undefined, value: number): number | null {
	const index = nearestStopIndex(candidates, value)

	return index === null ? null : (candidates?.[index] ?? null)
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
