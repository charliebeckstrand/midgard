'use client'

import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Heading } from 'ui/heading'
import { Stack } from 'ui/structure/stack'
import type { MapRecord, Place, PlaceCategory } from '../../types'
import { isTrip, recordCount, sortTrips } from '../../utilities/places-trips'
import { type PlaceOrder, sortPlaces } from '../../utilities/places-visits'
import {
	type PlaceActions,
	PlaceMenu,
	placeMenuItems,
	type TripActions,
	tripMenuItems,
	type VisitActions,
} from '../place-menu'
import { PlaceDetails, PlaceList, type PlaceListProps, type TripLink } from '../place-summary'
import { SummaryDrawer, type SummaryFrame } from '../summary-drawer'
import { TripDetails, TripList } from '../trip-summary'

/** Props for {@link NearbyDrawer}. See {@link SummaryFrame} for the frame. */
export type NearbyDrawerProps = SummaryFrame<MapRecord> & {
	/**
	 * What the menus of an open place and of its visits do. The panels and the
	 * confirmations are the caller's.
	 */
	placeActions: PlaceActions & VisitActions
	/** What the menu of an open trip does. */
	tripActions: TripActions
	/** The way from a visit to its trip. */
	tripLink: TripLink
	/** The places of each trip, by the trip's id, newest visit first. */
	placesByTrip: ReadonlyMap<string, readonly Place[]>
	/** Opens a place of an open trip, as a step the reader can walk back out of. */
	onOpenPlace: (place: Place) => void
}

/** The empty list of a trip with no places yet, held so its identity is stable. */
const NO_PLACES: readonly Place[] = []

/** The places of a list of records, in their order. */
function placesOf(records: readonly MapRecord[]): Place[] {
	return records.filter((record): record is Place => !isTrip(record))
}

/** The count that names a list with no region. Module-scope, because the trail is keyed on it. */
function countRecords(shown: readonly MapRecord[]): string {
	const trips = shown.filter(isTrip).length

	return recordCount(shown.length - trips, trips)
}

/** One kind of a list, under its heading where the list holds both kinds. */
function NearbySection({ heading, children }: { heading: string | null; children: ReactNode }) {
	return (
		<Stack gap="md">
			{heading === null ? null : (
				<Heading level={3} size="sm">
					{heading}
				</Heading>
			)}

			{children}
		</Stack>
	)
}

/** Props for {@link NearbyList}. */
type NearbyListProps = Omit<PlaceListProps, 'shown' | 'spanned'> & {
	/** Every record of the list, before the category picker narrows the places. */
	list: readonly MapRecord[]
	/** The records that the category picker lets through, the places first. */
	shown: readonly MapRecord[]
	placesByTrip: ReadonlyMap<string, readonly Place[]>
}

/**
 * The body of the drawer over a group: its places with their pickers, and its
 * trips. Where the group holds both kinds, each list is under its own heading,
 * the places first.
 */
function NearbyList({ list, shown, placesByTrip, onOpen, ...pickers }: NearbyListProps) {
	const listedPlaces = placesOf(list)

	const trips = shown.filter(isTrip)

	const both = listedPlaces.length > 0 && trips.length > 0

	return (
		<Stack gap="xl">
			{listedPlaces.length === 0 ? null : (
				<NearbySection heading={both ? 'Places' : null}>
					<PlaceList
						{...pickers}
						shown={placesOf(shown)}
						// How many categories the places span. A picker over one of them
						// offers the reader a choice between everything and everything, so
						// it is not offered.
						spanned={new Set(listedPlaces.map((place) => place.category)).size}
						onOpen={onOpen}
					/>
				</NearbySection>
			)}

			{trips.length === 0 ? null : (
				<NearbySection heading={both ? 'Trips' : null}>
					<TripList shown={trips} placesByTrip={placesByTrip} onOpen={onOpen} />
				</NearbySection>
			)}
		</Stack>
	)
}

/**
 * The summary drawer over what a point of the map stands for: one place, one
 * trip, or a list of the places and the trips of the point. A place list has a
 * category picker and a sort picker; trips list newest first. See
 * {@link SummaryDrawer} for the trail, the steps, and the size.
 */
export function NearbyDrawer({
	placeActions,
	tripActions,
	tripLink,
	placesByTrip,
	onOpenPlace,
	...frame
}: NearbyDrawerProps) {
	// Which categories the places are narrowed to; empty is unfiltered. Held here
	// rather than lifted, because it narrows this panel's list and nothing else —
	// the bar over the map already narrows the map. Held here rather than in the
	// list, because the list unmounts while a record is open, and the reader comes
	// back to the list they narrowed.
	const [categories, setCategories] = useState<PlaceCategory[]>([])

	// The order of the places. Alphabetical by default, and back to it on a new
	// pick, the same as the categories.
	const [order, setOrder] = useState<PlaceOrder>('name')

	// Which records the group stands for, as one string. It is what a new pick
	// changes and what a re-read of the same pick does not: an edit or a refetch
	// hands back an equal group in a new array, and resetting on that identity
	// would throw a reader out of the row they had opened.
	const groupKey = frame.items.map((record) => record.id).join('|')

	// Returns the list's own pickers to their start. Keyed on the pick alone — the
	// reset belongs to a new pick, not to every re-read — and skipped while
	// closing, or the list would change under its own exit.
	useEffect(() => {
		if (groupKey === '') return

		setCategories([])

		setOrder('name')
	}, [groupKey])

	// What the list narrows to: the places that the category picker lets through,
	// in the picked order, then the trips, newest first. No category admits every
	// place: a reader who clears the last category means to stop filtering, not
	// to empty the panel.
	const narrow = useCallback(
		(list: readonly MapRecord[]): MapRecord[] => {
			const places = placesOf(list)

			const picked =
				categories.length === 0
					? places
					: places.filter((place) => categories.includes(place.category))

			return [...sortPlaces(picked, order), ...sortTrips(list.filter(isTrip))]
		},
		[categories, order],
	)

	return (
		<SummaryDrawer<MapRecord>
			{...frame}
			narrow={narrow}
			count={countRecords}
			menu={(record) => (
				<PlaceMenu
					items={
						isTrip(record)
							? tripMenuItems(record, tripActions)
							: placeMenuItems(record, placeActions)
					}
					aria-label={`Actions for ${record.name}`}
				/>
			)}
			details={(record) =>
				isTrip(record) ? (
					<TripDetails
						trip={record}
						places={placesByTrip.get(record.id) ?? NO_PLACES}
						onOpenPlace={onOpenPlace}
					/>
				) : (
					<PlaceDetails place={record} actions={placeActions} tripLink={tripLink} />
				)
			}
			list={({ list, shown, open }) => (
				<NearbyList
					list={list}
					shown={shown}
					placesByTrip={placesByTrip}
					categories={categories}
					onCategoriesChange={setCategories}
					order={order}
					onOrderChange={setOrder}
					onOpen={open}
				/>
			)}
		/>
	)
}
