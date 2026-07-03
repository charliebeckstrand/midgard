/**
 * Snap resolution shared by the crosshair and the tooltip: the per-category
 * band centers and value points a snapping crosshair meets, and the value
 * nearest a pointer among them. Pure and framework-free, so both overlays that
 * ride the snap read it the same way.
 */

import type { ChartAnchor } from './chart-layout'
import type { ResolvedCrosshair } from './chart-schema'

/**
 * The snap targets a chart hands its snapping overlays: where the rules meet
 * and where the tooltip anchors when `crosshair.snap` is on.
 *
 * @internal
 */
export type ChartSnap = {
	/** Band-center x per category — the vertical rule's and the tooltip's snapped x. */
	bandXs: number[]
	/** Per category, the visible series' plot y — the horizontal rule's and the tooltip's snap targets. */
	snapPoints: number[][]
}

/**
 * The snap bundle for a chart's overlays, or `undefined` when the crosshair
 * doesn't snap — the shared gate every cartesian chart feeds its frame, so the
 * band-center map runs only when a snap actually needs it.
 *
 * @internal
 */
export function snapTargets(
	crosshair: ResolvedCrosshair | null,
	anchors: ChartAnchor[],
	snapPoints: number[][],
): ChartSnap | undefined {
	if (!crosshair?.snap) return undefined

	return { bandXs: anchors.map((anchor) => anchor.x), snapPoints }
}

/** The plot-y among `candidates` nearest to `value`, or `null` when the category has none. @internal */
export function nearestValue(candidates: number[] | undefined, value: number): number | null {
	if (!candidates || candidates.length === 0) return null

	return candidates.reduce((best, y) => (Math.abs(y - value) < Math.abs(best - value) ? y : best))
}
