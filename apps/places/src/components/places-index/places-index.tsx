'use client'

import { Info } from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { DateTime } from 'ui/date-time'
import { Icon } from 'ui/icon'
import type { GridColumn } from 'ui/modules/grid'
import { Rating } from 'ui/rating'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { CATEGORY_BY_VALUE, categoryLabel } from '../../constants'
import type { Place } from '../../types'
import { DAY_FORMAT } from '../../utilities/places-filter'
import { stateLabel } from '../../utilities/places-view'
import { latestVisit } from '../../utilities/places-visits'
import { IndexSheet } from '../index-sheet'
import { type PlaceActions, PlaceMenu, placeMenuItems } from '../place-menu'

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
	 * Which state holds each place, by the place's id — or absent, for no state
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
	// be found — which for the name, the region, and the category is the whole
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
			{
				id: 'region',
				title: 'Region',
				value: (place) => regionByPlace.get(place.id) ?? '',
				cell: (place) => regionByPlace.get(place.id) ?? <Text tone="warning">Unplaced</Text>,
			},
			...(stateByPlace === undefined
				? []
				: [
						{
							id: 'state',
							title: 'State',
							// The state as the app settles it — see `stateLabel` — and not the
							// stored field: the drawn geometry answers ahead of it there.
							//
							// Empty where nothing answers — a country that names no subdivision,
							// or a place recorded before one was stored — rather than a warning.
							// The region beside it already says where the place is; a state is
							// the finer answer and not a missing one.
							//
							// Both accessors are stated, for two different reasons. A column with
							// no `cell` renders an empty cell, and a column with no `value`
							// resolves against the row's own field — which here is the geocoder's
							// name alone, and would sort and search over the geometry's answer.
							value: (place) => stateLabel(stateByPlace, place),
							cell: (place) => stateLabel(stateByPlace, place),
						} satisfies GridColumn<Place>,
					]),
			{
				id: 'city',
				title: 'City',
				// The `cell` is stated for the reason the state column's is: a column
				// without one renders an empty cell. The `value` restates the row's own
				// field, which the column id would have resolved to by itself.
				value: (place) => place.city ?? '',
				cell: (place) => place.city ?? '',
			},
			{
				id: 'visits',
				title: 'Visits',
				// The number of visits, and a button whose tooltip lists the date of
				// each one, newest first. The tooltip opens on a hover, and on a tap
				// on touch. The grid leaves a click on the button to the button, so it
				// does not open the place.
				value: (place) => place.visits.length,
				cell: (place) => (
					<Flex gap="xs" align="center">
						<span>{place.visits.length}</span>

						<Tooltip>
							<TooltipTrigger>
								<Button
									type="button"
									variant="bare"
									size="sm"
									aria-label={`Visit dates for ${place.name}`}
								>
									<Icon icon={<Info />} />
								</Button>
							</TooltipTrigger>

							<TooltipContent>
								<Stack gap="xs">
									{place.visits.map((visit) => (
										<DateTime key={visit.id} value={visit.visitedAt} format={DAY_FORMAT} />
									))}
								</Stack>
							</TooltipContent>
						</Tooltip>
					</Flex>
				),
			},
			{
				id: 'rating',
				title: 'Rating',
				// The score of the newest visit, which is what the place is like now.
				value: (place) => latestVisit(place).rating,
				cell: (place) => {
					const { rating } = latestVisit(place)

					return rating > 0 ? <Rating readOnly value={rating} size="sm" /> : null
				},
			},
			{
				id: 'actions',
				// The ellipsis says what the column is, so the header names it for a
				// screen reader alone.
				title: <span className="sr-only">Actions</span>,
				// The grid does not size an `actions` column to its content. Without a
				// `width`, the column takes the default of 150px. This width holds the
				// ellipsis button (38px at the `md` step) and the cell padding (8px on
				// each side).
				width: 54,
				actions: (place) => (
					<PlaceMenu
						items={placeMenuItems(place, actions)}
						aria-label={`Actions for ${place.name}`}
					/>
				),
			},
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
