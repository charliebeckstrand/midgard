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

/** Point-marker radius (≥ 4 so the dot stays legible). @internal */
export const POINT_RADIUS = 4

/** Surface-colour ring around point markers, keeping them legible over any fill. @internal */
export const POINT_RING_WIDTH = 2

/** Invisible hit-circle radius over a point marker. @internal */
export const POINT_HIT_RADIUS = 12

/** A marker pin's radius — larger than a point, it anchors a route's ends. @internal */
export const PIN_RADIUS = 5.5

/** A start pin's hollow stroke width. @internal */
export const PIN_STROKE_WIDTH = 2

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

/** Point and pin pop, held until a route has finished drawing. @internal */
export const POINT_POP = { duration: 0.25, delay: ROUTE_DRAW.duration } as const

/** Fallback frame ratio when `'auto'` has no geography to measure. @internal */
export const DEFAULT_MAP_ASPECT = 16 / 9
