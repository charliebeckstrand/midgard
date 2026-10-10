'use client'

import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { Button } from 'ui/button'
import { Icon } from 'ui/icon'
import type { GridColumn } from 'ui/modules/grid'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import type { Place, Trip } from '../../types'
import { IndexSheet, locationColumns } from '../index-sheet'
import { PlaceMenu, type TripActions, tripMenuItems } from '../place-menu'
import { DaySpan } from '../summary-drawer'

/** Props for {@link TripsIndex}. */
export type TripsIndexProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** The trips to list: what the bar admits, as the map draws them. */
	trips: readonly Trip[]
	/** Which region holds each trip, by the trip's id. */
	regionByTrip: ReadonlyMap<string, string>
	/** Which state holds each trip, by the trip's id, or absent for no state column. */
	stateByTrip?: ReadonlyMap<string, string>
	/** The region the view is cut to, or `null` for the whole atlas. */
	region?: string | null
	/** The places of each trip, by the trip's id. */
	placesByTrip: ReadonlyMap<string, readonly Place[]>
	/** Opens one trip: the caller selects it and takes the map to it. */
	onOpen: (trip: Trip) => void
	/** What the menu of each row does. */
	actions: TripActions
}

/** The empty list of a trip with no places, held so its identity is stable. */
const NO_PLACES: readonly Place[] = []

/**
 * My trips: every trip as a row of an {@link IndexSheet}, with its region, its
 * days, its places, and its menu. It opens sorted by date, newest first, the
 * same order as the list of the trip drawer.
 */
export function TripsIndex({
	open,
	onOpenChange,
	trips,
	regionByTrip,
	stateByTrip,
	region,
	placesByTrip,
	onOpen,
	actions,
}: TripsIndexProps) {
	// Every column declares `value`, for the reason the columns of My places do:
	// the quick search and the sort read it.
	const columns = useMemo<GridColumn<Trip>[]>(
		() => [
			{ id: 'name', title: 'Name', value: (trip) => trip.name, cell: (trip) => trip.name },
			...locationColumns<Trip>(regionByTrip, stateByTrip),
			{
				id: 'dates',
				title: 'Dates',
				// Sorted by the first day, which is what "newest" means for a trip.
				value: (trip) => trip.startsOn,
				cell: (trip) => <DaySpan from={trip.startsOn} to={trip.endsOn} />,
			},
			{
				id: 'places',
				title: 'Places',
				// The number of places, and a button whose tooltip names each one,
				// as the Visits column of My places lists its dates.
				value: (trip) => placesByTrip.get(trip.id)?.length ?? 0,
				cell: (trip) => {
					const places = placesByTrip.get(trip.id) ?? NO_PLACES

					return (
						<Flex gap="xs" align="center">
							<span>{places.length}</span>

							{places.length === 0 ? null : (
								<Tooltip>
									<TooltipTrigger>
										<Button
											type="button"
											variant="bare"
											size="sm"
											aria-label={`Places of ${trip.name}`}
										>
											<Icon icon={<Info />} />
										</Button>
									</TooltipTrigger>

									<TooltipContent>
										<Stack gap="xs">
											{places.map((place) => (
												<span key={place.id}>{place.name}</span>
											))}
										</Stack>
									</TooltipContent>
								</Tooltip>
							)}
						</Flex>
					)
				},
			},
			{
				id: 'actions',
				title: <span className="sr-only">Actions</span>,
				// The width of the actions column of My places, for the same button.
				width: 54,
				actions: (trip) => (
					<PlaceMenu items={tripMenuItems(trip, actions)} aria-label={`Actions for ${trip.name}`} />
				),
			},
		],
		[regionByTrip, stateByTrip, placesByTrip, actions],
	)

	return (
		<IndexSheet<Trip>
			open={open}
			onOpenChange={onOpenChange}
			title="My trips"
			items={trips}
			regionByItem={regionByTrip}
			region={region}
			columns={columns}
			sort={{ defaultValue: [{ column: 'dates', direction: 'desc' }] }}
			searchPlaceholder="Find a trip"
			empty="No trips match."
			onOpen={onOpen}
		/>
	)
}
