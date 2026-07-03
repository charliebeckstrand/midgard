/**
 * Metrics and motion timings for the map module. Mark specs match the chart
 * module's (`chart-constants.ts`) wherever the two draw the same thing —
 * point radii, ring widths, hit tolerances, and the draw/pop timings — so a
 * dashboard mixing charts and maps reads as one family.
 */

/** Region boundary stroke width; the seam takes the surface colour. @internal */
export const REGION_STROKE_WIDTH = 1

/** Route polyline stroke width — a step over the chart line, to hold over busy region fills. @internal */
export const ROUTE_STROKE_WIDTH = 2.5

/** Invisible hit-stroke width over a route, so the thin line is aimable. @internal */
export const ROUTE_HIT_WIDTH = 12

/** Point-marker radius (≥ 5.5 so the dot stays legible). @internal */
export const POINT_RADIUS = 5.5

/** Invisible hit-circle radius over a point marker. @internal */
export const POINT_HIT_RADIUS = 12

/** A marker pin's radius — larger than a point, it anchors a route's ends. @internal */
export const PIN_RADIUS = 5.5

// Motion timings mirror the chart module's (module-private there), so charts
// and maps animating side by side read as one family.

/** Region fade-in on the mount reveal. @internal */
export const REGION_FADE = { duration: 0.4, ease: 'easeOut' } as const

/** Delay step between adjacent regions, so the geography washes in. @internal */
export const REGION_STAGGER = 0.01

/** Ceiling on the region stagger — a many-region atlas must not draw out the reveal. @internal */
export const REGION_STAGGER_MAX = 0.3

/** Route-draw stroke reveal (`pathLength` 0 → 1), matching the chart's line draw. @internal */
export const ROUTE_DRAW = { duration: 0.7, ease: 'easeInOut' } as const

/** A point's scale-and-fade pop-in. @internal */
export const POINT_POP = { duration: 0.25, ease: 'easeOut' } as const

/** Delay step between points on the mount reveal, so a cluster staggers in. @internal */
export const POINT_STAGGER = 0.08

/** Ceiling on the point stagger — a large cluster must not draw out the reveal. @internal */
export const POINT_STAGGER_MAX = 0.6

/** A marker pin's pop-in. @internal */
export const PIN_POP = { duration: 0.25, ease: 'easeOut' } as const

/** A marker's connector draw, held until the start pin has popped. @internal */
export const MARKER_DRAW = { ...ROUTE_DRAW, delay: PIN_POP.duration } as const

/**
 * A marker's end pin, held until the start pin has popped and the connector
 * has drawn: start pin → line → end pin, so the journey plays in travel
 * order. @internal
 */
export const MARKER_END_POP = {
	...PIN_POP,
	delay: PIN_POP.duration + ROUTE_DRAW.duration,
} as const

/** Fallback frame ratio when `'auto'` has no geography to measure. @internal */
export const DEFAULT_MAP_ASPECT = 16 / 9
