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
 * The selected region's outline width — a step over the boundary seam, so the
 * ring reads as a mark on the region rather than a heavier shared border.
 * @internal
 */
export const REGION_SELECTED_STROKE_WIDTH = 2.5

/**
 * Decimal places kept in a region path's `d` string. Region geometry draws in
 * frame units (canonical 1000-wide or measured px), where one decimal is
 * sub-pixel — d3-geo's default of three serialises detail no display resolves.
 * Trimming to one shrinks the strings (~27% on a US states atlas), so they cost
 * less to build on the mount critical path and less for the browser to parse.
 * @internal
 */
export const REGION_PATH_DIGITS = 1

/**
 * The clear space, in device pixels, a selected overlay's halo shows around the
 * mark it marks. Measured edge to edge like {@link POINT_CLUSTER_GAP}, so one
 * number holds across every mark the halo sits behind: a dot's halo takes the
 * dot's own radius plus this, a line's takes its stroke plus twice it.
 * @internal
 */
export const MARK_SELECTED_HALO = 3

/** Route polyline stroke width — a step over the chart line, to hold over busy region fills. @internal */
export const ROUTE_STROKE_WIDTH = 2.5

/** Invisible hit-stroke width over a route — a finger-wide band so the thin line stays aimable on touch. @internal */
export const ROUTE_HIT_WIDTH = 24

/** Point-marker radius (≥ 5.5 so the dot stays legible). @internal */
export const POINT_RADIUS = 5.5

/** Invisible hit-circle radius over a point (and a marker pin) — a ~44px finger target. @internal */
export const POINT_HIT_RADIUS = 22

/**
 * The clear space, in frame units, two point marks keep between their edges
 * before they draw as one. Measured edge to edge rather than centre to centre,
 * so one number holds however wide the marks grow: two dots merge under
 * `POINT_RADIUS * 2 + this`, two summaries under their own radii plus it.
 *
 * Frame units are device pixels wherever the frame is measured, so this is a
 * pixel distance: one round summarises as the map shrinks and separates as it
 * grows, which is what makes the grouping a reading of how far out the map sits
 * rather than of the data.
 *
 * The measurement-free canonical frame is the one stage where the two units
 * part: it is a fixed {@link MAP_CANONICAL_WIDTH}-wide viewBox, so the reach
 * reads as a fraction of the frame's width there and the grouping loosens in a
 * box narrower than that. The measurement lands in a layout effect, before the
 * first paint, so no reader sees it — but a viewBox transform (the roadmap's
 * zoom) would part them for good. The whole reach is then one multiply by a
 * units-per-pixel scale off the plat, which is why the marks' own radii sit
 * inside that reach rather than beside it. @internal
 */
export const POINT_CLUSTER_GAP = 3

/**
 * A summary dot's radius by how many stops it holds — the size grade. A lone dot
 * keeps {@link POINT_RADIUS}; each step is one grade up, so the mark carries the
 * magnitude and the count inside it carries the number. Read ascending: the last
 * step the count reaches wins. @internal
 */
export const CLUSTER_RADIUS_STEPS = [
	{ from: 2, radius: 9 },
	{ from: 5, radius: 11 },
	{ from: 10, radius: 13 },
	{ from: 25, radius: 15 },
] as const

/** Mean Earth radius in metres — turns a summary's spherical spread into a distance. @internal */
export const EARTH_RADIUS_METERS = 6371008.8

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
 * The graticule's degree step when it is turned on without one — d3-geo's own
 * default, and the step a world map is read at: meridians and parallels every
 * ten degrees. @internal
 */
export const GRATICULE_STEP_DEGREES = 10

/**
 * The finest graticule step a caller can ask for. The lines cover the whole
 * globe whatever the geography frames, so the point count grows as the square
 * of the step going down: a tenth-degree step draws millions of points the
 * frame then clips away. @internal
 */
export const GRATICULE_MIN_STEP_DEGREES = 1

/**
 * Graticule and sphere stroke width — the chart gridline's hairline, so a
 * dashboard's charts and maps rule their frames alike. @internal
 */
export const CHROME_STROKE_WIDTH = 1

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
