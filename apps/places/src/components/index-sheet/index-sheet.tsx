'use client'

import { MapIcon, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Icon } from 'ui/icon'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Grid, type GridColumn, type GridProps } from 'ui/modules/grid'
import { Sheet, SheetBody, SheetClose, SheetPanel, SheetTitle } from 'ui/sheet'
import { Flex } from 'ui/structure/flex'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import type { Located } from '../../types'
import { openingRegion, regionsHolding } from '../../utilities/places-view'

/** Props for {@link IndexSheet}. */
export type IndexSheetProps<T extends Located> = {
	open: boolean
	onOpenChange: (open: boolean) => void
	/** The name of the sheet, the same as the menu item that opens it. */
	title: string
	/**
	 * The records to list. It is what the bar admits rather than everything
	 * stored, so this panel and the map under it agree about what is in play.
	 */
	items: readonly T[]
	/**
	 * Which region holds each record, by the record's id, for the region picker.
	 *
	 * Taken inverted rather than as the grouping, because the app already holds it
	 * that way: the picker asks this once per row, and inverting it here would be
	 * the same walk a second time.
	 */
	regionByItem: ReadonlyMap<string, string>
	/**
	 * The region the view is cut to, or `null` for the whole atlas.
	 *
	 * The sheet opens on it where it holds rows, because the reader came from that
	 * projection and it is a narrowing they already made. Clearing the filter
	 * widens the table back to everything the bar admits.
	 */
	region?: string | null
	/** The columns of the grid. */
	columns: GridColumn<T>[]
	/** The order the grid opens in. */
	sort: GridProps<T>['sort']
	/** The placeholder of the search of the grid. */
	searchPlaceholder: string
	/** What the grid says when no row matches. */
	empty: string
	/** Opens one record: the caller selects it and takes the map to it. */
	onOpen: (item: T) => void
}

/**
 * Every record of one kind as a row, over the map.
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
 * A row opens the record exactly as its dot does — the same drawer, over the
 * same map — and takes the map to it, because a reader who picks a record they
 * cannot see on the frame they are on has asked to go there.
 */
export function IndexSheet<T extends Located>({
	open,
	onOpenChange,
	title,
	items,
	regionByItem,
	region,
	columns,
	sort,
	searchPlaceholder,
	empty,
	onOpen,
}: IndexSheetProps<T>) {
	const [picked, setPicked] = useState<string | null>(null)

	const regions = useMemo(() => regionsHolding(items, regionByItem), [items, regionByItem])

	const [wasOpen, setWasOpen] = useState(open)

	// Seeded on the open and only then. Keyed on a render-time comparison rather
	// than an effect, so the first frame carries the pick instead of showing every
	// region for one paint — and so a re-render while the panel is up (a record
	// added, the bar narrowed) never takes back a pick the reader made.
	if (open !== wasOpen) {
		setWasOpen(open)

		if (open) setPicked(openingRegion(region, regions))
	}

	// Narrowed before the grid sees it, so the grid's own search, sort and count
	// are all of the same set the reader is looking at. The grid reads its rows
	// and never changes them, so the whole list goes in as it is.
	const rows = useMemo(
		() => (picked === null ? items : items.filter((item) => regionByItem.get(item.id) === picked)),
		[items, picked, regionByItem],
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
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetPanel glass width="fit" aria-label={title}>
				{/* The title and the close on one line, laid out here rather than through
			    the header slot: that slot stacks a title over a description, which puts
			    the close under the title instead of opposite it. The form drawer's
			    header is built the same way, so the two panels answer the same corner. */}
				<Flex justify="between" align="center" gap="md" className="px-6 pt-6">
					<SheetTitle className="p-0">{title}</SheetTitle>

					<SheetClose>
						<ToggleIconButton icon={<Icon icon={<X />} />} aria-label="Close" />
					</SheetClose>
				</Flex>

				{/* `min-h-0` so the body is the box the grid fills rather than one that
			    grows with its rows; the panel's own height then bounds the table.
			    The footer under it, with the Close button, holds the bottom inset. */}
				<SheetBody className="min-h-0">
					{/* `maxHeight="fill"` rather than a measured one: the grid takes the box it is
				    given and flexes its scroll region to the remainder, so the rows
				    scroll under a sticky header without this file having to know the
				    height of the title row above it or the panel's own insets.

				    Virtualized for the same reason the map clusters: a reader who has
				    been somewhere every week for five years has a list this panel must
				    not render whole. */}
					<Grid<T>
						columns={columns}
						rows={rows}
						// The second filter, on the grid's own row across from its search: the
						// two do the same job, where under the panel's title this one read as
						// being about the panel. Only where there is a choice to make — with
						// every row in one region it would narrow to what is already shown.
						//
						// "All regions" rather than the bar's "All states", because this panel
						// names the column "Region" and answers in its own vocabulary.
						//
						// The toolbar is a size container. It stacks its row under `@lg`, and
						// there the filter fills the row, as the search above it does.
						toolbar={
							regions.length > 1 ? (
								<Listbox<string>
									aria-label="Region"
									placeholder="All regions"
									clearable
									prefix={<Icon icon={<MapIcon />} />}
									className="w-full @lg:w-52"
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
						getKey={(item) => item.id}
						search={{ placeholder: searchPlaceholder }}
						sort={sort}
						onRowClick={onOpen}
						virtualize
						maxHeight="fill"
						header={{ position: 'sticky' }}
						hover
						empty={<Text>{empty}</Text>}
						className="h-full"
					/>
				</SheetBody>
			</SheetPanel>
		</Sheet>
	)
}
