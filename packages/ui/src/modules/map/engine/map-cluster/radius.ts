/**
 * The size grade a summary draws at. Held on its own because two layers read
 * it and neither owns it: the merge rule measures marks by it, and `MapPoints`
 * draws them by it, so a change to the grade reaches the picture and the
 * grouping together.
 */

import { CLUSTER_RADIUS_STEPS, POINT_RADIUS } from '../map-constants'

/** The widest a summary ever draws, so no pair beyond twice it plus the gap can meet. @internal */
export const MAX_CLUSTER_RADIUS: number = CLUSTER_RADIUS_STEPS.at(-1)?.radius ?? POINT_RADIUS

/**
 * The radius a group draws at: {@link POINT_RADIUS} for a lone dot, then one
 * step up per grade of {@link CLUSTER_RADIUS_STEPS}. The size carries the
 * magnitude, so a reader grades a summary against its neighbours before reading
 * the count inside it.
 *
 * @internal
 */
export function clusterRadius(count: number): number {
	return CLUSTER_RADIUS_STEPS.findLast((step) => count >= step.from)?.radius ?? POINT_RADIUS
}
