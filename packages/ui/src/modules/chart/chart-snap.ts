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
