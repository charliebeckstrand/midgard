/**
 * Metric constants for the map module — an import-free leaf the geometry and
 * projection modules read. Mark specs match the chart module's
 * (`chart-constants.ts`) wherever the two draw the same thing — point radii,
 * ring widths, hit tolerances — so a dashboard mixing charts and maps reads
 * as one family. The motion timings live in `map-motion.ts`.
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

/** Invisible hit-stroke width over a route — a finger-wide band so the thin line stays aimable on touch. @internal */
export const ROUTE_HIT_WIDTH = 24

/** Point-marker radius (≥ 5.5 so the dot stays legible). @internal */
export const POINT_RADIUS = 5.5

/** Invisible hit-circle radius over a point (and a marker pin) — a ~44px finger target. @internal */
export const POINT_HIT_RADIUS = 22

/** A marker pin's radius — larger than a point, it anchors a route's ends. @internal */
export const PIN_RADIUS = 5.5

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
