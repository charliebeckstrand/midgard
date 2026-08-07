/**
 * The one reading of the public `zoom` prop. Held beside the transform it
 * bounds rather than in the hook that drives it, so the plat can gate its tab
 * stop and its touch policy on what the prop asks for without holding any view
 * state — and so the contract is testable without rendering a map.
 */

import { MAP_ZOOM_FIT, MAP_ZOOM_MAX } from '../map-constants'

/**
 * A key the reader holds to hand the wheel to the map. Only the shift key: a
 * trackpad pinch arrives as `ctrl` + wheel and the browser's own page zoom
 * takes `ctrl` and `meta`, so either of those would fight the platform for a
 * gesture the reader means for something else.
 */
export type MapZoomModifier = 'shift'

/**
 * What `MapPlat`'s `zoom` prop takes: off, on at the default ceiling, a ceiling
 * of its own, or the object form that also names a modifier.
 */
export type MapZoomInput =
	| boolean
	| number
	| {
			/**
			 * How far in the map zooms.
			 * @defaultValue 8
			 */
			max?: number
			/**
			 * Hand the wheel to the map only while this key is held. Without it a
			 * plain wheel over the plot zooms, and a reader at the fit or at the
			 * ceiling scrolls the page through it; with it the page keeps every plain
			 * wheel, and a held key both zooms and stops the page scrolling — so the
			 * two never both answer one gesture. Touch follows the same bargain: one
			 * finger scrolls the page and two pan and pinch, where a modifier-less map
			 * claims touch outright.
			 */
			modifier?: MapZoomModifier
	  }

/** What a `zoom` prop resolved to: the ceiling, and the key that arms the wheel. @internal */
export type MapZoomSettings = {
	max: number
	/** `null` where a plain wheel zooms and the map claims touch. */
	modifier: MapZoomModifier | null
}

/**
 * What a `zoom` prop asks for, or `null` where the map does not zoom.
 *
 * A ceiling at or under the fit is no zoom at all: the fit is the floor, so such
 * a map could never move, and it must take none of what a zoom costs — no tab
 * stop it cannot answer, and no claim on touch.
 *
 * @internal
 */
export function mapZoomSettings(zoom: MapZoomInput | undefined): MapZoomSettings | null {
	if (zoom === true) return { max: MAP_ZOOM_MAX, modifier: null }

	if (typeof zoom === 'number') {
		return zoom > MAP_ZOOM_FIT ? { max: zoom, modifier: null } : null
	}

	if (zoom === false || zoom === undefined) return null

	const max = zoom.max ?? MAP_ZOOM_MAX

	return max > MAP_ZOOM_FIT ? { max, modifier: zoom.modifier ?? null } : null
}
