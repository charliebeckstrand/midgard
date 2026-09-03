'use client'

import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Badge } from 'ui/badge'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Grid, type GridColumn } from 'ui/modules/grid'
import { Rating } from 'ui/rating'
import { Sheet, SheetBody, SheetClose, SheetTitle } from 'ui/sheet'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { CATEGORY_BY_VALUE, categoryLabel } from '../../constants'
import type { Place } from '../../types'
import { fromDay } from '../../utilities/places-filter'
import { openingRegion, regionsHolding, stateLabel } from '../../utilities/places-view'

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
	stateByPlace,
	region,
	onOpen,
}: PlacesIndexProps) {
	const [picked, setPicked] = useState<string | null>(null)

	const regions = useMemo(() => regionsHolding(places, regionByPlace), [places, regionByPlace])

	const [wasOpen, setWasOpen] = useState(open)

	// Seeded on the open and only then. Keyed on a render-time comparison rather
	// than an effect, so the first frame carries the pick instead of showing every
	// region for one paint — and so a re-render while the panel is up (a place
	// added, the bar narrowed) never takes back a pick the reader made.
	if (open !== wasOpen) {
		setWasOpen(open)

		if (open) setPicked(openingRegion(region, regions))
	}
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
		[regionByPlace, stateByPlace],
	)

	// Narrowed before the grid sees it, so the grid's own search, sort and count
	// are all of the same set the reader is looking at. A copy either way, because
	// the grid sorts and filters what it is handed and the app's list is read by
	// the map at the same time.
	const rows = useMemo(
		() =>
			picked === null
				? [...places]
				: places.filter((place) => regionByPlace.get(place.id) === picked),
		[places, picked, regionByPlace],
	)

	return (
		// As wide as the table and no wider. Six or seven columns in a panel sized by
		// a step is a table the reader scrolls sideways to read one row of, and this
		// panel exists to be scanned; a step wide enough for the widest case is a
		// panel of empty column in every other.
		//
		// No grip, because there is nothing left for it to say: the panel is already
		// the width of what it holds, and a drag could only make the table scroll or
		// pad it with space.
		<Sheet glass open={open} onOpenChange={onOpenChange} width="fit" aria-label="All places">
			{/* The title and the close on one line, laid out here rather than through
			    the header slot: that slot stacks a title over a description, which puts
			    the close under the title instead of opposite it. The form drawer's
			    header is built the same way, so the two panels answer the same corner. */}
			<Flex justify="between" align="center" gap="md" className="px-6 pt-6">
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
				{/* `maxHeight="fill"` rather than a measured one: the grid takes the box it is
				    given and flexes its scroll region to the remainder, so the rows
				    scroll under a sticky header without this file having to know the
				    height of the title row above it or the panel's own insets.

				    Virtualized for the same reason the map clusters: a reader who has
				    been somewhere every week for five years has a list this panel must
				    not render whole. */}
				<Grid<Place>
					columns={columns}
					rows={rows}
					// The second filter, on the grid's own row across from its search: the
					// two do the same job, where under the panel's title this one read as
					// being about the panel. Only where there is a choice to make — with
					// every row in one region it would narrow to what is already shown.
					//
					// "All regions" rather than the bar's "All states", because this panel
					// names the column "Region" and answers in its own vocabulary.
					toolbar={
						regions.length > 1 ? (
							<Listbox<string>
								aria-label="Region"
								placeholder="All regions"
								clearable
								className="w-52"
								displayValue={(name) => name}
								value={picked}
								onValueChange={setPicked}
							>
								{regions.map((name) => (
									<ListboxOption key={name} value={name}>
										<ListboxLabel>{name}</ListboxLabel>
									</ListboxOption>
								))}
							</Listbox>
						) : null
					}
					// The panel is built around this table, so the table has to be what
					// states the width rather than what reads it. Both halves of that are
					// on the props themselves.
					width="fit"
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
