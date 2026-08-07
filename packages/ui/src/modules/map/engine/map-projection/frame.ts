/**
 * The frame-to-viewport conversion the keyboard readout anchors through, and
 * the inverse the zoom gestures arrive by. It is the one place the engine
 * leaves frame units for the page, and it is arithmetic rather than a DOM read,
 * so the placement is testable without a layout engine.
 */

import type { MapPoint2D } from '../types'

/** The plot SVG's box on the page, as `getBoundingClientRect` reports it. @internal */
export type MapClientBox = {
	left: number
	top: number
	width: number
	height: number
}

/**
 * How many client pixels one frame unit spans, or `0` for a box or a view frame
 * with no area.
 *
 * This is the SVG default `preserveAspectRatio="xMidYMid meet"`: the view frame
 * scales to fit inside the box, and centres in the remainder. It is the
 * fit-and-centre `scaleCanonicalFit` (`fit.ts`) applies to a projection's scale
 * and translate, here applied to the box the frame draws into.
 *
 * @internal
 */
export function frameScale(box: MapClientBox, viewWidth: number, viewHeight: number): number {
	if (viewWidth <= 0 || viewHeight <= 0 || box.width <= 0 || box.height <= 0) return 0

	return Math.min(box.width / viewWidth, box.height / viewHeight)
}

/**
 * A frame point in client (viewport) coordinates, or `null` for a box or a view
 * frame with no area. The map's readout anchors where the pointer is, so a
 * cursor with no pointer behind it — the keyboard's — must place its region the
 * same way.
 *
 * It reproduces the SVG letterboxing through {@link frameScale} rather than a
 * `getScreenCTM` read, because the two frame states differ (a measured frame
 * matches its box exactly, a canonical one is letterboxed until the container is
 * measured) and because the math is then testable without a layout engine.
 *
 * @internal
 */
export function frameToClient(
	at: MapPoint2D,
	box: MapClientBox,
	viewWidth: number,
	viewHeight: number,
): MapPoint2D | null {
	const scale = frameScale(box, viewWidth, viewHeight)

	if (scale === 0) return null

	return {
		x: box.left + (box.width - viewWidth * scale) / 2 + at.x * scale,
		y: box.top + (box.height - viewHeight * scale) / 2 + at.y * scale,
	}
}

/**
 * The inverse of {@link frameToClient}: where a client point lands in the frame,
 * or `null` for a box or a view frame with no area. A wheel and a pinch name
 * their focus in viewport coordinates, and the transform holds that focus still
 * in frame ones, so the conversion runs once per gesture at the edge.
 *
 * The frame point it returns is where the zoom layer *draws*, not where the
 * projection placed the geography: the transform is applied above this
 * conversion, so a gesture reads the same coordinate space it moves.
 *
 * @internal
 */
export function clientToFrame(
	at: MapPoint2D,
	box: MapClientBox,
	viewWidth: number,
	viewHeight: number,
): MapPoint2D | null {
	const scale = frameScale(box, viewWidth, viewHeight)

	if (scale === 0) return null

	return {
		x: (at.x - box.left - (box.width - viewWidth * scale) / 2) / scale,
		y: (at.y - box.top - (box.height - viewHeight * scale) / 2) / scale,
	}
}
