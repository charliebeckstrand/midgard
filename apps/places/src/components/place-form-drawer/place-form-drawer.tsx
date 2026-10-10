'use client'

import { Field, Label, Message } from 'ui/fieldset'
import { Input } from 'ui/input'
import { Rating } from 'ui/rating'
import type { PlaceDraft, Trip } from '../../types'
import { FormDrawer, useHeldTarget } from './form-drawer'
import { LOCATE_TIMEOUT_MS, locatePlace } from './location-form'
import { photoKeys } from './photo-keys'
import { PlaceAddressField } from './place-address-field'
import { PlaceCategoryField } from './place-category-field'
import {
	type PlaceFormTarget,
	type PlaceValues,
	placeValidators,
	targetValues,
	toPlaceDraft,
	toVisitPlaceDraft,
} from './place-form'
import { placeGeocoder } from './place-geocoder'
import { PlacePhotosField } from './place-photos-field'
import { PlaceReviewField } from './place-review-field'
import { PlaceSearchField } from './place-search-field'
import { PlaceTripField, PlaceVisitedField } from './place-trip-field'
import { PlaceWebsiteField } from './place-website-field'
import { useToday } from './use-today'

/** Props for {@link PlaceFormDrawer}. */
export type PlaceFormDrawerProps = {
	/**
	 * What the drawer writes, or `null` to close it. It seeds the fields, picks
	 * which fields show, and names the panel.
	 */
	target: PlaceFormTarget | null
	onOpenChange: (open: boolean) => void
	/**
	 * Writes the place, with the visit of the form in it where the target is a
	 * visit. A rejection leaves the drawer open with the entry intact, and the
	 * drawer shows the message of the error.
	 */
	onSubmit: (draft: PlaceDraft) => Promise<unknown>
	/** The trips of the reader, which the Trip field of a visit picks from. */
	trips: readonly Trip[]
}

/**
 * What the panel calls itself and what its submit button says for a target, and
 * whether the target changes a record on file.
 */
function targetWords(target: PlaceFormTarget): { title: string; submit: string; editing: boolean } {
	if (target.kind === 'visit') {
		return target.visit === null
			? { title: 'Add visit', submit: 'Add visit', editing: false }
			: { title: 'Edit visit', submit: 'Save visit', editing: true }
	}

	return target.place === null
		? { title: 'Add place', submit: 'Add place', editing: false }
		: { title: 'Edit place', submit: 'Save changes', editing: true }
}

/** A key that changes with the record that a target writes. */
function targetKey(target: PlaceFormTarget): string {
	return target.kind === 'visit'
		? `visit:${target.place.id}:${target.visit?.id ?? 'new'}`
		: `place:${target.place?.id ?? 'new'}:${target.trip?.id ?? ''}`
}

/**
 * The {@link FormDrawer} that writes a place — a new one, or an edit of one on
 * record — or one visit to a place on record.
 *
 * One form for all of them, because each produces the same record: only what
 * the fields start as, which fields show, and what the panel calls itself
 * differ. A new place shows the fields of the place and of its first visit, an
 * edit of a place the fields of the place, and a visit the fields of the visit.
 * A second form would repeat the same fields and the same validators, and the
 * two would have to be kept in step by hand.
 *
 * The search field resolves a business name to its address and position, so a
 * place reaches the map without the reader ever typing coordinates — see
 * {@link PlaceSearchField} for what one pick fills in. For a place that the
 * search does not find, the reader types the address, and a submit finds the
 * position from it. Where the geocoder does not find the address either, the
 * reader types the latitude and the longitude ({@link PlaceAddressField}).
 *
 * The Trip field shows among the visit fields while the reader has a trip.
 */
export function PlaceFormDrawer({ target, onOpenChange, onSubmit, trips }: PlaceFormDrawerProps) {
	const seed = useHeldTarget(target) ?? { kind: 'place', place: null }

	const { today, zone } = useToday()

	const { title, submit, editing } = targetWords(seed)

	// A new place takes its first visit with it. An edit of a place leaves its
	// visits to their own menu, and a visit has no fields of the place.
	const placeFields = seed.kind === 'place'

	const visitFields = seed.kind === 'visit' || seed.place === null

	return (
		<FormDrawer<PlaceValues>
			open={target !== null}
			onOpenChange={onOpenChange}
			title={title}
			// A visit names its place under the title, because the form shows no
			// field of the place.
			subtitle={seed.kind === 'visit' ? seed.place.name : undefined}
			submit={submit}
			editing={editing}
			// The zone of `today` is in the key, so a form that the address opens
			// takes the day of the reader after hydration (`useToday`).
			formKey={`${targetKey(seed)}:${zone}`}
			defaultValues={targetValues(seed, today)}
			validate={placeValidators(trips)}
			onSubmit={async (values) => {
				if (seed.kind === 'visit') {
					await onSubmit(
						toVisitPlaceDraft(values, seed.place, seed.visit, await photoKeys(values.photos)),
					)

					return undefined
				}

				const located = await locatePlace(
					values,
					placeGeocoder,
					AbortSignal.timeout(LOCATE_TIMEOUT_MS),
				)

				if (located === null) {
					return {
						fieldErrors: {
							address:
								'That address was not found. Check it, search for the place, or input its coordinates.',
						},
					}
				}

				await onSubmit(toPlaceDraft(values, located, await photoKeys(values.photos), seed.place))

				return undefined
			}}
		>
			{placeFields ? (
				<>
					{/* The search leads across both columns, because it is the field
					    that fills the others. */}
					<div className="sm:col-span-2">
						<PlaceSearchField />
					</div>

					<Field>
						<Label>Name</Label>

						<Input name="name" placeholder="What is it called?" />

						<Message name="name" />
					</Field>

					<PlaceCategoryField />

					<div className="sm:col-span-2">
						<PlaceAddressField />
					</div>

					<div className="sm:col-span-2">
						<PlaceWebsiteField />
					</div>
				</>
			) : null}

			{visitFields ? (
				<>
					<div className="sm:col-span-2">
						<PlaceVisitedField trips={trips} />
					</div>

					{trips.length > 0 ? (
						<div className="sm:col-span-2">
							<PlaceTripField trips={trips} />
						</div>
					) : null}

					<div className="sm:col-span-2">
						<PlacePhotosField />
					</div>

					<Field className="sm:col-span-2">
						<Label as="span">Rating</Label>

						<Rating name="rating" size="lg" step={0.5} />
					</Field>

					<PlaceReviewField />
				</>
			) : null}
		</FormDrawer>
	)
}
