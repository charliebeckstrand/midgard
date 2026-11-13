/**
 * The frame-to-viewport conversion the keyboard readout anchors through, and
 * the inverse the zoom gestures arrive by. It is the one place the engine
 * leaves frame units for the page. It is arithmetic rather than a DOM read, so
 * the placement is testable without a layout engine.
 */

import { MAP_FIT_INSET } from '../map-constants'
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
 * scales to fit inside the box, and centers in the remainder. It is the
 * fit-and-center that `measuredMapFit` (`fit.ts`) gives the canonical frame,
 * here applied to the box the frame draws into.
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
 * cursor with no pointer behind it (the keyboard's) must place its region the
 * same way.
 *
 * It reproduces the SVG letterboxing through {@link frameScale} rather than a
 * `getScreenCTM` read. The two frame states differ: a measured frame matches its
 * box exactly, and a canonical one is letterboxed until the container is
 * measured. The math is also testable without a layout engine.
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
 * in frame ones. The conversion therefore runs once per gesture, at the edge.
 *
 * The frame point it returns is where the zoom layer *draws*, not where the
 * projection placed the geography. The transform is applied above this
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

/**
 * The declarations that scale a drawing before the box is measured, so that
 * one frame unit draws as one pixel. The canonical frame scales to meet the
 * plot box less the inset, so a frame `width` units wide draws as wide as the
 * smaller of the width of that box and its height times `aspect`. The scale is
 * `width` over that drawn width.
 *
 * The lengths are in `cq` units of the plot container (`map-plot`), so a
 * drawing in the SVG of the plot can use the declarations. No render before the
 * measurement knows the size of the box.
 *
 * The second declaration divides a length by a length. A browser without that
 * arithmetic drops it as it parses, and keeps the first, which gets the number
 * of pixels of a length through `tan(atan2(length, 1px))`. WebKit 26 can divide,
 * but its trigonometry gives `0` for a length in `cq` units, so it needs the
 * second.
 *
 * @internal
 */
export function pixelScale(width: number, aspect: number): string {
	const inset = MAP_FIT_INSET * 2

	const drawn = `min(100cqw - ${inset}px, (100cqh - ${inset}px) * ${aspect})`

	return `transform:scale(calc(${width} / tan(atan2(${drawn}, 1px))));transform:scale(calc(${width}px / ${drawn}))`
}
