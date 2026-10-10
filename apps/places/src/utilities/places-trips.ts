import type { MapRecord, Place, Trip, Visit } from '../types'

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
		const trips = new Set(place.visits.flatMap((visit) => visit.tripId ?? []))

		for (const id of trips) {
			const list = byTrip.get(id)

			if (list === undefined) byTrip.set(id, [place])
			else list.push(place)
		}
	}

	for (const [id, list] of byTrip) {
		list.sort((a, b) => {
			const left = tripVisit(a, id)?.visitedAt ?? ''

			const right = tripVisit(b, id)?.visitedAt ?? ''

			return left === right ? a.name.localeCompare(b.name) : left < right ? 1 : -1
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
	return [...trips].sort((a, b) =>
		a.startsOn === b.startsOn ? a.name.localeCompare(b.name) : a.startsOn < b.startsOn ? 1 : -1,
	)
}

/** Whether a record of the map is a trip. Only a trip has days. */
export function isTrip(record: MapRecord): record is Trip {
	return 'startsOn' in record
}

/**
 * The places that are on none of `trips`. While the map draws a trip, the trip
 * is the one point for its places, so the map draws only the places that are
 * not on a drawn trip.
 */
export function placesOffTrips(places: readonly Place[], trips: readonly Trip[]): Place[] {
	if (trips.length === 0) return [...places]

	const drawn = new Set(trips.map((trip) => trip.id))

	return places.filter(
		(place) => !place.visits.some((visit) => visit.tripId !== undefined && drawn.has(visit.tripId)),
	)
}

/** A number of places, such as `1 place` or `3 places`. */
export function placeCount(count: number): string {
	return `${count} ${count === 1 ? 'place' : 'places'}`
}

/**
 * A number of places and of trips, such as `3 places`, `1 trip`, or
 * `2 places and 1 trip`. A kind with none is left out.
 */
export function recordCount(places: number, trips: number): string {
	const tripPart = `${trips} ${trips === 1 ? 'trip' : 'trips'}`

	if (trips === 0) return placeCount(places)

	return places === 0 ? tripPart : `${placeCount(places)} and ${tripPart}`
}

/** Whether a stored day falls on one of the days of a trip. */
export function withinTrip(trip: Pick<Trip, 'startsOn' | 'endsOn'>, day: string): boolean {
	return day >= trip.startsOn && day <= trip.endsOn
}
