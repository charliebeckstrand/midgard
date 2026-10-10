import type { AddressSuggestion } from 'ui/address-input'
import type { FormProps } from 'ui/form'
import type { PlaceCategory, Trip, TripDraft, TripStop, VisitDraft } from '../../types'
import { fromDay, toDay } from '../../utilities/places-filter'
import { withinTrip } from '../../utilities/places-trips'
import {
	addressLine,
	hasPosition,
	locationLine,
	NO_POSITION,
	recordMatch,
	required,
	toLocationDraft,
} from './location-form'
import type { PhotoEntry } from './place-form'

/** What the trip form writes: a new trip (`trip: null`), or an edit of one on record. */
export type TripFormTarget = { trip: Trip | null }

/**
 * One place of a new trip, as a row of the Places field. The key is the
 * identity of the row, because two rows can hold the same place.
 *
 * `placeId` is set where the match is a place on record, which the trip then
 * visits. A match from the geocoder is a new place, and it takes a category.
 */
export type StopRow = {
	key: string
	match?: AddressSuggestion
	placeId?: string
	category?: PlaceCategory
	day?: Date
}

/** A stop row with a key of its own, on `day`. */
export function stopRow(day?: Date): StopRow {
	return { key: crypto.randomUUID(), day }
}

/** What the trip form holds while it is being filled. */
export type TripValues = {
	/**
	 * The town, the city, the region, or the country of the trip, as a match of
	 * the location search. It is the position of the trip and the name of its
	 * location, so a trip has no address field.
	 */
	location?: AddressSuggestion
	name: string
	/** The first and the last day of the trip. */
	days?: [Date, Date]
	/** The photos of the trip, in their order, as the photos of a visit are. */
	photos: PhotoEntry[]
	/** The places of a new trip. An edit has no rows: a place joins a trip through its visit. */
	stops: StopRow[]
}

/**
 * The first problem of the Places field, or `undefined`. Each row needs a
 * match with a position, a category where the match is a new place, and a day
 * of the trip.
 */
function stopIssue(rows: readonly StopRow[], days: [Date, Date] | undefined): string | undefined {
	const span = days === undefined ? undefined : { startsOn: toDay(days[0]), endsOn: toDay(days[1]) }

	for (const [at, row] of rows.entries()) {
		const name = `Place ${at + 1}`

		if (row.match === undefined) return `${name} is empty. Search for it, or remove its row.`

		if (!hasPosition(row.match)) return `${name} has no position. Pick another match.`

		if (row.placeId === undefined && row.category === undefined) return `${name} needs a category.`

		if (row.day === undefined) return `${name} needs a day.`

		if (span !== undefined && !withinTrip(span, toDay(row.day))) {
			return `${name} is not on a day of the trip.`
		}
	}

	return undefined
}

/** Per-field validators, in the shape `Form` takes. */
export const tripValidators: NonNullable<FormProps<TripValues>['validate']> = {
	location: (value) => {
		if (value === undefined) return required('Location')

		return hasPosition(value) ? undefined : NO_POSITION
	},
	name: (value) => (value.trim() === '' ? required('Name') : undefined),
	days: (value) =>
		value === undefined || value.some((day) => Number.isNaN(day.getTime()))
			? required('Dates')
			: undefined,
	stops: (rows, values) => stopIssue(rows, values.days),
}

/** The fields that the form opens with for a target. */
export function tripValues({ trip }: TripFormTarget): TripValues {
	return {
		location: trip === null ? undefined : recordMatch(trip),
		name: trip?.name ?? '',
		days: trip === null ? undefined : [fromDay(trip.startsOn), fromDay(trip.endsOn)],
		photos: [...(trip?.photos ?? [])],
		stops: [],
	}
}

/**
 * Turns filled form values into the trip the store takes. `photos` is the
 * object keys of the photos of the trip in their order, and `base` the trip
 * that an edit started from. Every field it reads is one a validator proved,
 * so an absent case falls back rather than asserting, as `toPlaceDraft` does.
 */
export function toTripDraft(values: TripValues, photos: string[], base: Trip | null): TripDraft {
	const [startsOn, endsOn] = values.days ?? [new Date(), new Date()]

	return {
		...toLocationDraft(
			values.location === undefined ? '' : locationLine(values.location),
			values.location,
			base,
		),
		name: values.name.trim(),
		startsOn: toDay(startsOn),
		endsOn: toDay(endsOn),
		photos,
	}
}

/**
 * Turns the rows of the Places field into the stops the store takes: a visit
 * to a place on record, or a new place with its one visit. A visit of a new
 * trip has no score, review, or photos yet; the reader adds them per visit.
 * Mimir sets the trip of each visit.
 */
export function toTripStops(rows: readonly StopRow[]): TripStop[] {
	return rows.flatMap((row): TripStop[] => {
		const { match } = row

		if (match === undefined) return []

		const visit: VisitDraft = { visitedAt: toDay(row.day ?? new Date()), rating: 0, photos: [] }

		if (row.placeId !== undefined) return [{ placeId: row.placeId, visit }]

		return [
			{
				place: {
					...toLocationDraft(addressLine(match), match, null),
					name: match.name ?? match.label,
					category: row.category ?? 'other',
					visits: [visit],
				},
			},
		]
	})
}
