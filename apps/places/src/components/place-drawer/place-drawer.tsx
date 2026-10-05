'use client'

import { CalendarDays, Globe, MapPin, X } from 'lucide-react'
import Image from 'next/image'
import { type ReactElement, type ReactNode, useEffect, useMemo, useState } from 'react'
import { Badge } from 'ui/badge'
import { Divider } from 'ui/divider'
import { Drawer, DrawerBody, DrawerClose, DrawerTitle } from 'ui/drawer'
import { Icon } from 'ui/icon'
import { Link } from 'ui/link'
import { List, ListItem } from 'ui/list'
import { Rating } from 'ui/rating'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { CATEGORY_BY_VALUE } from '../../constants'
import type { Place, PlaceCategory, Visit } from '../../types'
import { fromDay } from '../../utilities/places-filter'
import { latestVisit } from '../../utilities/places-visits'
import { CategoryPicker } from '../category-picker'
import {
	type PlaceActions,
	PlaceMenu,
	placeMenuItems,
	type VisitActions,
	visitMenuItems,
} from '../place-menu'
import { PlaceTrail } from '../place-trail'

/** Props for {@link PlaceDrawer}. */
export type PlaceDrawerProps = {
	/**
	 * The places the picked dot stands for. One for a lone dot, several for a
	 * summary; empty closes the drawer.
	 */
	places: readonly Place[]
	/**
	 * The regions the picked dot stands in, from the drawn one down — empty where
	 * none holds it. The last step is what the list under it is.
	 *
	 * A trail rather than one name, because a summary dot on the world map often
	 * merges one town's worth of places: the country it drew in is the coarser
	 * answer, and the state every one of them shares is the one the reader can see
	 * it standing on.
	 */
	trail: readonly string[]
	/** Every place in the trail's last region — the list its crumb leads back to. */
	regionPlaces: readonly Place[]
	onOpenChange: (open: boolean) => void
	/**
	 * Takes the map to one of the trail's upper regions.
	 *
	 * Without it those steps are plain text: a crumb that lights under the pointer
	 * and answers nothing is worse than one that never offered.
	 */
	onNavigate: (region: string) => void
	/**
	 * What the menus of the open place and of its visits do. The panels and the
	 * confirmations are the caller's.
	 */
	actions: PlaceActions & VisitActions
}

/**
 * The category, the date and the score of the newest visit, and the number of
 * visits where there is more than one — the line under a place's name. It is
 * spans, because a list row puts it inside a button, and a flex line lays out
 * the same either way.
 */
function PlaceMeta({ place }: { place: Place }) {
	const category = CATEGORY_BY_VALUE.get(place.category)

	const latest = latestVisit(place)

	return (
		<Flex as="span" gap="sm" align="center" wrap>
			{category ? <Badge color={category.color}>{category.label}</Badge> : null}

			<Text as="span">{fromDay(latest.visitedAt).toLocaleDateString()}</Text>

			{latest.rating > 0 ? <Rating readOnly value={latest.rating} size="sm" /> : null}

			{place.visits.length > 1 ? (
				<Text as="span" tone="muted">
					{place.visits.length} visits
				</Text>
			) : null}
		</Flex>
	)
}

/**
 * The category and the score of the newest visit of one open place, under the
 * trail. The visit dates are not on this line. A date is a fact about a visit,
 * so it goes with the visit in the body.
 */
function PlaceScore({ place }: { place: Place }) {
	const category = CATEGORY_BY_VALUE.get(place.category)

	const { rating } = latestVisit(place)

	return (
		<Flex gap="sm" align="center" wrap>
			{category ? <Badge color={category.color}>{category.label}</Badge> : null}

			{rating > 0 ? <Rating readOnly value={rating} size="sm" /> : null}
		</Flex>
	)
}

/**
 * One fact about a place, with an icon that names the fact. The icon box is one
 * line high, so the icon stays on the first line when the text wraps.
 */
function PlaceFact({ icon, children }: { icon: ReactElement; children: ReactNode }) {
	return (
		<Flex gap="sm" align="start">
			<Text as="span" tone="muted" className="flex h-lh shrink-0 items-center">
				<Icon icon={icon} />
			</Text>

			<div className="min-w-0 break-words">{children}</div>
		</Flex>
	)
}

/**
 * One visit to the open place: the date and the score with the menu of the
 * visit, then the photos and the review.
 */
function PlaceVisit({
	place,
	visit,
	actions,
}: {
	place: Place
	visit: Visit
	actions: VisitActions
}) {
	const day = fromDay(visit.visitedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })

	return (
		<Stack gap="sm">
			<Flex justify="between" align="center" gap="sm">
				<PlaceFact icon={<CalendarDays />}>
					<Flex gap="sm" align="center" wrap>
						<Text>Visited {day}</Text>

						{visit.rating > 0 ? <Rating readOnly value={visit.rating} size="sm" /> : null}
					</Flex>
				</PlaceFact>

				<PlaceMenu
					items={visitMenuItems(place, visit, actions)}
					aria-label={`Actions for the visit on ${day}`}
				/>
			</Flex>

			{/* `next/image` with `unoptimized`: the address is the one that the
			    reader typed, so the host is not known at build time. The optimizer
			    serves only the hosts that `images.remotePatterns` lists, so the
			    browser gets the photo from its own address. The name is the alt
			    text because it is the one thing known about the picture.

			    Squares, stated on both axes, so every photo reads the same however
			    it was shot, and the row wraps them at any panel width. Stating the
			    size also reserves the space before the picture arrives; unsized,
			    the `img` laid out at nothing and shoved the text down on load.
			    `object-cover` fills the box and crops the overflow, which is what
			    makes one size honest for any aspect. */}
			{visit.photos.length > 0 ? (
				<Flex gap="sm" wrap>
					{visit.photos.map((photo, at) => (
						<Image
							// The address alone is not unique: a reader can add one photo twice.
							key={`${at}:${photo}`}
							src={photo}
							alt={place.name}
							width={96}
							height={96}
							unoptimized
							className="size-24 rounded-lg bg-white/5 object-cover"
						/>
					))}
				</Flex>
			) : null}

			{visit.review ? <Text>{visit.review}</Text> : null}
		</Stack>
	)
}

/**
 * The body of the drawer over one place: its address, its web address, and its
 * visits, newest first.
 */
function PlaceDetails({ place, actions }: { place: Place; actions: VisitActions }) {
	return (
		<Stack gap="md" className="pb-6">
			<Stack gap="sm">
				<PlaceFact icon={<MapPin />}>
					<Text>{place.address}</Text>
				</PlaceFact>

				{place.url ? (
					<PlaceFact icon={<Globe />}>
						<Link href={place.url} target="_blank" underline rel="noopener noreferrer">
							{place.url}
						</Link>
					</PlaceFact>
				) : null}
			</Stack>

			{place.visits.map((visit) => (
				<Stack key={visit.id} gap="md">
					<Divider className="my-2" />

					<PlaceVisit place={place} visit={visit} actions={actions} />
				</Stack>
			))}
		</Stack>
	)
}

/** Props for {@link PlaceList}. */
type PlaceListProps = {
	/** The places that the category filter lets through. */
	shown: readonly Place[]
	/** The number of categories that the full list spans. */
	spanned: number
	/** The categories that narrow the list; empty is unfiltered. */
	categories: PlaceCategory[]
	onCategoriesChange: (categories: PlaceCategory[]) => void
	/** Opens one place of the list, by id. */
	onOpen: (id: string) => void
}

/**
 * The body of the drawer over a group: the category picker and the list of the
 * places that it lets through.
 */
function PlaceList({ shown, spanned, categories, onCategoriesChange, onOpen }: PlaceListProps) {
	return (
		<Stack gap="md">
			{/* Over the list rather than in the header, because it narrows the
			    list and not the panel — and only where there is more than one
			    category to choose between. */}
			{spanned > 1 ? (
				<CategoryPicker
					value={categories}
					onValueChange={onCategoriesChange}
					className="w-full sm:w-52"
				/>
			) : null}

			{shown.length === 0 ? (
				<Text tone="warning">
					No places match the selected {categories.length > 1 ? 'categories' : 'category'}.
				</Text>
			) : (
				<List items={[...shown]} sortable={false} virtual getKey={(item) => item.id}>
					{(item) => (
						// The `onClick` marks the row interactive, which is where its
						// cursor, focus ring, and hover wash come from — the card variant's
						// wash being an opaque step, so a hovered row stays a surface over
						// the map rather than turning see-through to it. The content area
						// is a button, so Tab reaches each row and Enter or Space opens it.
						<ListItem as="button" type="button" onClick={() => onOpen(item.id)}>
							<Stack as="span" gap="sm" className="text-left">
								<Text as="span" className="font-medium">
									{item.name}
								</Text>

								<PlaceMeta place={item} />
							</Stack>
						</ListItem>
					)}
				</List>
			)}
		</Stack>
	)
}

/**
 * The glass drawer that shows what a dot stands for.
 *
 * It is as tall as the step it is showing. One place leaves most of the map up,
 * including the dot that opened the panel; a region with places enough takes the
 * screen, because a step with that much to show is one the reader came to read.
 * The panel travels between the two rather than snapping, so the resize reads as
 * the crumb being followed instead of the panel moving under the reader's hand.
 *
 * A summary dot opens as the list of every place in its region, because a
 * summary is a fact about the frame — the same dots separate as the reader zooms
 * in — where the region is a fact about the places. A lone dot opens straight
 * into its place.
 *
 * The title is the trail rather than a name, so it is also the way back: the
 * first crumb names the region and returns to the region's list. There is no
 * Back button, because the crumb is one.
 */
export function PlaceDrawer({
	places,
	trail,
	regionPlaces,
	onOpenChange,
	onNavigate,
	actions,
}: PlaceDrawerProps) {
	// Which place of a group is open, by id. The pick is held rather than derived,
	// because a group is a list until the reader picks from it; the id rather than
	// the record, because an edit rewrites the record and a held one would go on
	// showing what the store no longer holds.
	const [openedId, setOpenedId] = useState<string | null>(null)

	// Whether the reader asked for the list back. It is its own bit rather than a
	// cleared `opened`, because a lone dot has no group to fall back to — clearing
	// alone would resolve straight to that one place again and the crumb would do
	// nothing.
	const [listing, setListing] = useState(false)

	// Which categories the list is narrowed to; empty is unfiltered. Held here
	// rather than lifted, because it narrows this panel's list and nothing else —
	// the bar over the map already narrows the map.
	const [categories, setCategories] = useState<PlaceCategory[]>([])

	// The last group the drawer was given. The panel stays mounted while it closes
	// so the slide out plays, and a closing panel is handed an empty group — so the
	// body reads the last non-empty one rather than the current one, or it would
	// blank halfway through its own exit.
	const [held, setHeld] = useState<readonly Place[]>(places)

	const open = places.length > 0

	// Which dots the group stands for, as one string. It is what a new pick
	// changes and what a re-read of the same pick does not: an edit or a refetch
	// hands back an equal group in a new array, and resetting on that identity
	// would throw a reader out of the row they had opened.
	const groupKey = places.map((place) => place.id).join('|')

	// Refreshes the group the body reads. Keyed on the array, so an edit reaches
	// the open panel; guarded on the close, which is what hands over the empty
	// group the hold exists to survive.
	useEffect(() => {
		if (places.length === 0) return

		setHeld(places)
	}, [places])

	// Returns to the top of the group. Keyed on the pick alone — the reset belongs
	// to a new pick, not to every re-read — and skipped while closing, or a reader
	// who had drilled into a row would be flipped back to the list mid-exit.
	useEffect(() => {
		if (groupKey === '') return

		setOpenedId(null)

		setListing(false)

		setCategories([])
	}, [groupKey])

	// The region's places, never the merged group alone. The crumb over the list
	// names the region, so the list under it has to be the region's — a summary
	// that listed only what the frame happened to merge would answer a different
	// question from the one its own heading asks, and the count would change with
	// the zoom.
	//
	// A place the map placed in no region has no such list, so the group it was
	// picked from stands in.
	const list = regionPlaces.length > 0 ? regionPlaces : held

	// What the list narrows to. Empty admits everything: a reader who clears the
	// last category means to stop filtering, not to empty the panel.
	const shown = useMemo(
		() =>
			categories.length === 0 ? list : list.filter((item) => categories.includes(item.category)),
		[list, categories],
	)

	// How many categories the list spans. A picker over one of them offers the
	// reader a choice between everything and everything, so it is not offered.
	const spanned = useMemo(() => new Set(list.map((item) => item.category)).size, [list])

	// The pick read back through the live list, so an edit shows in the open panel
	// rather than at the next pick.
	const opened = openedId === null ? null : (list.find((item) => item.id === openedId) ?? null)

	// `?? null` because an indexed read is optional under `noUncheckedIndexedAccess`,
	// and every reader below tests for `null` alone.
	const place = listing ? null : (opened ?? (held.length === 1 ? (held[0] ?? null) : null))

	// A place the map placed in no region falls back to the count, which is the
	// only other thing the group has to say about itself. Counted after the
	// filter, so the heading agrees with the rows under it.
	//
	// Held, because the fallback is a fresh array every render and the steps below
	// are keyed on this one: rebuilt each time, the memo under it never holds.
	const where = useMemo(
		() => (trail.length > 0 ? trail : [`${shown.length} places`]),
		[trail, shown.length],
	)

	const title = [...where, ...(place === null ? [] : [place.name])].join(' › ')

	// The trail as steps that act. Every region step but the last leads out to the
	// map; the last leads back to this panel's own list, and the place itself leads
	// nowhere because it is where the reader already is.
	const steps = useMemo(() => {
		const regions = where.map((step, at) => ({
			label: step,
			onPick:
				at < where.length - 1
					? () => onNavigate(step)
					: place !== null && list.length > 0
						? () => {
								setOpenedId(null)

								setListing(true)
							}
						: undefined,
		}))

		return place === null ? regions : [...regions, { label: place.name }]
	}, [where, place, list.length, onNavigate])

	return (
		<Drawer
			glass
			// Grown to what each step holds, because this panel is navigated: the
			// crumb walks between the region's list and one place, and the two are
			// not the same size. A fixed height fits one of them — a list of twelve
			// scrolls inside a box built for one place, and a place sits in a box
			// built for the list with half of it empty under the review.
			//
			// The travel is what makes that work rather than the size: a container
			// moving because its contents changed reads as the panel collapsing under
			// the reader's hand, and the same move at the speed of the crumb reads as
			// the panel following it. A region with places enough covers the map, which
			// is the honest answer for a step with that much to show — the crumb above
			// is how the reader gets back to it.
			height="fit"
			open={open}
			onOpenChange={onOpenChange}
			aria-label={title}
			// The close in the header row closes the drawer, so it has no Close row.
			footer={null}
		>
			{/* The panel has no inset of its own, so the row takes the inset of a drawer title. */}
			<Flex justify="between" align="start" gap="md" className="px-6 pt-6">
				{/* `min-w-0` is what lets the trail inside give way. Without it this flex
				    child holds its full width, so a long trail runs past the panel edge
				    instead of truncating — the crumbs cannot shrink below a parent that
				    will not. `flex-1` is what lets it come back: the trail measures the box
				    it is given, and a box that shrinks to the trail would narrow with it and
				    never report the room to expand again. */}
				<Stack gap="sm" className="flex-1 min-w-0">
					{/* The title is the trail, so it doubles as the way back and the panel
					    needs no Back button of its own. `DrawerTitle` names the panel; the
					    crumbs are what the reader reads and act on. */}
					<DrawerTitle className="sr-only p-0">{title}</DrawerTitle>

					<PlaceTrail className="text-base/7" steps={steps} />

					{place ? <PlaceScore place={place} /> : null}
				</Stack>

				{/* The menu of the open place sits by the close, where a list row of My
				    places has its own. A list row in this panel is a way into a place,
				    not a place, so the list has no menu. */}
				<Flex gap="xs" align="center" className="shrink-0">
					{place ? (
						<PlaceMenu
							items={placeMenuItems(place, actions)}
							aria-label={`Actions for ${place.name}`}
						/>
					) : null}

					<DrawerClose>
						<ToggleIconButton icon={<Icon icon={<X />} />} aria-label="Close" />
					</DrawerClose>
				</Flex>
			</Flex>

			<DrawerBody>
				{place ? (
					<PlaceDetails place={place} actions={actions} />
				) : (
					<PlaceList
						shown={shown}
						spanned={spanned}
						categories={categories}
						onCategoriesChange={setCategories}
						onOpen={(id) => {
							setOpenedId(id)

							setListing(false)
						}}
					/>
				)}
			</DrawerBody>
		</Drawer>
	)
}
