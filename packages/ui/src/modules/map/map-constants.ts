/**
 * Metrics and motion timings for the map module. Mark specs match the chart
 * module's (`chart-constants.ts`) wherever the two draw the same thing —
 * point radii, ring widths, hit tolerances, and the draw/pop timings — so a
 * dashboard mixing charts and maps reads as one family.
 */

/** Region boundary stroke width; the seam takes the surface colour. @internal */
export const REGION_STROKE_WIDTH = 1

/**
 * Decimal places kept in a region path's `d` string. Region geometry draws in
 * frame units (canonical 1000-wide or measured px), where one decimal is
 * sub-pixel — d3-geo's default of three serialises detail no display resolves.
 * Trimming to one shrinks the strings (~27% on a US states atlas), so they cost
 * less to build on the mount critical path and less for the browser to parse.
 * @internal
 */
export const REGION_PATH_DIGITS = 1

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

/**
 * The aspect ratio the whole United States spans under `albers-usa` — the
 * lower-48 with the Alaska and Hawaii insets, fit to width (measured from the
 * us-atlas geography, and shared by any full-US atlas: states, counties,
 * nation). albers-usa is definitionally the US, so a plat drawing it reserves
 * this ratio before its geography loads; the loaded map fits the same shape, so
 * a lazily fetched atlas swaps in without shifting the frame's height. @internal
 */
export const ALBERS_USA_ASPECT = 1.709

/**
 * The width, in frame units, the projection fits to for the canonical
 * (measurement-free) draw. Fitting once to a fixed frame yields both the
 * geography's aspect ratio and a projection the neutral geography paints from
 * on the first commit — before the container is measured — so the map appears
 * without waiting a mount → measure → refit round trip. The measured refit
 * later replaces it for constant-pixel marks; the two share this frame's aspect,
 * so the swap only sharpens strokes, never reshapes the geography. @internal
 */
export const MAP_CANONICAL_WIDTH = 1000
