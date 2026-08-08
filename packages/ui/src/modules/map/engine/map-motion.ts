/**
 * Motion timings for the map module's mount reveals, composed from the ugoki
 * `mark` family and tempo primitives (via `kata/map`) — the same source the
 * chart module composes its reveals from — so charts and maps animating side
 * by side read as one family. Kept apart from `map-constants.ts` so the metric
 * constants stay an import-free leaf for the geometry and projection modules.
 */

import { k } from '../../../recipes/kata/map'

const { duration, ease, mark } = k.motion

/** Region fade-in on the mount reveal. @internal */
export const REGION_FADE = { duration: duration[400], ease: ease.out } as const

/** Delay step between adjacent regions, so the geography washes in. @internal */
export const REGION_STAGGER = 0.01

/** Ceiling on the region stagger — a many-region atlas must not draw out the reveal. @internal */
export const REGION_STAGGER_MAX = 0.3

/**
 * How long the mount reveal takes end to end: the last region's delay, plus the
 * fade it then runs. The stagger retires here — it belongs to the reveal, and a
 * legend toggle after it must repaint at once rather than wait out a delay meant
 * to wash the geography on. @internal
 */
export const REGION_WASH_SETTLE = REGION_STAGGER_MAX + REGION_FADE.duration

/**
 * Stroke reveal (`pathLength` 0 → 1), matching the chart's line draw: a route's
 * line, and a geofence boundary, which lands the way a line does. @internal
 */
export const ROUTE_DRAW = mark.draw

/** A point's scale-and-fade pop-in — the chart's pop tempo, staggered instead of held. @internal */
export const POINT_POP = { ...mark.pop, ease: ease.out } as const

/** Delay step between points on the mount reveal, so a cluster staggers in. @internal */
export const POINT_STAGGER = 0.08

/** Ceiling on the point stagger — a large cluster must not draw out the reveal. @internal */
export const POINT_STAGGER_MAX = 0.6

/**
 * A dot's pop, delayed by its ordinal so a set of them reveals in sequence, and
 * capped so a long set does not trail. Built per call rather than held in a
 * table: the cap admits only a handful of distinct delays, but `POINT_POP` is
 * frozen and the spread is one small object on the mount path alone.
 *
 * @internal
 */
export function pointPop(ordinal: number) {
	return { ...POINT_POP, delay: Math.min(ordinal * POINT_STAGGER, POINT_STAGGER_MAX) } as const
}

/**
 * A geofence's wash, held until its boundary has drawn: the outline traces the
 * zone, then the fill settles inside it, so the shape reads before the colour
 * does. The region fade's tempo, because the wash is the same kind of
 * fill-in. @internal
 */
export const GEOFENCE_WASH = { ...REGION_FADE, delay: ROUTE_DRAW.duration } as const

/** A marker's connector draw, held until the start pin (a `POINT_POP`) has popped. @internal */
export const MARKER_DRAW = { ...ROUTE_DRAW, delay: POINT_POP.duration } as const

/**
 * A marker's end pin, held until the start pin has popped and the connector
 * has drawn: start pin → line → end pin, so the journey plays in travel
 * order. @internal
 */
export const MARKER_END_POP = {
	...POINT_POP,
	delay: POINT_POP.duration + ROUTE_DRAW.duration,
} as const
