'use client'

import { CalendarDays, MapPin } from 'lucide-react'
import { Divider } from 'ui/divider'
import { Heading } from 'ui/heading'
import { List } from 'ui/list'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import type { Place, Trip } from '../../types'
import { placeCount } from '../../utilities/places-trips'
import { PlaceRow } from '../place-summary/place-row'
import { DaySpan, SummaryFact, SummaryPhotos, SummaryRow } from '../summary-drawer'

/**
 * The body of the panel over one trip: its destination and its days, its
 * photos, and its places. A place row opens that place, so the browser's Back
 * button returns to the trip.
 */
export function TripDetails({
	trip,
	places,
	onOpenPlace,
}: {
	trip: Trip
	places: readonly Place[]
	onOpenPlace: (place: Place) => void
}) {
	return (
		<Stack gap="md" className="pb-6">
			<Stack gap="md">
				<SummaryFact icon={<MapPin />}>
					<Text className="truncate">{trip.address}</Text>
				</SummaryFact>

				<SummaryFact icon={<CalendarDays />}>
					<Text>
						<DaySpan from={trip.startsOn} to={trip.endsOn} />
					</Text>
				</SummaryFact>
			</Stack>

			{trip.photos.length > 0 ? <SummaryPhotos photos={trip.photos} alt={trip.name} /> : null}

			<Divider className="my-2" />

			<Heading level={3} size="sm">
				Places
			</Heading>

			{places.length === 0 ? (
				<Text tone="muted">No places on this trip yet.</Text>
			) : (
				<List items={[...places]} sortable={false} getKey={(place) => place.id}>
					{(place) => <PlaceRow place={place} onOpen={() => onOpenPlace(place)} />}
				</List>
			)}
		</Stack>
	)
}

/**
 * The trips of a group: one row per trip, in the order given, with its days and
 * its number of places.
 */
export function TripList({
	shown,
	placesByTrip,
	onOpen,
}: {
	shown: readonly Trip[]
	placesByTrip: ReadonlyMap<string, readonly Place[]>
	onOpen: (id: string) => void
}) {
	return (
		<List items={[...shown]} sortable={false} virtual getKey={(trip) => trip.id}>
			{(trip) => (
				<SummaryRow
					name={trip.name}
					meta={
						<>
							<Text as="span" tone="muted">
								<DaySpan from={trip.startsOn} to={trip.endsOn} />
							</Text>

							<Text as="span" tone="muted">
								{placeCount(placesByTrip.get(trip.id)?.length ?? 0)}
							</Text>
						</>
					}
					onOpen={() => onOpen(trip.id)}
				/>
			)}
		</List>
	)
}
