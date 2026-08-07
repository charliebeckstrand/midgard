/**
 * The frame-to-viewport conversion the keyboard readout anchors through. It is
 * the one place the engine leaves frame units for the page, and it is
 * arithmetic rather than a DOM read, so the placement is testable without a
 * layout engine.
 */

import type { MapPoint2D } from '../types'

/**
 * A frame point in client (viewport) coordinates, or `null` for a box or a view
 * frame with no area. The map's readout anchors where the pointer is, so a
 * cursor with no pointer behind it — the keyboard's — must place its region the
 * same way.
 *
 * This reproduces the SVG default `preserveAspectRatio="xMidYMid meet"`: the
 * view frame scales to fit inside the box and centres in the remainder — the
 * fit-and-centre `scaleCanonicalFit` (`fit.ts`) applies to a projection's scale and
 * translate, here applied to one point. It is arithmetic rather than a
 * `getScreenCTM` read because the two frame states differ (a measured frame
 * matches its box exactly, a canonical one is letterboxed until the container is
 * measured) and because the math is then testable without a layout engine.
 *
 * @internal
 */
export function frameToClient(
	at: MapPoint2D,
	box: { left: number; top: number; width: number; height: number },
	viewWidth: number,
	viewHeight: number,
): MapPoint2D | null {
	if (viewWidth <= 0 || viewHeight <= 0 || box.width <= 0 || box.height <= 0) return null

	const scale = Math.min(box.width / viewWidth, box.height / viewHeight)

	return {
		x: box.left + (box.width - viewWidth * scale) / 2 + at.x * scale,
		y: box.top + (box.height - viewHeight * scale) / 2 + at.y * scale,
	}
}
