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
 * of its own, or the object form that also names how the wheel is armed.
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
			 * Which key hands the wheel to the map. Held, it both zooms and stops the
			 * page scrolling; unheld, every wheel over the plot is the page's — so a
			 * map inside a scrolling page never swallows a scroll the reader meant for
			 * the page. Touch keeps the same bargain: one finger scrolls, two pan and
			 * pinch.
			 *
			 * The key arms the wheel but does not end it: a trackpad keeps sending
			 * after the fingers leave, so what the key armed is swallowed to the end of
			 * its own momentum rather than scrolling the page the moment the key goes.
			 * The zoom still stops with the key; only the leftover travel is absorbed,
			 * and a fresh push through it goes to the page as it always would.
			 *
			 * `false` arms the wheel outright: a plain wheel zooms, the map hands the
			 * gesture back only where the view can no longer move, and the plot claims
			 * touch so one finger pans. It is the right choice for a map that owns its
			 * screen and the wrong one for almost anything else, which is why it must
			 * be asked for.
			 *
			 * @defaultValue 'shift'
			 */
			modifier?: MapZoomModifier | false
	  }

/** What a `zoom` prop resolved to: the ceiling, and the key that arms the wheel. @internal */
export type MapZoomSettings = {
	max: number
	/** `null` where the wheel is armed outright and the map claims touch. */
	modifier: MapZoomModifier | null
}

/**
 * What a `zoom` prop asks for, or `null` where the map does not zoom.
 *
 * The modifier defaults to the shift key, so a map added to a page is safe to
 * scroll past before anyone thinks about it — the failure of the other default
 * is silent and lands on the reader, who finds the page stuck under their
 * pointer. Only `modifier: false` arms the wheel outright.
 *
 * A ceiling at or under the fit is no zoom at all: the fit is the floor, so such
 * a map could never move, and it must take none of what a zoom costs — no tab
 * stop it cannot answer, and no claim on touch.
 *
 * @internal
 */
export function mapZoomSettings(zoom: MapZoomInput | undefined): MapZoomSettings | null {
	if (zoom === true) return { max: MAP_ZOOM_MAX, modifier: DEFAULT_MODIFIER }

	if (typeof zoom === 'number') {
		return zoom > MAP_ZOOM_FIT ? { max: zoom, modifier: DEFAULT_MODIFIER } : null
	}

	if (zoom === false || zoom === undefined) return null

	const max = zoom.max ?? MAP_ZOOM_MAX

	const modifier = zoom.modifier ?? DEFAULT_MODIFIER

	return max > MAP_ZOOM_FIT ? { max, modifier: modifier === false ? null : modifier } : null
}

/** The key a map arms its wheel with unless it says otherwise. */
const DEFAULT_MODIFIER: MapZoomModifier = 'shift'
