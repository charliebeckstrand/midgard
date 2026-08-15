import type { AddressSuggestion } from 'ui/address-input'
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
 * `onValueChange` keep (CONVENTIONS §7.3); the form normalises every clear to
 * `undefined` on the way in, so a validator that tested only for `null` read a
 * cleared field as filled and then dereferenced it.
 */
export type PlaceValues = {
	/** The geocoded match, which is where the position comes from. */
	place?: AddressSuggestion
	name: string
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
 */
export const placeValidators: NonNullable<FormProps<PlaceValues>['validate']> = {
	place: (value) => {
		if (value === undefined) return required('Search')

		if (value.latitude === undefined || value.longitude === undefined) {
			return 'That match has no position. Pick another.'
		}

		return undefined
	},
	name: (value) => (value.trim() === '' ? required('Name') : undefined),
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
function addressLine(place: AddressSuggestion | undefined): string {
	if (place === undefined) return ''

	const { street, city, state, postcode, country } = place.address ?? {}

	const parted = [street, city, state, postcode, country].filter(Boolean).join(', ')

	return parted || place.description || place.label
}

/**
 * Turns filled form values into the record the store takes.
 *
 * Every field it reads is one a validator proved, so each absent case falls back
 * rather than asserting: a submit only reaches here once the form is valid, and
 * the route handler validates the body again regardless. A fallback keeps a
 * would-be impossible state legible instead of asserting it away.
 *
 * `base` is the record an edit started from, and it is what keeps an edit from
 * shortening its own address. The store holds the line whole and only three of
 * its parts, so a place dressed back up as a match by {@link toFormValues} has no
 * street and no postcode to rebuild that line from — re-derived, "828 Broadway,
 * New York, New York, 10003, United States" comes back as "New York, New York".
 * The record answers for its own address until the reader searches again.
 */
export function toPlaceDraft(values: PlaceValues, base: Place | null = null): PlaceDraft {
	const { place } = values

	// Only while the field still holds the match the form was seeded with. That
	// match wears the place's own id, and a geocoder's ids are its own — so a
	// search of any kind replaces the id and the record stops answering.
	const kept = base !== null && place?.id === base.id ? base : null

	return {
		name: values.name.trim(),
		category: values.category ?? 'other',
		address: kept?.address ?? addressLine(place),
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
 * replaces the lot. Without it an edit would open with an empty search and
 * refuse to save until the reader re-found a place they had already found.
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
		category: place.category,
		rating: place.rating,
		visitedAt: fromDay(place.visitedAt),
		url: place.url ?? '',
		photo: place.photo ?? '',
		review: place.review ?? '',
	}
}
