/**
 * How an input reads as a zoom: what one notch of wheel travel is worth, how
 * two touches measure a pinch, and which keys step the scale. Held apart from
 * `transform.ts` so the arithmetic that moves the view stays free of the
 * gestures that drive it, and so each half is testable without the other.
 */

import { MAP_WHEEL_ZOOM_RATE, MAP_ZOOM_STEP } from '../map-constants'
import type { MapPoint2D } from '../types'

/**
 * Pixels one unit of `deltaY` stands for, by the `deltaMode` the wheel event
 * reports it in: pixel, line, then page. A page is read as a frame's worth of
 * travel rather than the box's own height, so one constant serves every frame
 * size — the mode is rare, and a mouse that reports it zooms in whole steps
 * either way.
 */
const WHEEL_DELTA_PIXELS = [1, 16, 400]

/**
 * The scale factor one wheel event asks for. Exponential in the travel, so the
 * gesture is geometric — a notch back always undoes a notch forward, at every
 * scale — and negative travel (wheel up, the conventional zoom in) grows it.
 *
 * @internal
 */
export function wheelZoomFactor(deltaY: number, deltaMode: number): number {
	return Math.exp(-deltaY * (WHEEL_DELTA_PIXELS[deltaMode] ?? 1) * MAP_WHEEL_ZOOM_RATE)
}

/**
 * The travel a wheel event carries toward the zoom.
 *
 * A browser moves a shift-held wheel onto the horizontal axis — the same
 * gesture the reader made, reported on `deltaX` with `deltaY` left at zero — so
 * a map whose modifier is that key has to read it there. `swapped` says the key
 * is held; without it the fallback never runs, because a horizontal delta with
 * no key behind it is a sideways scroll and belongs to the page.
 *
 * @internal
 */
export function wheelTravel(deltaY: number, deltaX: number, swapped: boolean): number {
	return swapped && deltaY === 0 ? deltaX : deltaY
}

/** The distance between two pointers — a pinch's own measure. @internal */
export function pointerGap(a: MapPoint2D, b: MapPoint2D): number {
	return Math.hypot(a.x - b.x, a.y - b.y)
}

/** The point midway between two pointers, which a pinch holds still. @internal */
export function pointerMidpoint(a: MapPoint2D, b: MapPoint2D): MapPoint2D {
	return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** What a key does to the scale, on the plot region's own tab stop. @internal */
export type MapZoomKey = 'in' | 'out' | 'fit'

/**
 * Reads a key to a zoom action, or `null` for every key that is not one — the
 * cursor's arrows, Home, End, Enter, and Escape all fall through untouched.
 * `+` and `-` are read through their unshifted keys too, so the gesture needs no
 * modifier on a keyboard that shifts them.
 *
 * @internal
 */
export function mapZoomKey(key: string): MapZoomKey | null {
	if (key === '+' || key === '=') return 'in'

	if (key === '-' || key === '_') return 'out'

	return key === '0' ? 'fit' : null
}

/** The factor one zoom keypress steps by; `'fit'` returns to the fitted view instead. @internal */
export function zoomKeyFactor(action: 'in' | 'out'): number {
	return action === 'in' ? MAP_ZOOM_STEP : 1 / MAP_ZOOM_STEP
}
