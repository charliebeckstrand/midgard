import type { FormatNumber, MapRecord, Place, Trip, Visit } from '../types'

/**
 * The places of every trip, by the trip's id. A place is on a trip when one of
 * its visits names the trip, so the trip stores no list of its own that could
 * fall out of step with the visits.
 *
 * Each list is newest visit first, by the visit that names the trip.
 */
export function placesByTrip(places: readonly Place[]): Map<string, Place[]> {
	const byTrip = new Map<string, Place[]>()

	for (const place of places) {
		const tripIds = new Set(getTripIds(place))

		for (const id of tripIds) {
			const list = byTrip.get(id)

			if (list === undefined) byTrip.set(id, [place])
			else list.push(place)
		}
	}

	for (const [id, list] of byTrip) {
		list.sort((a, b) => {
			const left = tripVisit(a, id)?.visitedAt ?? ''

			const right = tripVisit(b, id)?.visitedAt ?? ''

			if (left === right) return a.name.localeCompare(b.name)

			return left < right ? 1 : -1
		})
	}

	return byTrip
}

/**
 * The newest visit of a place that names a trip, or `undefined`. Mimir stores
 * the visits newest first, so the first match is the newest.
 */
function tripVisit(place: Place, tripId: string): Visit | undefined {
	return place.visits.find((visit) => visit.tripId === tripId)
}

/** Trips newest first, by their first day, and by name where two start on one day. */
export function sortTrips(trips: readonly Trip[]): Trip[] {
	return [...trips].sort((a, b) => {
		if (a.startsOn === b.startsOn) return a.name.localeCompare(b.name)

		return a.startsOn < b.startsOn ? 1 : -1
	})
}

/** Whether a record of the map is a trip. Only a trip has days. */
export function isTrip(record: MapRecord): record is Trip {
	return 'startsOn' in record
}

/** The ids of the trips that a place is on: the trips that its visits name. */
export function getTripIds(place: Place): string[] {
	return place.visits.flatMap((visit) => visit.tripId ?? [])
}

/**
 * The records that the map draws, the trips first, and the index of the point
 * that stands for each record. While the map draws a trip, the trip is the one
 * point for its places: a place on a drawn trip is not drawn, and it stands at
 * the point of its trip.
 */
export function drawnRecords(
	places: readonly Place[],
	trips: readonly Trip[],
): { records: MapRecord[]; drawnAt: ReadonlyMap<string, number> } {
	const tripAt = new Map(trips.map((trip, index) => [trip.id, index]))

	const drawnAt = new Map(tripAt)

	const records: MapRecord[] = [...trips]

	for (const place of places) {
		const onTrip = getTripIds(place)
			.map((id) => tripAt.get(id))
			.find((index) => index !== undefined)

		drawnAt.set(place.id, onTrip ?? records.length)

		if (onTrip === undefined) records.push(place)
	}

	return { records, drawnAt }
}

/** A number of places, such as `1 place` or `1,200 places`, with the count in the locale of `format`. */
export function placeCount(count: number, format: FormatNumber): string {
	return `${format(count)} ${count === 1 ? 'place' : 'places'}`
}

/**
 * A number of places and of trips, such as `3 places`, `1 trip`, or
 * `2 places and 1 trip`, with each count in the locale of `format`. A kind with
 * none is left out.
 */
export function recordCount(places: number, trips: number, format: FormatNumber): string {
	const tripPart = `${format(trips)} ${trips === 1 ? 'trip' : 'trips'}`

	if (trips === 0) return placeCount(places, format)

	return places === 0 ? tripPart : `${placeCount(places, format)} and ${tripPart}`
}

/** Whether a stored day falls on one of the days of a trip. */
export function withinTrip(trip: Pick<Trip, 'startsOn' | 'endsOn'>, day: string): boolean {
	return day >= trip.startsOn && day <= trip.endsOn
}
