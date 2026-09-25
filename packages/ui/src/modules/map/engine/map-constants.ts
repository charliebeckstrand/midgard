/**
 * Metric constants for the map module — an import-free leaf the geometry and
 * projection modules read. Mark specs match the chart module's
 * (`chart-constants.ts`) wherever the two draw the same thing: point radii, ring
 * widths, hit tolerances. A dashboard mixing charts and maps therefore reads as
 * one family. The motion timings live in `map-motion.ts`.
 */

/** Region boundary stroke width; the seam takes the surface color. @internal */
export const REGION_STROKE_WIDTH = 1

/**
 * The selected region's outline width, a step over the boundary seam. The ring
 * therefore reads as a mark on the region, rather than a heavier shared border.
 * @internal
 */
export const REGION_SELECTED_STROKE_WIDTH = 2.5

/**
 * Decimal places kept in a region path's `d` string. Region geometry draws in
 * frame units (canonical 1000-wide or measured px), where one decimal is
 * sub-pixel — d3-geo's default of three serializes detail no display resolves.
 * Trimming to one shrinks the strings (~27% on a US states atlas). They
 * therefore cost less to build on the mount critical path, and less for the
 * browser to parse.
 * @internal
 */
export const REGION_PATH_DIGITS = 1

/**
 * The clear space, in device pixels, a selected overlay's halo shows around the
 * mark it marks. Measured edge to edge like {@link POINT_CLUSTER_GAP}, so one
 * number holds across every mark the halo sits behind. A dot's halo takes the
 * dot's own radius plus this, and a line's takes its stroke plus twice it.
 * @internal
 */
export const MARK_SELECTED_HALO = 3

/** Route polyline stroke width — a step over the chart line, to hold over busy region fills. @internal */
export const ROUTE_STROKE_WIDTH = 2.5

/**
 * Invisible hit-stroke width over a thin line — a route, a marker's connector, a
 * geofence boundary. WCAG 2.5.8's 24px minimum, and the same band whatever is
 * pointing. A line declines the 44px a dot takes on a coarse pointer
 * ({@link POINT_HIT_RADIUS}), because a dot is an isolated island. A band that
 * wide would swallow a parallel leg, the marks along a zone's edge, and the
 * other end of a hairpin. @internal
 */
export const ROUTE_HIT_WIDTH = 24

/**
 * Geofence boundary stroke width, a step over the region seam and under the
 * route line. A zone therefore reads as the context behind the marks it holds,
 * rather than as another route drawn around them. @internal
 */
export const GEOFENCE_STROKE_WIDTH = 1.5

/**
 * The geofence wash's opacity, sitting the fill inside its boundary without
 * muddying the geography under it. It is the chart module's area wash
 * (`AREA_FILL_OPACITY`), because the two draw the same thing. @internal
 */
export const GEOFENCE_FILL_OPACITY = 0.16

/**
 * How many segments a circular geofence's ring holds. The marks project point by
 * point and draw each edge straight, so the count is what makes a circle read
 * round. At 64 the widest gap between the ring and the true circle is under
 * 0.13% of the radius. No frame this module draws can resolve that. @internal
 */
export const GEOFENCE_CIRCLE_STEPS = 64

/** Point-marker radius (≥ 5.5 so the dot stays legible). @internal */
export const POINT_RADIUS = 5.5

/**
 * Invisible hit-circle radius over a point (and a marker pin), for a coarse
 * pointer: a 44px finger target, WCAG 2.5.5's enhanced floor. It is the same
 * figure the `TouchTarget` primitive holds for a coarse pointer.
 * @internal
 */
export const POINT_HIT_RADIUS = 22

/**
 * How much of a drawn shape's own inscribed reach a dot standing on it can take.
 * Half, so the shape keeps at least as much room as it gives. A dot at the
 * center of a circular catchment takes half the radius and leaves the rest. The
 * band the boundary answers on ({@link ROUTE_HIT_WIDTH}) stays clear at any zone
 * wide enough to have one.
 *
 * It is a fraction rather than a subtraction, so the rule holds at every size. A
 * shape twice as wide gives twice as much, and one with no room gives nothing.
 * There is no threshold anywhere for a reader to land on the wrong side of. That
 * is what makes it the answer for both shapes that claim this ground. A zone is
 * drawn to a size the consumer chose, and regions on one atlas run three orders
 * of magnitude apart in area. No fixed reach can suit a state and a county
 * alike.
 *
 * The floor beneath it is the dot's own paint, and the cap is the finger target.
 * `markTargets` applies both. A shape too small to spare anything therefore
 * hands the dot its drawn radius, rather than one under the pixels it draws.
 * That is the correct reading and not a degenerate case. Where the mark is wider
 * than the ground under it, the pixels have nowhere to go.
 *
 * @internal
 */
export const AREA_SPARE_FRACTION = 0.5

/**
 * The floor under a fine pointer's target: the drawn dot and nothing less —
 * {@link POINT_RADIUS} exactly, an 11px target. A mouse aims at one pixel, so it
 * needs no part of the reach a finger takes. That reach is what makes a dot
 * swallow the marks around it. A `MapGeofence` drawn small around a `MapPoint`
 * sits entirely inside the coarse circle. A depot at a catchment's center
 * claimed the middle of its own zone at 24px as well. Nothing takes a target
 * under this. A target inside its own dot would leave the mark a reader can see
 * a dead rim. The zone therefore gives way where the two cannot both fit.
 *
 * Under WCAG 2.5.8's 24px minimum on purpose. A mark carries three other ways to
 * its datum: its legend row, the keyboard cursor's stop, and its `MapTable` row.
 * The dot is therefore never the only route to it. What the dot gives its pixels
 * back to has no such second route. A zone under it answers the pointer or
 * nothing does. A neighboring dot swallowed by the reach reports another
 * mark's readout in place of its own. A dot clear of every claimant keeps the
 * full {@link POINT_HIT_RADIUS} instead, since precision a reader gains nothing
 * from is only reach taken from them. `markTargets` weighs the claims, and
 * `dotHitProps` states what it does with the answer. `map-cluster/crowd.ts`
 * holds the list of claimants; do not restate it here.
 *
 * Applied through `kata/map`'s `hitFine` class rather than the `r` attribute,
 * since only CSS can answer the modality. The attribute carries the coarse
 * radius, so a browser that resolves no `r` in CSS keeps the larger target. This
 * is the class's fallback alone: `dotHitProps` sets each shape's own budget, which
 * a dot standing clear of every claimant never drops to.
 *
 * A literal rather than {@link POINT_RADIUS} itself, though it is that figure by
 * definition. Nothing reads this at runtime, because the number ships inside
 * `hitFine`'s class string, which Tailwind can only scan whole. The constant is
 * therefore that literal's documented name. Binding it to another export makes
 * the two one export under two names, which knip rejects. `map-hit-target` holds the
 * pair equal instead, which is what a tie between two literals costs.
 * @internal
 */
export const POINT_HIT_RADIUS_FINE = 5.5

/**
 * The clear space, in frame units, two point marks keep between their edges
 * before they draw as one. Measured edge to edge rather than center to center,
 * so one number holds however wide the marks grow. Two dots merge under
 * `POINT_RADIUS * 2 + this`, and two summaries under their own radii plus it.
 *
 * Frame units are device pixels wherever the frame is measured, so this is a
 * pixel distance. One round summarizes as the map shrinks, and separates as it
 * grows. That is what makes the grouping a reading of how far out the map sits,
 * rather than of the data.
 *
 * Two stages part the two units. The measurement-free canonical frame is a
 * fixed {@link MAP_CANONICAL_WIDTH}-wide viewBox. The reach therefore reads as a
 * fraction of the frame's width there, and the grouping loosens in a box
 * narrower than that. The measurement lands in a layout effect, before the
 * first paint, so no reader sees it. The zoom layer's transform parts them for
 * as long as it holds, and the grouping answers it. The whole reach takes one
 * multiply by the units-per-pixel scale the plat publishes
 * (`MapZoomScaleContext`). That is why the marks' own radii sit inside that
 * reach rather than beside it. @internal
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

/** Mean Earth radius in meters — turns a summary's spherical spread into a distance. @internal */
export const EARTH_RADIUS_METERS = 6371008.8

/**
 * The scale a fitted map sits at, and the floor every zoom clamps to. The fit
 * already frames the geography to the frame, so zooming out past it would only
 * letterbox what the projection placed. The fitted view is the widest the map
 * ever draws, and the transform's own identity. @internal
 */
export const MAP_ZOOM_FIT = 1

/**
 * How far a map zooms in before it stops, unless `zoom` names another ceiling.
 * Eight takes a national frame down to one metro area, which is the depth a
 * stop-level map reads at. @internal
 */
export const MAP_ZOOM_MAX = 8

/**
 * Scale change per pixel of wheel travel, taken through `Math.exp` so the zoom
 * is geometric. One notch out undoes one notch in, wherever the scale stands.
 * @internal
 */
export const MAP_WHEEL_ZOOM_RATE = 0.002

/** The factor one zoom keypress steps the scale by. @internal */
export const MAP_ZOOM_STEP = 1.6

/**
 * How far a press must travel, in device pixels, before it reads as a pan. Under
 * it the press still picks the mark it landed on. Past it the map pans, and the
 * click that follows is swallowed. A drag across a clickable map therefore never
 * reports a pick the reader never made. @internal
 */
export const MAP_PAN_THRESHOLD = 4

/**
 * How long, in milliseconds, a wheel gesture is held live after its last event.
 * A wheel reports no end, so the map reads one from a gap. Below this the marks
 * stay inert and the notches read as one gesture. Past it the pointer gets the
 * drawing back. Long enough to bridge the gaps in a trackpad's momentum,
 * short enough that a reader who stops never waits to point at anything.
 * @internal
 */
export const MAP_WHEEL_SETTLE_MS = 120

/**
 * How long, in milliseconds, the pointer must hold a region before it reads as
 * intent to open it and `onRegionPreload` fires. Regions sit edge to edge, so a
 * pointer crossing to the far side of the map passes over every region between.
 * Without the hold, reaching one county would warm a dozen. Long enough that a
 * pass through a region warms nothing, short enough that the warming still beats
 * the click that follows the reader's decision. @internal
 */
export const MAP_PRELOAD_DWELL_MS = 120

/**
 * The clear space, in frame units, the keyboard cursor keeps between its stop
 * and the frame edge. It applies when the cursor pans a zoomed view to show a
 * stop. A stop pinned to the edge would anchor its readout half off the plot.
 * @internal
 */
export const MAP_CURSOR_INSET = 32

/**
 * A marker pin's radius. The pin anchors a route's ends and draws at the point
 * radius, not above it. A pin reads as an end because of where it sits and what
 * it joins. A heavier dot on an extremum would only reach further past the
 * frame the fit maps onto. Held as its own constant rather than aliased, so a
 * marker's size stays a decision the marker can revisit. @internal
 */
export const PIN_RADIUS = 5.5

/** Fallback frame ratio when `'auto'` has no geography to measure. @internal */
export const DEFAULT_MAP_ASPECT = 16 / 9

/**
 * The aspect ratio the whole United States spans under `albers-usa`: the
 * lower-48 with the Alaska and Hawaii insets, fit to width. It is measured from
 * the us-atlas geography, and shared by any full-US atlas — states, counties,
 * nation. The `albers-usa` projection is definitionally the US, so a plat
 * drawing it reserves this ratio before its geography loads. The loaded map fits
 * the same shape, so a lazily fetched atlas swaps in without shifting the
 * frame's height. @internal
 */
export const ALBERS_USA_ASPECT = 1.709

/**
 * The graticule's degree step when it is turned on without one. It is d3-geo's
 * own default, and the step a world map is read at: meridians and parallels
 * every ten degrees. @internal
 */
export const GRATICULE_STEP_DEGREES = 10

/**
 * The finest graticule step a caller can ask for. The lines cover the whole
 * globe whatever the geography frames, so the point count grows as the square
 * of the step going down. A tenth-degree step draws millions of points the
 * frame then clips away. @internal
 */
export const GRATICULE_MIN_STEP_DEGREES = 1

/**
 * Graticule and sphere stroke width: a hairline. It is the width the chart rules
 * its own gridlines and axis baseline at, so a dashboard's charts and maps frame
 * alike. @internal
 */
export const CHROME_STROKE_WIDTH = 1

/**
 * The width, in frame units, the projection fits to for the canonical
 * (measurement-free) draw. Fitting once to a fixed frame yields two things. One
 * is the geography's aspect ratio. The other is a projection the neutral
 * geography paints from on the first commit, before the container is measured.
 * The map therefore appears without waiting a mount → measure → refit round
 * trip. The measured refit later
 * replaces it for constant-pixel marks. The two share this frame's aspect, so
 * the swap only sharpens strokes, never reshapes the geography. @internal
 */
export const MAP_CANONICAL_WIDTH = 1000
