'use client'

import { X } from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from 'ui/badge'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { Grid, type GridColumn } from 'ui/modules/grid'
import { Rating } from 'ui/rating'
import { Sheet, SheetBody, SheetClose, SheetTitle } from 'ui/sheet'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { CATEGORY_BY_VALUE, categoryLabel } from '../../constants'
import type { Place } from '../../types'
import { fromDay } from '../../utilities/places-filter'

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
	/** Opens one place: the caller selects it and takes the map to it. */
	onOpen: (place: Place) => void
}

/**
 * Every place as a row, over the map.
 *
 * The map answers "what is near here" and cannot answer "where was that place
 * called Clearwater" — a reader with a hundred places had to remember which dot
 * was which, and a place whose region they had forgotten was not findable at
 * all. This panel is the other index into the same set.
 *
 * It lists what the filter bar admits, not everything stored, so the two
 * surfaces never disagree about what is in play. Its own search finds within
 * that, which is why the bar keeps no search of its own.
 *
 * A row opens the place exactly as its dot does — the same drawer, over the same
 * map — and takes the map to it, because a reader who picks a place they cannot
 * see on the frame they are on has asked to go there.
 */
export function PlacesIndex({
	open,
	onOpenChange,
	places,
	regionByPlace,
	onOpen,
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
				cell: (place) => regionByPlace.get(place.id) ?? <Text severity="warning">Unplaced</Text>,
			},
			{
				id: 'city',
				title: 'City',
				// The `cell` is stated rather than left to the column id, which resolves
				// against the row field and rendered nothing here.
				value: (place) => place.city ?? '',
				cell: (place) => place.city ?? '',
			},
			{
				id: 'visited',
				title: 'Visited',
				// The stored day sorts and the local rendering shows. Sorted on the
				// rendered date, 2026-01-05 and 2026-05-01 order by the reader's own
				// notation rather than by when they went.
				value: (place) => place.visitedAt,
				cell: (place) => fromDay(place.visitedAt).toLocaleDateString(),
			},
			{
				id: 'rating',
				title: 'Rating',
				value: (place) => place.rating,
				cell: (place) =>
					place.rating > 0 ? <Rating readOnly value={place.rating} size="sm" /> : null,
			},
		],
		[regionByPlace],
	)

	// A copy, because the grid sorts and filters what it is handed and the app's
	// list is read by the map at the same time.
	const rows = useMemo(() => [...places], [places])

	return (
		// Wide, because six columns in a narrow panel is a table the reader scrolls
		// sideways to read one row of — and this panel exists to be scanned. It is a
		// max-width, so a phone still gets the whole screen and the grid's own
		// horizontal scroll takes what is left over.
		//
		// The handle is what makes that a starting point rather than a decision: a
		// reader comparing two long region names pulls the panel wider, and one
		// checking a name against the map pushes it back.
		<Sheet glass handle open={open} onOpenChange={onOpenChange} width="4xl" aria-label="All places">
			{/* The title and the close on one line, laid out here rather than through
			    the header slot: that slot stacks a title over a description, which puts
			    the close under the title instead of opposite it. The form drawer's
			    header is built the same way, so the two panels answer the same corner. */}
			<Flex justify="between" align="center" className="px-6 pt-6">
				<SheetTitle className="p-0">All places</SheetTitle>

				<SheetClose>
					<ToggleIconButton icon={<Icon icon={<X />} />} aria-label="Close" />
				</SheetClose>
			</Flex>

			{/* `min-h-0` so the body is the box the grid fills rather than one that
			    grows with its rows; the panel's own height then bounds the table.
			    `pb-6` sits here rather than on the grid, so the inset is outside the
			    scroll region and the last row does not stop short of the edge. */}
			<SheetBody className="min-h-0 pb-6">
				{/* `fill` rather than a measured height: the grid takes the box it is
				    given and flexes its scroll region to the remainder, so the rows
				    scroll under a sticky header without this file having to know the
				    height of the title row above it or the panel's own insets.

				    Virtualized for the same reason the map clusters: a reader who has
				    been somewhere every week for five years has a list this panel must
				    not render whole. */}
				<Grid<Place>
					columns={columns}
					rows={rows}
					getKey={(place) => place.id}
					search={{ placeholder: 'Find a place' }}
					sort={{ defaultValue: [{ column: 'visited', direction: 'desc' }] }}
					onRowClick={onOpen}
					virtualize
					maxHeight="fill"
					hover
					empty={<Text>No places match.</Text>}
					className="h-full"
				/>
			</SheetBody>
		</Sheet>
	)
}
