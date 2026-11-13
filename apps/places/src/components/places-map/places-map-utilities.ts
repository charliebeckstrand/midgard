import type { ChartPress } from 'ui/chart'
import type { MapPointDatum } from 'ui/modules/map'
import { CATEGORY_BY_VALUE, RECORD_KIND_META } from '../../constants'
import type { MapRecord } from '../../types'
import { isTrip } from '../../utilities/places-trips'

/**
 * The points the mark draws, in the order the records were given. That is the
 * order a click reports back, so an index always names the caller's own record.
 *
 * Each point carries its own name, so the tooltip, the hidden table, and the
 * keyboard cursor all say which record it is rather than numbering it within
 * the set. A place is a circle in its category's color, so a lone dot says what
 * kind of place it is. A trip is a square in the trip color, so it reads as the
 * level above the places by shape as well as by color. A summary keeps the
 * mark's own color, since it stands for several.
 */
export function recordStops(records: readonly MapRecord[]): MapPointDatum[] {
	return records.map((record) => ({
		at: [record.longitude, record.latitude],
		label: record.name,
		detail: record.city,
		...(isTrip(record)
			? { shape: RECORD_KIND_META.trips.shape, color: RECORD_KIND_META.trips.color }
			: {
					shape: RECORD_KIND_META.places.shape,
					color: CATEGORY_BY_VALUE.get(record.category)?.color,
				}),
	}))
}

/**
 * Whether a press is one tap of a finger. On a phone, the map opens a place or
 * a region only on a double tap, so that a stray tap while the reader pans does
 * not open one. A click, a key, and the second tap of a double tap open it.
 */
export function isSingleTap(press: ChartPress): boolean {
	return press.pointerType === 'touch' && press.count < 2
}
