import type { AddressProvider, AddressSuggestion } from 'ui/address-input'
import type { FormProps } from 'ui/form'
import type { LocationDraft } from '../../types'
import { addressQueries } from './place-address-query'

/**
 * What gives the position of a place: the address, which the geocoder finds,
 * or the latitude and the longitude that the reader types.
 */
export type LocateBy = 'address' | 'coordinates'

/**
 * The fields of the place form that say where a place is: the geocoded match,
 * the address line, and the coordinates. The search field and the address
 * field bind them by name.
 */
export type LocationValues = {
	/**
	 * The geocoded match, which is where the position comes from. It is empty
	 * when the reader typed the address, and a submit then finds the position
	 * from that address ({@link locatePlace}).
	 */
	place?: AddressSuggestion
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
}

/**
 * How long a submit waits for the geocoder to find a typed address. The public
 * geocoder has no service level, and a submit that waits with no limit keeps
 * the button busy with no message.
 */
export const LOCATE_TIMEOUT_MS = 10_000

/** A stored record with a location: a place or a trip. */
type LocatedRecord = LocationDraft & { id: string; name: string }

/** What a field says of a match that has no position. */
export const NO_POSITION = 'That match has no position. Pick another.'

/**
 * The validators of the location fields, in the shape `Form` takes.
 *
 * The position is validated through `place` rather than through a pair of
 * coordinate fields, because the reader never sees coordinates: a match that
 * carried none is the failure, and the search field is where they can fix it.
 * The search is not required. A record that the map data does not have is
 * added by its address, and the address is the field that is required. Where
 * the reader gives the coordinates, the coordinates are required and the
 * address is not.
 */
export const locationValidators: NonNullable<FormProps<LocationValues>['validate']> = {
	place: (value) => (value === undefined || hasPosition(value) ? undefined : NO_POSITION),
	address: (value, values) =>
		values.locateBy === 'address' && value.trim() === '' ? required('Address') : undefined,
	latitude: (value, values) =>
		values.locateBy === 'coordinates' ? coordinateIssue('Latitude', value, 90) : undefined,
	longitude: (value, values) =>
		values.locateBy === 'coordinates' ? coordinateIssue('Longitude', value, 180) : undefined,
}

/** The location fields of an empty form. */
export function emptyLocation(): LocationValues {
	return { place: undefined, address: '', locateBy: 'address', latitude: '', longitude: '' }
}

/**
 * A stored record read back as location fields, for an edit.
 *
 * The search field holds a geocoded match and a stored record is not one, so
 * the position it already carries is dressed as a match: the field shows the
 * address on record, the validator sees the coordinates it needs, and searching
 * again replaces the lot. Without it, a save would find the position from the
 * stored address again, and could move a record that is already in the correct
 * position.
 */
export function toLocationValues(record: LocatedRecord): LocationValues {
	return {
		place: recordMatch(record),
		address: record.address,
		locateBy: 'address',
		latitude: String(record.latitude),
		longitude: String(record.longitude),
	}
}

/**
 * A stored record dressed as a geocoded match, which a search field holds. It
 * wears the id of the record, so {@link toLocationDraft} can tell that the
 * match is still the record's own, and the record then answers for the parts
 * of its address. The match therefore carries no parts of its own.
 */
export function recordMatch(record: LocatedRecord): AddressSuggestion {
	return {
		id: record.id,
		label: record.address,
		name: record.name,
		latitude: record.latitude,
		longitude: record.longitude,
	}
}

/**
 * The location that the store takes, from the address line and the match that
 * gives the position.
 *
 * Where the address line is empty, as for a place that the reader gave the
 * coordinates of, the coordinates are the address line.
 *
 * `base` is the record an edit started from. The store holds only three parts
 * of the address, so a record dressed back up as a match by
 * {@link toLocationValues} carries those three and nothing else. While the
 * match is still that one, the record answers for its own parts. The match
 * wears the record's own id, and a geocoder's ids are its own, so a search of
 * any kind replaces the id and the record stops answering.
 */
export function toLocationDraft(
	address: string,
	match: AddressSuggestion | undefined,
	base: LocatedRecord | null,
): LocationDraft {
	const kept = base !== null && match?.id === base.id ? base : null

	const latitude = match?.latitude ?? 0

	const longitude = match?.longitude ?? 0

	return {
		address: address.trim() || coordinateLine(latitude, longitude),
		city: kept?.city ?? match?.address?.city,
		state: kept?.state ?? match?.address?.state,
		country: kept?.country ?? match?.address?.country,
		latitude,
		longitude,
	}
}

/** What an empty field says, in the one shape every one of them uses. */
export function required(field: string): string {
	return `${field} is required.`
}

/**
 * A coordinate as a number, or `undefined` where the text is not a decimal
 * number. `Number` alone reads "" as 0 and "0x10" as 16.
 */
function parseCoordinate(text: string): number | undefined {
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

/**
 * The name of an area on one line, such as `Lisbon, Portugal`: the label of
 * the match, then its city, its state, and its country, with each part once.
 * The geocoder names a city and the state around it alike where the two share
 * a name. A postcode is not a part, because it names a street, not an area.
 */
export function locationLine(match: AddressSuggestion): string {
	const { city, state, country } = match.address ?? {}

	const parts = [...match.label.split(','), city, state, country]

	return [...new Set(parts.map((part) => part?.trim()).filter(Boolean))].join(', ')
}

/** Whether a match has a position. */
export function hasPosition(match: AddressSuggestion): boolean {
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
function coordinateMatch(values: LocationValues): AddressSuggestion {
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
	values: LocationValues,
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
