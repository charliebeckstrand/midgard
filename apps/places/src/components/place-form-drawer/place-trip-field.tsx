'use client'

import { DatePicker, DatePickerSkeleton } from 'ui/date-picker'
import { Field, Label, Message } from 'ui/fieldset'
import { useFormValue } from 'ui/form'
import { Listbox, ListboxDescription, ListboxLabel, ListboxOption } from 'ui/listbox'
import type { Trip } from '../../types'
import { fromDay } from '../../utilities/places-filter'
import { sortTrips } from '../../utilities/places-trips'
import { DaySpan } from '../summary-drawer/summary-parts'

/**
 * The trip that a visit was on, newest trip first. It is the one control that
 * puts a place on a trip. Clearable, because most visits are on no trip.
 *
 * The field holds the id of the trip, so a refetch of the trips does not part
 * the picked value from its option.
 */
export function PlaceTripField({ trips }: { trips: readonly Trip[] }) {
	return (
		<Field>
			<Label>Trip</Label>

			<Listbox<string>
				name="tripId"
				placeholder="No trip"
				clearable
				displayValue={(id) => trips.find((trip) => trip.id === id)?.name ?? ''}
			>
				{sortTrips(trips).map((trip) => (
					<ListboxOption key={trip.id} value={trip.id}>
						<ListboxLabel>{trip.name}</ListboxLabel>

						<ListboxDescription>
							<DaySpan from={trip.startsOn} to={trip.endsOn} />
						</ListboxDescription>
					</ListboxOption>
				))}
			</Listbox>

			<Message name="tripId" />
		</Field>
	)
}

/** Props for {@link PlaceVisitedField}. */
export type PlaceVisitedFieldProps = {
	trips: readonly Trip[]
	/**
	 * Whether the day of a new visit waits for the day of the reader
	 * (`useToday`). The field then shows a skeleton, not a day that can change.
	 */
	pending: boolean
}

/**
 * The day of a visit. While the Trip field names a trip, the calendar offers
 * the days of the trip alone. A day picked before the trip stays as it is, and
 * the validator says when it is not a day of the trip.
 */
export function PlaceVisitedField({ trips, pending }: PlaceVisitedFieldProps) {
	const { value: tripId } = useFormValue<string>('tripId', {})

	const trip = trips.find((held) => held.id === tripId)

	return (
		<Field>
			<Label>Visited</Label>

			{pending ? (
				<DatePickerSkeleton className="w-full" />
			) : (
				<DatePicker
					name="visitedAt"
					min={trip === undefined ? undefined : fromDay(trip.startsOn)}
					max={trip === undefined ? undefined : fromDay(trip.endsOn)}
					className="w-full"
				/>
			)}

			<Message name="visitedAt" />
		</Field>
	)
}
