/**
 * The view transform the zoom layer draws through, and the arithmetic every
 * gesture moves it by. It is a scale about the frame origin and a translation,
 * both in frame units, so the projection under it never refits: the fit places
 * the geography once and the transform moves what it placed. Every operation
 * returns a constrained transform, so no caller holds a view the map cannot
 * draw.
 */

import { clamp } from '../../../../utilities'
import { MAP_ZOOM_FIT } from '../map-constants'
import type { MapPoint2D } from '../types'

/**
 * The map's view transform: a scale `k` about the frame origin, then a
 * translation. Written in the order SVG applies them — `translate(x, y)
 * scale(k)` — so the attribute and the arithmetic read as one thing.
 *
 * @internal
 */
export type MapTransform = {
	x: number
	y: number
	/** The scale; {@link MAP_ZOOM_FIT} is the fitted geography, where every map starts. */
	k: number
}

/** The frame the map's own size and the pan limits are measured against. @internal */
export type MapViewFrame = {
	width: number
	height: number
}

/** The fitted view: no scale, no offset. @internal */
export const MAP_FIT_TRANSFORM: MapTransform = { x: 0, y: 0, k: MAP_ZOOM_FIT }

/** The transform as the `<g>`'s own attribute. @internal */
export function transformAttribute(transform: MapTransform): string {
	return `translate(${round(transform.x)} ${round(transform.y)}) scale(${round(transform.k)})`
}

/** Where the transform draws a frame point. @internal */
export function applyTransform(at: MapPoint2D, transform: MapTransform): MapPoint2D {
	return { x: at.x * transform.k + transform.x, y: at.y * transform.k + transform.y }
}

/** Whether two transforms sit at the same place, so a redundant commit can bail. @internal */
export function sameTransform(a: MapTransform, b: MapTransform): boolean {
	return a === b || (a.x === b.x && a.y === b.y && a.k === b.k)
}

/**
 * The transform held inside the limits the map draws within.
 *
 * The scale floor is the fit itself, so the geography never draws smaller than
 * the projection framed it, and the translate is clamped so the frame stays
 * inside the scaled frame — the constraint is expressed against the fitted
 * frame rather than an arbitrary box, so it is the projection's own framing
 * that bounds the pan. At the fit the interval collapses to a point, which is
 * how a zoomed-out map returns to centre without a separate rule.
 *
 * @remarks A fixed `aspectRatio` letterboxes the fit on one axis, and a pan can
 * reach that band at the frame's edge. It is the band the map already shows at
 * rest, so the pan never uncovers ground the fitted view kept hidden; ending it
 * would need the geography's own projected bounds, and a passed `d3` instance
 * has no cached canonical fit to derive those from without a bounds pass on the
 * mount path.
 *
 * @internal
 */
export function constrainTransform(
	transform: MapTransform,
	view: MapViewFrame,
	max: number,
): MapTransform {
	const k = clamp(transform.k, MAP_ZOOM_FIT, Math.max(MAP_ZOOM_FIT, max))

	return {
		k,
		x: clamp(transform.x, view.width * (1 - k), 0),
		y: clamp(transform.y, view.height * (1 - k), 0),
	}
}

/**
 * Scales the view by `factor` about a frame point, which holds still under the
 * gesture: the ground beneath the pointer stays beneath the pointer, and the
 * pinch's midpoint stays between the fingers. The focus is where the transform
 * draws — the same space the pointer arrives in — so a caller converts the
 * event once and never inverts the transform.
 *
 * @internal
 */
export function zoomTransform(
	transform: MapTransform,
	focus: MapPoint2D,
	factor: number,
	view: MapViewFrame,
	max: number,
): MapTransform {
	const k = clamp(transform.k * factor, MAP_ZOOM_FIT, Math.max(MAP_ZOOM_FIT, max))

	// The clamp above can shorten the step, so the ratio is measured against
	// where the scale landed rather than against what was asked for; taking the
	// factor itself would slide the focus at either limit.
	const taken = k / transform.k

	return constrainTransform(
		{
			k,
			x: focus.x - (focus.x - transform.x) * taken,
			y: focus.y - (focus.y - transform.y) * taken,
		},
		view,
		max,
	)
}

/** Moves the view by a frame-unit offset. @internal */
export function panTransform(
	transform: MapTransform,
	dx: number,
	dy: number,
	view: MapViewFrame,
	max: number,
): MapTransform {
	return constrainTransform({ ...transform, x: transform.x + dx, y: transform.y + dy }, view, max)
}

/**
 * Pans the view so a frame point draws inside it, `inset` clear of every edge,
 * and holds still where it already does. The keyboard cursor's follow: an arrow
 * step onto a region the zoom put off-frame brings the view to it, so the
 * readout always anchors on the plot.
 *
 * @internal
 */
export function showTransform(
	transform: MapTransform,
	at: MapPoint2D,
	view: MapViewFrame,
	max: number,
	inset: number,
): MapTransform {
	const drawn = applyTransform(at, transform)

	// A frame narrower than two insets has no interior to aim at, so the margin
	// gives way to the frame rather than the two ends fighting over the point.
	const margin = Math.min(inset, view.width / 2, view.height / 2)

	return panTransform(
		transform,
		shift(drawn.x, view.width, margin),
		shift(drawn.y, view.height, margin),
		view,
		max,
	)
}

/** How far one axis must move to bring `at` inside its span, `margin` clear of both ends. */
function shift(at: number, span: number, margin: number): number {
	if (at < margin) return margin - at

	return at > span - margin ? span - margin - at : 0
}

/** Three decimals, so the attribute stays short at every scale the map reaches. */
function round(value: number): number {
	return Math.round(value * 1000) / 1000
}
