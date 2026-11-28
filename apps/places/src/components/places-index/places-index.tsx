'use client'

import { useMemo } from 'react'
import { Badge } from 'ui/badge'
import type { GridColumn } from 'ui/modules/grid'
import { CATEGORY_BY_VALUE, categoryLabel } from '../../constants'
import type { Place } from '../../types'
import { ratedVisit } from '../../utilities/places-visits'
import { DayText } from '../day-text'
import { actionsColumn, CountCell, IndexSheet, locationColumns } from '../index-sheet'
import { type PlaceActions, placeMenuItems } from '../place-menu'
import { PlaceRating } from '../place-summary'

/** Props for {@link PlacesIndex}. */
export type PlacesIndexProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/**
	 * The places to list. It is what the bar admits rather than everything
	 * stored, so this panel and the map under it agree about what is in play.
	 */
	places: readonly Place[]
	/**
	 * Which region holds each place, by the place's id, for the column that says
	 * where one is.
	 *
	 * Taken inverted rather than as the grouping, because the app already holds it
	 * that way: the column asks this once per row, and inverting it here would be
	 * the same walk a second time.
	 */
	regionByPlace: ReadonlyMap<string, string>
	/**
	 * Which state holds each place, by the place's id, or absent for no state
	 * column at all.
	 *
	 * The column exists because the region above names the region of the atlas the
	 * map draws, and on the world that is the country: a reader who wants to know
	 * which state they were in is left one step coarser than they asked for.
	 *
	 * Absent is what keeps it from saying the same thing twice. Inside the United
	 * States the drawn region already is the state, so the column would print every
	 * state beside itself. The caller is what knows which atlas is drawn, so the
	 * caller decides whether this column has anything to add.
	 */
	stateByPlace?: ReadonlyMap<string, string>
	/**
	 * The region the view is cut to, or `null` for the whole atlas.
	 *
	 * The sheet opens on it where it holds rows, because the reader came from that
	 * projection and it is a narrowing they already made. Clearing the filter
	 * widens the table back to everything the bar admits.
	 */
	region?: string | null
	/** Opens one place: the caller selects it and takes the map to it. */
	onOpen: (place: Place) => void
	/** What the menu of each row does. */
	actions: PlaceActions
}

/**
 * My places: every place as a row of an {@link IndexSheet}, with its category,
 * its region, its visits, its rating, and its menu. It opens sorted by name.
 */
export function PlacesIndex({
	open,
	onOpenChange,
	places,
	regionByPlace,
	stateByPlace,
	region,
	onOpen,
	actions,
}: PlacesIndexProps) {
	// Every column declares `value`, because that is what the grid's quick search
	// reads and what it sorts by. A column with only a `cell` renders but cannot
	// be found, which for the name, the region, and the category is the whole
	// point of the panel.
	const columns = useMemo<GridColumn<Place>[]>(
		() => [
			{ id: 'name', title: 'Name', value: (place) => place.name, cell: (place) => place.name },
			{
				id: 'category',
				title: 'Category',
				// Sorted and searched by the name the reader reads, never by the stored
				// value: they are looking for "Food", and `food` is what the file says.
				value: (place) => categoryLabel(place.category),
				cell: (place) => {
					const category = CATEGORY_BY_VALUE.get(place.category)

					return category ? <Badge color={category.color}>{category.label}</Badge> : null
				},
			},
			...locationColumns<Place>(regionByPlace, stateByPlace),
			{
				id: 'visits',
				title: 'Visits',
				// The number of visits, and the date of each one, newest first.
				value: (place) => place.visits.length,
				cell: (place) => (
					<CountCell count={place.visits.length} label={`Visit dates for ${place.name}`}>
						{place.visits.map((visit) => (
							<DayText key={visit.id} value={visit.visitedAt} />
						))}
					</CountCell>
				),
			},
			{
				id: 'rating',
				title: 'Rating',
				// The score of the newest rated visit, which is what the place is like
				// now. The tooltip of the stars gives the day of that visit.
				value: (place) => ratedVisit(place)?.rating ?? 0,
				cell: (place) => <PlaceRating place={place} />,
			},
			actionsColumn<Place>(
				(place) => placeMenuItems(place, actions),
				(place) => place.name,
			),
		],
		[regionByPlace, stateByPlace, actions],
	)

	return (
		<IndexSheet<Place>
			open={open}
			onOpenChange={onOpenChange}
			title="My places"
			items={places}
			regionByItem={regionByPlace}
			region={region}
			columns={columns}
			sort={{ defaultValue: [{ column: 'name', direction: 'asc' }] }}
			searchPlaceholder="Find a place"
			empty="No places match."
			onOpen={onOpen}
		/>
	)
}
