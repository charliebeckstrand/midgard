'use client'

import { DatePicker } from 'ui/date-picker'
import { Field, Label, Message } from 'ui/fieldset'
import { Input } from 'ui/input'
import type { Place, TripDraft, TripStop } from '../../types'
import { FormDrawer, useHeldTarget } from './form-drawer'
import { photoKeys } from './photo-keys'
import { PlacePhotosField } from './place-photos-field'
import {
	type TripFormTarget,
	type TripValues,
	toTripDraft,
	toTripStops,
	tripValidators,
	tripValues,
} from './trip-form'
import { TripLocationField } from './trip-location-field'
import { TripStopsField } from './trip-stops-field'

/** Props for {@link TripFormDrawer}. */
export type TripFormDrawerProps = {
	/** What the drawer writes, or `null` to close it. */
	target: TripFormTarget | null
	onOpenChange: (open: boolean) => void
	/**
	 * Writes the trip, with the stops of a new one. A rejection leaves the
	 * drawer open with the entry intact, and the drawer shows the message of the
	 * error, such as new days that leave a visit outside the trip.
	 */
	onSubmit: (draft: TripDraft, stops: TripStop[]) => Promise<unknown>
	/** The places on record, which lead the search of each row of the Places field. */
	places: readonly Place[]
}

/** The target of a closed drawer, which seeds nothing. */
const NEW_TRIP: TripFormTarget = { trip: null }

/**
 * The {@link FormDrawer} that writes a trip: its location, its name, its days,
 * and its photos. A new trip also takes its places, all at once; an edit shows
 * the fields of the trip alone, as an edit of a place hides the fields of its
 * visits.
 *
 * The location is a search for a town, a city, a region, or a country, not an
 * address: a trip often goes to a city before it has an address in it.
 */
export function TripFormDrawer({ target, onOpenChange, onSubmit, places }: TripFormDrawerProps) {
	const seed = useHeldTarget(target) ?? NEW_TRIP

	const editing = seed.trip !== null

	return (
		<FormDrawer<TripValues>
			open={target !== null}
			onOpenChange={onOpenChange}
			title={editing ? 'Edit trip' : 'Add trip'}
			submit={editing ? 'Save changes' : 'Add trip'}
			editing={editing}
			formKey={`trip:${seed.trip?.id ?? 'new'}`}
			defaultValues={tripValues(seed)}
			validate={tripValidators}
			onSubmit={async (values) => {
				await onSubmit(
					toTripDraft(values, await photoKeys(values), seed.trip),
					toTripStops(values.stops),
				)

				return undefined
			}}
		>
			<div className="sm:col-span-2">
				<TripLocationField />
			</div>

			<Field>
				<Label>Name</Label>

				<Input name="name" placeholder="What is the trip called?" />

				<Message name="name" />
			</Field>

			<Field>
				<Label>Dates</Label>

				<DatePicker name="days" range className="w-full" />

				<Message name="days" />
			</Field>

			<div className="sm:col-span-2">
				<PlacePhotosField />
			</div>

			{editing ? null : (
				<div className="sm:col-span-2">
					<TripStopsField places={places} />
				</div>
			)}
		</FormDrawer>
	)
}
