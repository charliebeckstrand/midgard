import type { AddressProvider, AddressSuggestion } from 'ui/address-input'
import type { FormProps } from 'ui/form'
import { MAX_RATING } from '../../constants'
import { isWebAddress } from '../../schemas/place'
import type { Place, PlaceCategory, PlaceDraft } from '../../types'
import { fromDay, toDay } from '../../utilities/places-filter'

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
	category?: PlaceCategory
	rating: number
	visitedAt?: Date
	url: string
	photo: string
	review: string
}

/** What an empty field says, in the one shape every one of them uses. */
function required(field: string): string {
	return `${field} is required.`
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
 * by its address, and the address is the field that is required.
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
	address: (value) => (value.trim() === '' ? required('Address') : undefined),
	category: (value) => (value === undefined ? required('Category') : undefined),
	visitedAt: (value) =>
		value === undefined || Number.isNaN(value.getTime()) ? required('Visited') : undefined,
	url: (value) =>
		value.trim() === '' || isWebAddress(value.trim()) ? undefined : 'That is not a web address.',
	photo: (value) =>
		value.trim() === '' || isWebAddress(value.trim()) ? undefined : 'That is not a web address.',
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
 * Finds the position of the values, which is the match that {@link toPlaceDraft}
 * reads.
 *
 * A match in the search is the position already. Without one, the reader typed
 * the address, and the geocoder's first match for that address with a position
 * is the position. The address line stays as the reader typed it. `null` means
 * that the geocoder found no such address.
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
	if (values.place !== undefined) return values.place

	const matches = await geocode(values.address.trim(), { signal })

	return (
		matches.find((match) => match.latitude !== undefined && match.longitude !== undefined) ?? null
	)
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
 *
 * `base` is the record an edit started from. The store holds only three parts
 * of the address, so a place dressed back up as a match by {@link toFormValues}
 * carries those three and nothing else. While the match is still that one, the
 * record answers for its own parts.
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

	return {
		name: values.name.trim(),
		category: values.category ?? 'other',
		address: values.address.trim(),
		city: kept?.city ?? place?.address?.city,
		state: kept?.state ?? place?.address?.state,
		country: kept?.country ?? place?.address?.country,
		latitude: place?.latitude ?? 0,
		longitude: place?.longitude ?? 0,
		rating: Math.min(Math.max(Math.round(values.rating), 0), MAX_RATING),
		review: values.review.trim() || undefined,
		url: values.url.trim() || undefined,
		photo: values.photo.trim() || undefined,
		visitedAt: toDay(values.visitedAt ?? new Date()),
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
 */
export function toFormValues(place: Place): PlaceValues {
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
		category: place.category,
		rating: place.rating,
		visitedAt: fromDay(place.visitedAt),
		url: place.url ?? '',
		photo: place.photo ?? '',
		review: place.review ?? '',
	}
}
