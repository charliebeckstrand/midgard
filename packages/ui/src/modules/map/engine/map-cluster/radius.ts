/**
 * The size a summary draws at. Held on its own because two layers read it and
 * neither owns it. The merge rule measures marks by it, and `MapPoints` draws
 * them by it. A change to the size therefore reaches the picture and the
 * grouping together.
 */

import {
	CLUSTER_COUNT_CHAR_WIDTH,
	CLUSTER_COUNT_INSET,
	CLUSTER_RADIUS_STEPS,
	POINT_RADIUS,
} from '../map-constants'

/**
 * The radius, in device pixels, a group of `count` dots draws at. The merge
 * rule and the drawn mark read the same function, so the two cannot disagree on
 * how wide a summary is. @internal
 */
export type MapClusterRadius = (count: number) => number

/**
 * The radius a group draws at: {@link POINT_RADIUS} for a lone dot, then one
 * step up per grade of {@link CLUSTER_RADIUS_STEPS}. The size carries the
 * magnitude, so a reader grades a summary against its neighbors before reading
 * the count inside it.
 *
 * A summary also holds its count label, which `format` writes as the dot draws
 * it. Where the label with {@link CLUSTER_COUNT_INSET} on each end is wider than
 * the grade, the dot takes that width instead. The top grade holds a label of
 * three digits, and `1,200` in English or `12.000` in Spanish is wider than it.
 * The label width depends on the locale, so the radius does too.
 *
 * The radius never falls as the count rises: the grades ascend, and a formatted
 * count never gets shorter as it gets larger. The merge pass bounds its search
 * by the radius of the whole set on that property.
 *
 * @param count - How many dots the group holds.
 * @param format - Writes the count label, as `MapDotCount` draws it.
 * @internal
 */
export function clusterRadius(count: number, format: (count: number) => string): number {
	const grade = CLUSTER_RADIUS_STEPS.findLast((step) => count >= step.from)?.radius

	// A lone dot draws no label, so only the summaries read one.
	if (grade === undefined) return POINT_RADIUS

	const label = (format(count).length * CLUSTER_COUNT_CHAR_WIDTH) / 2 + CLUSTER_COUNT_INSET

	return Math.max(grade, label)
}
