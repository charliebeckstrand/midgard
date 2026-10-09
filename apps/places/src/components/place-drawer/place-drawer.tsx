'use client'

import { ArrowUpDown, CalendarDays, Copy, Globe, Heart, MapPin, Tag, X } from 'lucide-react'
import { type ReactElement, type ReactNode, useEffect, useMemo, useState } from 'react'
import { Badge } from 'ui/badge'
import { CopyButton } from 'ui/copy-button'
import { cn } from 'ui/core'
import { DateTime } from 'ui/date-time'
import { Divider } from 'ui/divider'
import { Drawer, DrawerBody, DrawerClose, DrawerPanel, DrawerTitle } from 'ui/drawer'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { Lightbox, LightboxTrigger } from 'ui/lightbox'
import { Link } from 'ui/link'
import { List, ListItem } from 'ui/list'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Markdown } from 'ui/markdown'
import { Placeholder } from 'ui/placeholder'
import { useDateFormat } from 'ui/providers/locale'
import { Rating } from 'ui/rating'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { CATEGORY_BY_VALUE } from '../../constants'
import type { Place, PlaceCategory, Visit } from '../../types'
import { DAY_FORMAT } from '../../utilities/places-filter'
import { groupName } from '../../utilities/places-view'
import {
	latestVisit,
	PLACE_ORDER_LABEL,
	type PlaceOrder,
	sortPlaces,
} from '../../utilities/places-visits'
import { CategoryPicker } from '../category-picker'
import {
	type PlaceActions,
	PlaceMenu,
	placeMenuItems,
	type VisitActions,
	visitMenuItems,
} from '../place-menu'
import { PlaceTrail, type PlaceTrailStep } from '../place-trail'

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
 * The lines under a place's name: the score of the newest visit, then the date
 * of that visit, or the number of visits where there is more than one. They are
 * spans, because a list row puts them inside a button.
 */
function PlaceMeta({ place }: { place: Place }) {
	const latest = latestVisit(place)

	return (
		<>
			{latest.rating > 0 ? <Rating readOnly value={latest.rating} size="sm" /> : null}

			{place.visits.length > 1 ? (
				<Text as="span" tone="muted">
					{place.visits.length} visits
				</Text>
			) : (
				<Text as="span" tone="muted">
					<DateTime value={latest.visitedAt} format={DAY_FORMAT} />
				</Text>
			)}
		</>
	)
}

/** The badge of a category, or nothing for a category that the app does not know. */
function PlaceCategoryBadge({ category }: { category: PlaceCategory }) {
	const meta = CATEGORY_BY_VALUE.get(category)

	return meta ? <Badge color={meta.color}>{meta.label}</Badge> : null
}

/**
 * One fact about a place, with an icon that names the fact. The icon box is one
 * line high, so the icon stays on the first line when the text wraps. The fact
 * is centered on that line, so the middle of a fact that is not text, such as
 * a score, meets the middle of the icon.
 */
function PlaceFact({ icon, children }: { icon: ReactElement; children: ReactNode }) {
	return (
		<Flex gap="sm" align="start" className="min-w-0">
			<Text as="span" tone="muted" className="flex h-lh shrink-0 items-center">
				<Icon icon={icon} />
			</Text>

			<div className="flex min-h-lh min-w-0 items-center wrap-break-word *:min-w-0">{children}</div>
		</Flex>
	)
}

/**
 * The address of a place on one line, cut with an ellipsis, and a button that
 * copies the full address. The button is taller than a line, so it sits by the
 * fact and not in it, as the menu of a visit does. The row is one line high,
 * the same as the rows under it, so the button goes out of the row above and
 * below: by up to 6px, at the loose density. The row is the first row of the
 * drawer body, a box that scrolls and clips what goes out, so
 * {@link PlaceDetails} has a top padding of that size.
 */
function PlaceAddress({ address }: { address: string }) {
	return (
		<Flex justify="between" align="center" gap="sm" className="h-lh">
			<PlaceFact icon={<MapPin />}>
				<Text className="truncate">{address}</Text>
			</PlaceFact>

			<CopyButton text={address} icon={<Copy />} aria-label="Copy address" />
		</Flex>
	)
}

/** How the thumbnail of a photo ended: the natural size of the photo, or `'failed'`. */
type PhotoLoad = { width: number; height: number } | 'failed'

/**
 * The photos of a visit, in squares of 96 pixels. A press on a square raises
 * its photo into a `Lightbox`, which steps through the photos of the visit.
 *
 * The address of a photo is the one that the reader typed, so its size is not
 * known before it loads. Each square records the natural size of its photo
 * when the thumbnail loads, and the viewer takes the size from that record. A
 * square is disabled until its photo loads, so the viewer never opens on a
 * photo with no size. The `load` and `error` events do not bubble, so the
 * square takes them in the capture phase from the image of its trigger.
 *
 * A placeholder fills the square until the photo loads. When the photo does
 * not load, the placeholder stays and stops its pulse, so it does not look
 * like a photo that loads. The trigger then goes out of the tree, so the
 * browser shows no broken image, and the viewer does not step to that photo.
 * The name of the place is the alt text because it is the one thing known
 * about the picture.
 *
 * Squares, stated on both axes, so every photo reads the same however it was
 * shot, and the row wraps them at any panel width. The fixed box also keeps
 * the text below in position while the photo loads. The trigger fills the box
 * with `object-fit: cover` and crops the overflow, which is what makes one size
 * honest for any aspect.
 */
function PlacePhotos({ photos, alt }: { photos: readonly string[]; alt: string }) {
	const [loads, setLoads] = useState<ReadonlyMap<string, PhotoLoad>>(new Map())

	const settle = (src: string, load: PhotoLoad) =>
		setLoads((previous) => new Map(previous).set(src, load))

	// The address alone is not unique: a reader can add one photo twice.
	const squares = photos.map((src, at) => ({ key: `${at}:${src}`, src, load: loads.get(src) }))

	const viewable = squares.filter((square) => square.load !== 'failed')

	const gallery = viewable.map(({ src, load }) => ({
		src,
		alt,
		// A photo that still loads has a disabled square, so the viewer never shows it.
		width: typeof load === 'object' ? load.width : 1,
		height: typeof load === 'object' ? load.height : 1,
	}))

	return (
		<Lightbox photos={gallery} aria-label={`Photos of ${alt}`}>
			<Flex gap="sm" wrap>
				{squares.map((square) => {
					const loaded = typeof square.load === 'object'

					const failed = square.load === 'failed'

					return (
						<div
							key={square.key}
							className="relative size-24 shrink-0"
							onLoadCapture={(event) => {
								const image = event.target

								if (image instanceof HTMLImageElement) {
									settle(square.src, { width: image.naturalWidth, height: image.naturalHeight })
								}
							}}
							onErrorCapture={() => settle(square.src, 'failed')}
						>
							{loaded ? null : (
								<Placeholder pulse={!failed} className="absolute inset-0 size-full" />
							)}

							{failed ? null : (
								<LightboxTrigger
									index={viewable.indexOf(square)}
									disabled={!loaded}
									className={cn('relative size-full', !loaded && 'opacity-0')}
								/>
							)}
						</div>
					)
				})}
			</Flex>
		</Lightbox>
	)
}

/**
 * One visit to the open place: the date, the score under the date, and the
 * menu of the visit beside the two, then the photos and the review.
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
	const day = useDateFormat(DAY_FORMAT).format(new Date(visit.visitedAt))

	return (
		<Stack gap="md">
			{/* The menu is centered on the date and the score together. Its box is
			    one line high, so it adds no height to a visit with no score; the
			    menu is taller than the line, and goes out of the box above and
			    below. */}
			<Flex justify="between" align="center" gap="sm">
				<Stack gap="md" className="min-w-0">
					<PlaceFact icon={<CalendarDays />}>
						<Text>{day}</Text>
					</PlaceFact>

					{visit.rating > 0 ? (
						<PlaceFact icon={<Heart />}>
							<Rating readOnly value={visit.rating} size="sm" />
						</PlaceFact>
					) : null}
				</Stack>

				<div className="flex h-lh items-center">
					<PlaceMenu
						items={visitMenuItems(place, visit, actions)}
						aria-label={`Actions for the visit on ${day}`}
					/>
				</div>
			</Flex>

			{visit.photos.length > 0 ? <PlacePhotos photos={visit.photos} alt={place.name} /> : null}

			{/* The review is Markdown, so its paragraphs, lists, and emphasis show.
			    `breaks` keeps each line break that the reader typed. The offset
			    puts a heading of the review under the "Visits" heading. */}
			{visit.review ? (
				<Text as="div">
					<Markdown headingOffset={3} breaks>
						{visit.review}
					</Markdown>
				</Text>
			) : null}
		</Stack>
	)
}

/**
 * The body of the drawer over one place: its address, its web address, its
 * category, and its visits, newest first. A score is a fact about a visit, so
 * each visit shows its own, and the place shows none.
 */
function PlaceDetails({ place, actions }: { place: Place; actions: VisitActions }) {
	const category = CATEGORY_BY_VALUE.get(place.category)

	return (
		// `pt-1.5` holds the top of the copy button in the first row.
		<Stack gap="md" className="pt-1.5 pb-6">
			<Stack gap="md">
				<PlaceAddress address={place.address} />

				{place.url ? (
					<PlaceFact icon={<Globe />}>
						<Link href={place.url} target="_blank" underline rel="noopener noreferrer">
							{place.url}
						</Link>
					</PlaceFact>
				) : null}

				{category ? (
					<PlaceFact icon={<Tag />}>
						<Text>{category.label}</Text>
					</PlaceFact>
				) : null}
			</Stack>

			{place.visits.length > 0 ? (
				<>
					<Divider className="my-2" />

					<Heading level={3} size="sm">
						Visits
					</Heading>
				</>
			) : null}

			{place.visits.map((visit, at) => (
				<Stack key={visit.id} gap="md">
					{at > 0 ? <Divider className="my-2" /> : null}

					<PlaceVisit place={place} visit={visit} actions={actions} />
				</Stack>
			))}
		</Stack>
	)
}

/**
 * The list the drawer shows, and the name of the group's own step over it.
 *
 * A picked group of two or more that is a part of its region — a summary dot
 * that merged some of the region's places — is a step of its own under the
 * region, so the drawer lists what the reader picked, and the region crumb is
 * one step back to the rest. Every other pick lists the region, and has no
 * group step. A place the map placed in no region has no region list, so the
 * group it was picked from stands in.
 */
function drawerList(
	group: readonly Place[],
	regionPlaces: readonly Place[],
	widened: boolean,
): { list: readonly Place[]; group: string | null } {
	const region = regionPlaces.length > 0 ? regionPlaces : group

	if (widened || group.length < 2) return { list: region, group: null }

	const ids = new Set(region.map((item) => item.id))

	const part = region.length !== group.length || group.some((item) => !ids.has(item.id))

	return part ? { list: group, group: groupName(group) } : { list: region, group: null }
}

/**
 * The trail of the drawer as steps that act. Every region step but the last
 * leads out to the map. The last leads to the region's list, where the reader is
 * not already on it; the group's step leads back to the group's list; and the
 * place itself leads nowhere, because it is where the reader already is.
 */
function trailSteps({
	where,
	group,
	place,
	hasList,
	onNavigate,
	onList,
	onWiden,
}: {
	/** The regions, from the drawn one down. */
	where: readonly string[]
	/** The name of the group's own step, or `null` where the list is the region's. */
	group: string | null
	/** The open place, or `null` on a list. */
	place: Place | null
	/** Whether there is a list to go back to. */
	hasList: boolean
	onNavigate: (region: string) => void
	/** Shows this panel's own list. */
	onList: () => void
	/** Widens the list from the group to the region. */
	onWiden: () => void
}): PlaceTrailStep[] {
	const regionPick = (): (() => void) | undefined => {
		if (group !== null)
			return () => {
				onWiden()

				onList()
			}

		return place !== null && hasList ? onList : undefined
	}

	const steps: PlaceTrailStep[] = where.map((label, at) => ({
		label,
		onPick: at < where.length - 1 ? () => onNavigate(label) : regionPick(),
	}))

	if (group !== null) steps.push({ label: group, onPick: place === null ? undefined : onList })

	if (place !== null) steps.push({ label: place.name })

	return steps
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
	/** The order of the list. */
	order: PlaceOrder
	onOrderChange: (order: PlaceOrder) => void
	/** Opens one place of the list, by id. */
	onOpen: (id: string) => void
}

/**
 * The body of the drawer over a group: the category picker, the sort picker, and
 * the list of the places that the category picker lets through.
 */
function PlaceList({
	shown,
	spanned,
	categories,
	onCategoriesChange,
	order,
	onOrderChange,
	onOpen,
}: PlaceListProps) {
	return (
		<Stack gap="md">
			{/* Over the list rather than in the header, because they change the
			    list and not the panel. The category picker shows only where there
			    is more than one category to choose between. */}
			<Flex gap="sm" align="center" wrap>
				{spanned > 1 ? (
					<CategoryPicker
						value={categories}
						onValueChange={onCategoriesChange}
						prefix={<Icon icon={<Tag />} />}
						className="w-full sm:w-52"
					/>
				) : null}

				<Listbox<PlaceOrder>
					aria-label="Sort"
					prefix={<Icon icon={<ArrowUpDown />} />}
					className="w-full sm:w-44"
					displayValue={(value) => PLACE_ORDER_LABEL[value]}
					value={order}
					onValueChange={(value) => onOrderChange(value ?? 'name')}
				>
					{(Object.keys(PLACE_ORDER_LABEL) as PlaceOrder[]).map((value) => (
						<ListboxOption key={value} value={value}>
							<ListboxLabel>{PLACE_ORDER_LABEL[value]}</ListboxLabel>
						</ListboxOption>
					))}
				</Listbox>
			</Flex>

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
							{/* The category sits at the end of the row, in the middle of the
							    name and the line under it. */}
							<Flex as="span" justify="between" align="center" gap="sm">
								<Stack as="span" gap="sm" className="min-w-0 text-left">
									<Text as="span" className="font-medium">
										{item.name}
									</Text>

									<PlaceMeta place={item} />
								</Stack>

								<PlaceCategoryBadge category={item.category} />
							</Flex>
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
 * A summary dot opens as the list of the places it merged, under a step named
 * for them — their shared city, or a count — beneath the region they stand in.
 * The region crumb widens the list to every place in the region. A summary that
 * merged the whole region opens as the region's list, with no step of its own. A
 * lone dot opens straight into its place.
 *
 * The title is the trail rather than a name, so it is also the way back: each
 * crumb returns to the list it names. There is no Back button, because the crumb
 * is one.
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

	// Whether the reader stepped out of a summary's own places to the region's.
	// Its own bit, because a summary opens as its group and only the region crumb
	// widens it.
	const [widened, setWidened] = useState(false)

	// Which categories the list is narrowed to; empty is unfiltered. Held here
	// rather than lifted, because it narrows this panel's list and nothing else —
	// the bar over the map already narrows the map.
	const [categories, setCategories] = useState<PlaceCategory[]>([])

	// The order of the list. Alphabetical by default, and back to it on a new
	// pick, the same as the categories.
	const [order, setOrder] = useState<PlaceOrder>('name')

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

		setWidened(false)

		setCategories([])

		setOrder('name')
	}, [groupKey])

	// The list under the trail, and the group's own step over it where there is
	// one. See `drawerList` for which list that is.
	const { list, group } = useMemo(
		() => drawerList(held, regionPlaces, widened),
		[held, regionPlaces, widened],
	)

	// What the list narrows to. Empty admits everything: a reader who clears the
	// last category means to stop filtering, not to empty the panel.
	const shown = useMemo(
		() =>
			sortPlaces(
				categories.length === 0 ? list : list.filter((item) => categories.includes(item.category)),
				order,
			),
		[list, categories, order],
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

	const steps = useMemo(
		() =>
			trailSteps({
				where,
				group,
				place,
				hasList: list.length > 0,
				onNavigate,
				onList: () => {
					setOpenedId(null)

					setListing(true)
				},
				onWiden: () => setWidened(true),
			}),
		[where, group, place, list.length, onNavigate],
	)

	const title = steps.map((step) => step.label).join(' › ')

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerPanel
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
				aria-label={title}
			>
				{/* The panel has no inset of its own, so the row takes the inset of a drawer title. */}
				<Flex justify="between" align="center" gap="md" className="px-6 pt-6">
					{/* `min-w-0` is what lets the trail inside give way. Without it this flex
				    child holds its full width, so a long trail runs past the panel edge
				    instead of truncating — the crumbs cannot shrink below a parent that
				    will not. `flex-1` gives the trail the panel's full width, which is the room
				    its fit measures. */}
					<Stack gap="sm" className="flex-1 min-w-0">
						{/* The title is the trail, so it doubles as the way back and the panel
					    needs no Back button of its own. `DrawerTitle` names the panel; the
					    crumbs are what the reader reads and act on. */}
						<DrawerTitle className="sr-only p-0">{title}</DrawerTitle>

						<PlaceTrail className="text-base/7" steps={steps} />
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
							order={order}
							onOrderChange={setOrder}
							onOpen={(id) => {
								setOpenedId(id)

								setListing(false)
							}}
						/>
					)}
				</DrawerBody>
			</DrawerPanel>
		</Drawer>
	)
}
