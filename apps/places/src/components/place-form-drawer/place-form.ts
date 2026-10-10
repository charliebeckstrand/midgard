import type { AddressProvider, AddressSuggestion } from 'ui/address-input'
import type { FormProps } from 'ui/form'
import { MAX_RATING } from '../../constants'
import { isWebAddress } from '../../schemas/place'
import type { Place, PlaceCategory, PlaceDraft, Visit, VisitDraft } from '../../types'
import { fromDay, toDay } from '../../utilities/places-filter'
import { placeDraft } from '../../utilities/places-visits'
import { addressQueries } from './place-address-query'

/**
 * What the form writes: a place, new (`place: null`) or on record, or a visit
 * to a place on record, new (`visit: null`) or stored.
 *
 * A new place carries its first visit, so the form shows the fields of both. An
 * edit of a place shows only the fields of the place, and a visit only its own.
 */
export type PlaceFormTarget =
	| { kind: 'place'; place: Place | null }
	| { kind: 'visit'; place: Place; visit: Visit | null }

/**
 * One row of the photo field. The key is the identity of the row while the
 * reader sorts the rows and types into them, because two rows can hold the same
 * address, and an empty one has none.
 */
export type PhotoRow = { key: string; url: string }

/**
 * What gives the position of a place: the address, which the geocoder finds,
 * or the latitude and the longitude that the reader types.
 */
export type LocateBy = 'address' | 'coordinates'

/** The most photos one visit holds, the same limit that Mimir sets. */
export const MAX_PHOTOS = 12

/** A photo row with a key of its own. */
export function photoRow(url = ''): PhotoRow {
	return { key: crypto.randomUUID(), url }
}

/**
 * What the place form holds while it is being filled, which is not what the store
 * takes. The form works in the shapes its controls emit — a suggestion
 * object, a `Date` — and `toPlaceDraft` turns those into the record.
 *
 * A field the reader can clear is optional, because that is what the store
 * actually holds. `null` is the contract a control's `value` prop and its
 * `onValueChange` keep (CONVENTIONS §7.3); the form normalizes every clear to
 * `undefined` on the way in, so a validator that tested only for `null` read a
 * cleared field as filled and then dereferenced it.
 */
export type PlaceValues = {
	/**
	 * The geocoded match, which is where the position comes from. It is empty
	 * when the reader typed the address, and a submit then finds the position
	 * from that address ({@link locatePlace}).
	 */
	place?: AddressSuggestion
	name: string
	/** The address on one line. A pick in the search fills it, and the reader can type it. */
	address: string
	/** Which fields give the position. The address field has a button that changes it. */
	locateBy: LocateBy
	/**
	 * The latitude and the longitude as the reader typed them. A pick in the
	 * search fills them, and they give the position only where `locateBy` is
	 * `coordinates`.
	 */
	latitude: string
	longitude: string
	category?: PlaceCategory
	url: string
	visitedAt?: Date
	rating: number
	/** The photos of the visit, in their order. The field always holds one row at least. */
	photos: PhotoRow[]
	review: string
}

/** What an empty field says, in the one shape every one of them uses. */
function required(field: string): string {
	return `${field} is required.`
}

/**
 * A coordinate as a number, or `undefined` where the text is not a decimal
 * number. `Number` alone reads "" as 0 and "0x10" as 16.
 */
export function parseCoordinate(text: string): number | undefined {
	const trimmed = text.trim()

	return /^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed) ? Number(trimmed) : undefined
}

/** What a coordinate field says, where the position comes from the coordinates. */
function coordinateIssue(field: string, text: string, limit: number): string | undefined {
	if (text.trim() === '') return required(field)

	const value = parseCoordinate(text)

	if (value === undefined) return `${field} is not a number.`

	return Math.abs(value) > limit ? `${field} is not between -${limit} and ${limit}.` : undefined
}

/**
 * Per-field validators, in the shape `Form` takes.
 *
 * An empty field reads the same way whichever it is — the reader is scanning a
 * column of messages, and one phrasing per field makes them compare the wording
 * instead of the field names. A field that is filled but wrong says what is
 * wrong with it, which is the only thing `required` cannot express.
 *
 * The position is validated through `place` rather than through a pair of
 * coordinate fields, because the reader never sees coordinates: a match that
 * carried none is the failure, and the search field is where they can fix it.
 * The search is not required. A place that the map data does not have is added
 * by its address, and the address is the field that is required. Where the
 * reader gives the coordinates, the coordinates are required and the address
 * is not.
 */
export const placeValidators: NonNullable<FormProps<PlaceValues>['validate']> = {
	place: (value) => {
		if (value === undefined) return undefined

		if (value.latitude === undefined || value.longitude === undefined) {
			return 'That match has no position. Pick another.'
		}

		return undefined
	},
	name: (value) => (value.trim() === '' ? required('Name') : undefined),
	address: (value, values) =>
		values.locateBy === 'address' && value.trim() === '' ? required('Address') : undefined,
	latitude: (value, values) =>
		values.locateBy === 'coordinates' ? coordinateIssue('Latitude', value, 90) : undefined,
	longitude: (value, values) =>
		values.locateBy === 'coordinates' ? coordinateIssue('Longitude', value, 180) : undefined,
	category: (value) => (value === undefined ? required('Category') : undefined),
	visitedAt: (value) =>
		value === undefined || Number.isNaN(value.getTime()) ? required('Visited') : undefined,
	url: (value) =>
		value.trim() === '' || isWebAddress(value.trim()) ? undefined : 'That is not a web address.',
	photos: (rows) => {
		const at = rows.findIndex((row) => row.url.trim() !== '' && !isWebAddress(row.url.trim()))

		return at === -1 ? undefined : `Photo ${at + 1} is not a web address.`
	},
}

/**
 * The address on one line.
 *
 * A named match leads with its name, so its label is the business and its
 * description is where the business is; an unnamed one carries the address in
 * the label already. The parts are the first source, because they are the only
 * form the geocoder gives that is not built for display.
 */
export function addressLine(place: AddressSuggestion): string {
	const { street, city, state, postcode, country } = place.address ?? {}

	const parted = [street, city, state, postcode, country].filter(Boolean).join(', ')

	return parted || place.description || place.label
}

/** Whether a match has a position. */
function hasPosition(match: AddressSuggestion): boolean {
	return match.latitude !== undefined && match.longitude !== undefined
}

/** Whether a match is one house, which is the position of a street address. */
function isHouse(match: AddressSuggestion): boolean {
	return /^\d/.test(match.address?.street ?? '')
}

/** A position on one line, which is the address line of a place that has no address. */
function coordinateLine(latitude: number, longitude: number): string {
	return `${latitude}, ${longitude}`
}

/**
 * The position that the reader typed, as a match. A match from the search, or
 * the match of an edited place, stays where it has the same position, so that
 * the place keeps its city, its state, and its country.
 */
function coordinateMatch(values: PlaceValues): AddressSuggestion {
	const latitude = parseCoordinate(values.latitude) ?? 0

	const longitude = parseCoordinate(values.longitude) ?? 0

	const { place } = values

	if (place?.latitude === latitude && place.longitude === longitude) return place

	return { id: 'coordinates', label: coordinateLine(latitude, longitude), latitude, longitude }
}

/**
 * Finds the position of the values, which is the match that {@link toPlaceDraft}
 * reads.
 *
 * Where the reader gave the coordinates, the coordinates are the position. A
 * match in the search is the position also. Without one, the reader typed the
 * address, and the geocoder finds it. The address line stays as the reader
 * typed it. `null` means that the geocoder found no such address.
 *
 * The geocoder searches the address as typed, then without its secondary unit
 * ({@link addressQueries}). The first match that is a house is the
 * position. Where no query finds a house, the first match with a position is
 * the position, such as the street of a house that the map data does not hold.
 *
 * @param values - The filled form values.
 * @param geocode - The provider that resolves the typed address.
 * @param signal - Cancels the request.
 * @returns The match to store, or `null` where the address resolved to nothing.
 */
export async function locatePlace(
	values: PlaceValues,
	geocode: AddressProvider,
	signal: AbortSignal,
): Promise<AddressSuggestion | null> {
	if (values.locateBy === 'coordinates') return coordinateMatch(values)

	if (values.place !== undefined) return values.place

	let fallback: AddressSuggestion | null = null

	for (const query of addressQueries(values.address)) {
		const matches = (await geocode(query, { signal })).filter(hasPosition)

		const house = matches.find(isHouse)

		if (house !== undefined) return house

		fallback ??= matches[0] ?? null
	}

	return fallback
}

/**
 * Turns the visit fields of the form into the visit the store takes. The empty
 * photo rows are left out, because the field keeps one row when there is no
 * photo.
 *
 * @param values - The filled form values.
 * @param id - The id of the stored visit that the values edit, or `undefined`
 * for a new visit.
 */
export function toVisitDraft(values: PlaceValues, id?: string): VisitDraft {
	return {
		id,
		visitedAt: toDay(values.visitedAt ?? new Date()),
		rating: Math.min(Math.max(Math.round(values.rating * 2) / 2, 0), MAX_RATING),
		review: values.review.trim() || undefined,
		photos: values.photos.map((row) => row.url.trim()).filter((url) => url !== ''),
	}
}

/**
 * Turns filled form values into the record the store takes.
 *
 * Every field it reads is one a validator proved, so each absent case falls back
 * rather than asserting: a submit only reaches here once the form is valid, and
 * the route handler validates the body again regardless. A fallback keeps a
 * would-be impossible state legible instead of asserting it away.
 *
 * `place` is the match from {@link locatePlace}, and it gives the position and
 * the parts that the list filters by. The address line is the field's own.
 * Where the reader gave the coordinates and no address, the coordinates are
 * the address line.
 *
 * `base` is the record an edit started from. The store holds only three parts
 * of the address, so a place dressed back up as a match by {@link toFormValues}
 * carries those three and nothing else. While the match is still that one, the
 * record answers for its own parts. An edit keeps the visits of the record, and
 * a new place takes the visit fields as its first visit.
 */
export function toPlaceDraft(
	values: PlaceValues,
	place: AddressSuggestion | undefined,
	base: Place | null = null,
): PlaceDraft {
	// Only while the match is the one the form was seeded with. That match wears
	// the place's own id, and a geocoder's ids are its own, so a search of any
	// kind replaces the id and the record stops answering.
	const kept = base !== null && place?.id === base.id ? base : null

	const latitude = place?.latitude ?? 0

	const longitude = place?.longitude ?? 0

	return {
		name: values.name.trim(),
		category: values.category ?? 'other',
		address: values.address.trim() || coordinateLine(latitude, longitude),
		city: kept?.city ?? place?.address?.city,
		state: kept?.state ?? place?.address?.state,
		country: kept?.country ?? place?.address?.country,
		latitude,
		longitude,
		url: values.url.trim() || undefined,
		visits: base === null ? [toVisitDraft(values)] : base.visits,
	}
}

/**
 * The place with the visit of the form written into it: a new visit added to
 * its visits, or a stored one replaced. The rest of the place stays as it is.
 */
export function toVisitPlaceDraft(
	values: PlaceValues,
	place: Place,
	visit: Visit | null,
): PlaceDraft {
	return {
		...placeDraft(place),
		visits:
			visit === null
				? [...place.visits, toVisitDraft(values)]
				: place.visits.map((held) =>
						held.id === visit.id ? toVisitDraft(values, visit.id) : held,
					),
	}
}

/**
 * The visit fields of the form, seeded from a stored visit, or empty for a new
 * one. A new visit is usually recorded just after it, so `today` is the useful
 * default and the field stays editable.
 */
export function toVisitValues(
	visit: Visit | null,
	today: Date,
): Pick<PlaceValues, 'visitedAt' | 'rating' | 'photos' | 'review'> {
	const photos = visit?.photos ?? []

	return {
		visitedAt: visit === null ? today : fromDay(visit.visitedAt),
		rating: visit?.rating ?? 0,
		photos: photos.length === 0 ? [photoRow()] : photos.map((url) => photoRow(url)),
		review: visit?.review ?? '',
	}
}

/** The fields of an empty form, which add a place. */
export function emptyValues(today: Date): PlaceValues {
	return {
		place: undefined,
		name: '',
		address: '',
		locateBy: 'address',
		latitude: '',
		longitude: '',
		category: undefined,
		url: '',
		...toVisitValues(null, today),
	}
}

/**
 * A stored place read back as form values, for an edit.
 *
 * The search field holds a geocoded match and a stored place is not one, so the
 * position it already carries is dressed as a match: the field shows the address
 * on record, the validator sees the coordinates it needs, and searching again
 * replaces the lot. Without it, a save would find the position from the stored
 * address again, and could move a place that is already in the correct position.
 *
 * `visit` seeds the visit fields: a stored visit, or `null` for empty ones on
 * `today`.
 */
export function toFormValues(place: Place, visit: Visit | null, today: Date): PlaceValues {
	return {
		place: {
			id: place.id,
			label: place.address,
			name: place.name,
			address: {
				city: place.city,
				state: place.state,
				country: place.country,
			},
			latitude: place.latitude,
			longitude: place.longitude,
		},
		name: place.name,
		address: place.address,
		locateBy: 'address',
		latitude: String(place.latitude),
		longitude: String(place.longitude),
		category: place.category,
		url: place.url ?? '',
		...toVisitValues(visit, today),
	}
}

/** The fields that the form opens with for a target, with `today` as the day of a new visit. */
export function targetValues(target: PlaceFormTarget, today: Date): PlaceValues {
	if (target.kind === 'visit') return toFormValues(target.place, target.visit, today)

	return target.place === null ? emptyValues(today) : toFormValues(target.place, null, today)
}
