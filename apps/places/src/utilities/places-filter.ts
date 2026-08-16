import type { DatePickerRelativeValue } from 'ui/date-picker'
import type { Place, PlaceCategory } from '../types'

/**
 * Which regions the map paints as visited, or neither of them.
 *
 * It is a paint filter rather than a place filter: the places drawn never change
 * with it, because a place stands where it stands whatever the region under it
 * is marked. Absent, no region is painted and every one of them reads alike.
 */
export type PlaceVisitFilter = 'visited' | 'unvisited'

/** What the filter bar holds. An absent field filters nothing, which is what an empty bar does. */
export type PlaceFilterValue = {
	categories?: PlaceCategory[]
	/** Which regions carry the visited paint. See {@link PlaceVisitFilter}. */
	visitedRegions?: PlaceVisitFilter
	/**
	 * The committed spans, in the picker's own type rather than a local shape of
	 * the same fields. The filter reads exactly what the relative DatePicker
	 * writes, so a change on that side lands here as a type error and not as a
	 * silent change of meaning.
	 */
	visited?: DatePickerRelativeValue[]
}

/**
 * Whether the bar narrows anything.
 *
 * It reads the values rather than the keys: `Filters` leaves a cleared slot
 * present and `undefined`, so `Object.keys` counts a field the reader has
 * already emptied. Reading them generically rather than naming each one is what
 * keeps a filter added later from silently failing to raise the Clear.
 */
export function hasActiveFilter(filter: PlaceFilterValue): boolean {
	return Object.values(filter).some(
		(field) => field !== undefined && !(Array.isArray(field) && field.length === 0),
	)
}

/** The `YYYY-MM-DD` day a Date falls on, read in local time — the same clock a visit was recorded against. */
export function toDay(date: Date): string {
	const year = date.getFullYear()

	const month = String(date.getMonth() + 1).padStart(2, '0')

	const day = String(date.getDate()).padStart(2, '0')

	return `${year}-${month}-${day}`
}

/** Reads a stored `YYYY-MM-DD` day back as a local midnight, for display. */
export function fromDay(day: string): Date {
	const [year, month, date] = day.split('-').map(Number)

	return new Date(year ?? 1970, (month ?? 1) - 1, date ?? 1)
}

/**
 * Whether a day falls inside any of the committed spans. Compared as day
 * strings, not as timestamps: both ends of a relative span sit at local
 * midnight, and a visit is a day and not a moment, so comparing days is the
 * comparison that has an answer.
 */
function withinAny(day: string, ranges: readonly DatePickerRelativeValue[]): boolean {
	return ranges.some((range) => day >= toDay(range.from) && day <= toDay(range.to))
}

/**
 * The places a filter admits, in the order they were given.
 *
 * Each field narrows on its own and an absent one narrows nothing, so an empty
 * bar answers with everything. An empty category list is the reader having
 * turned every category off, which admits nothing — distinct from the absent
 * field, which admits all.
 *
 * There is no country field. The map projects one country now, so narrowing to
 * a country and opening it were two controls a step apart that answered nearly
 * the same question — and the picker is the one that also takes the reader
 * there.
 */
export function filterPlaces(places: readonly Place[], filter: PlaceFilterValue): Place[] {
	const { categories, visited } = filter

	return places.filter((place) => {
		if (categories !== undefined && !categories.includes(place.category)) return false

		if (visited !== undefined && visited.length > 0 && !withinAny(place.visitedAt, visited)) {
			return false
		}

		return true
	})
}
