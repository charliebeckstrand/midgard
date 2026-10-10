import type { AddressSuggestion } from 'ui/address-input'
import type { FormProps } from 'ui/form'
import { MAX_RATING } from '../../constants'
import { isWebAddress } from '../../schemas/place'
import type { Photo, Place, PlaceCategory, PlaceDraft, Trip, Visit, VisitDraft } from '../../types'
import { fromDay, toDay } from '../../utilities/places-filter'
import { withinTrip } from '../../utilities/places-trips'
import { placeDraft } from '../../utilities/places-visits'
import {
	emptyLocation,
	type LocationValues,
	locationValidators,
	required,
	toLocationDraft,
	toLocationValues,
} from './location-form'

/**
 * What the form writes: a place, new (`place: null`) or on record, or a visit
 * to a place on record, new (`visit: null`) or stored.
 *
 * A new place carries its first visit, so the form shows the fields of both. An
 * edit of a place shows only the fields of the place, and a visit only its own.
 * A new place added from a trip names the trip, which presets the Trip field
 * and puts the date on the first day of the trip.
 */
export type PlaceFormTarget =
	| { kind: 'place'; place: Place | null; trip?: Trip }
	| { kind: 'visit'; place: Place; visit: Visit | null }

/** The most photos one visit or one trip holds, the same limit that Mimir sets. */
export const MAX_PHOTOS = 12

/**
 * A photo in a form: a stored photo, or a new file that a save uploads. The
 * key of a new file is the form's own, so that the list can hold it.
 */
export type PhotoEntry = Photo | { key: string; file: File }

/** Whether a photo in a form is a new file. */
export function isNewPhoto(entry: PhotoEntry): entry is { key: string; file: File } {
	return 'file' in entry
}

/** A new file as a photo in a form. */
export function newPhoto(file: File): PhotoEntry {
	return { key: crypto.randomUUID(), file }
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
export type PlaceValues = LocationValues & {
	/**
	 * The photos of the visit, in their order: the stored photos that it keeps
	 * and the new files that a save uploads.
	 */
	photos: PhotoEntry[]
	name: string
	category?: PlaceCategory
	url: string
	visitedAt?: Date
	/** The id of the trip that the visit was on, or `undefined` for none. */
	tripId?: string
	rating: number
	review: string
}

/**
 * Per-field validators, in the shape `Form` takes, for a reader with `trips`.
 * The location fields take {@link locationValidators}.
 *
 * An empty field reads the same way whichever it is — the reader is scanning a
 * column of messages, and one phrasing per field makes them compare the wording
 * instead of the field names. A field that is filled but wrong says what is
 * wrong with it, which is the only thing `required` cannot express.
 *
 * A visit on a trip falls on a day of the trip, which is the rule Mimir keeps.
 */
export function placeValidators(
	trips: readonly Trip[],
): NonNullable<FormProps<PlaceValues>['validate']> {
	return {
		...locationValidators,
		name: (value) => (value.trim() === '' ? required('Name') : undefined),
		category: (value) => (value === undefined ? required('Category') : undefined),
		visitedAt: (value, values) => {
			if (value === undefined || Number.isNaN(value.getTime())) return required('Visited')

			const trip = trips.find((held) => held.id === values.tripId)

			return trip === undefined || withinTrip(trip, toDay(value))
				? undefined
				: 'Visited is not a day of the trip.'
		},
		url: (value) =>
			value.trim() === '' || isWebAddress(value.trim()) ? undefined : 'That is not a web address.',
	}
}

/**
 * Turns the visit fields of the form into the visit the store takes.
 *
 * @param values - The filled form values.
 * @param photos - The object keys of the photos of the visit, in their order:
 * the stored photos that the form kept and the files that it uploaded.
 * @param id - The id of the stored visit that the values edit, or `undefined`
 * for a new visit.
 */
export function toVisitDraft(values: PlaceValues, photos: string[], id?: string): VisitDraft {
	return {
		id,
		visitedAt: toDay(values.visitedAt ?? new Date()),
		rating: Math.min(Math.max(Math.round(values.rating * 2) / 2, 0), MAX_RATING),
		review: values.review.trim() || undefined,
		photos,
		tripId: values.tripId,
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
 * `place` is the match from {@link locatePlace}, and {@link toLocationDraft}
 * reads the location from it. `base` is the record an edit started from. An
 * edit keeps the visits of the record, and a new place takes the visit fields,
 * with `photos`, as its first visit.
 */
export function toPlaceDraft(
	values: PlaceValues,
	place: AddressSuggestion | undefined,
	photos: string[],
	base: Place | null = null,
): PlaceDraft {
	return {
		...toLocationDraft(values.address, place, base),
		name: values.name.trim(),
		category: values.category ?? 'other',
		url: values.url.trim() || undefined,
		visits: base === null ? [toVisitDraft(values, photos)] : placeDraft(base).visits,
	}
}

/**
 * The place with the visit of the form, and its `photos`, written into it: a
 * new visit added to its visits, or a stored one replaced. The rest of the
 * place stays as it is.
 */
export function toVisitPlaceDraft(
	values: PlaceValues,
	place: Place,
	visit: Visit | null,
	photos: string[],
): PlaceDraft {
	const draft = placeDraft(place)

	return {
		...draft,
		visits:
			visit === null
				? [...draft.visits, toVisitDraft(values, photos)]
				: draft.visits.map((held) =>
						held.id === visit.id ? toVisitDraft(values, photos, visit.id) : held,
					),
	}
}

/**
 * The visit fields of the form, seeded from a stored visit, or empty for a new
 * one. A new visit is usually recorded just after it, so `today` is the useful
 * default and the field stays editable. A new visit on a trip starts on the
 * first day of the trip instead.
 *
 * @param today - Today, or `null` while the day of the reader is not known
 * (`useToday`). A new visit then has no day.
 * @param trip - The trip of a new visit.
 */
function toVisitValues(
	visit: Visit | null,
	today: Date | null,
	trip?: Trip,
): Pick<PlaceValues, 'visitedAt' | 'tripId' | 'rating' | 'photos' | 'review'> {
	if (visit === null) {
		return {
			visitedAt: trip === undefined ? (today ?? undefined) : fromDay(trip.startsOn),
			tripId: trip?.id,
			rating: 0,
			photos: [],
			review: '',
		}
	}

	return {
		visitedAt: fromDay(visit.visitedAt),
		tripId: visit.tripId,
		rating: visit.rating,
		photos: [...visit.photos],
		review: visit.review ?? '',
	}
}

/**
 * The fields that the form opens with for a target, with `today` as the day of
 * a new visit. A stored place is read back through {@link toLocationValues}, so
 * a save does not find its position again.
 */
export function targetValues(target: PlaceFormTarget, today: Date | null): PlaceValues {
	const place = target.place

	const visit = target.kind === 'visit' ? target.visit : null

	const trip = target.kind === 'place' ? target.trip : undefined

	return {
		...(place === null ? emptyLocation() : toLocationValues(place)),
		name: place?.name ?? '',
		category: place?.category,
		url: place?.url ?? '',
		...toVisitValues(visit, today, trip),
	}
}
