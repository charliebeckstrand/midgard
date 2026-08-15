import type { MapPointDatum } from 'ui/modules/map'
import { CATEGORY_BY_VALUE } from '../../constants'
import type { Place } from '../../types'

/**
 * The dots the mark draws, in the order the places were given — which is the
 * order a click reports back, so an index always names the caller's own place.
 *
 * Each dot carries its own name, so the tooltip, the hidden table, and the
 * keyboard cursor all say which place it is rather than numbering it within the
 * set — and its category's colour, so a lone dot says what kind of place it is.
 * A summary keeps the mark's own colour, since it stands for several.
 */
export function placeStops(places: readonly Place[]): MapPointDatum[] {
	return places.map((place) => ({
		at: [place.longitude, place.latitude],
		label: place.name,
		detail: place.city,
		color: CATEGORY_BY_VALUE.get(place.category)?.color,
	}))
}
