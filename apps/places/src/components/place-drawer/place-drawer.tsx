'use client'

import { ArrowUpDown, CalendarDays, Copy, Globe, Heart, MapPin, Tag } from 'lucide-react'
import { type ReactElement, type ReactNode, useCallback, useEffect, useState } from 'react'
import { Badge } from 'ui/badge'
import { CopyButton } from 'ui/copy-button'
import { DateTime } from 'ui/date-time'
import { Divider } from 'ui/divider'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { Lightbox, LightboxTrigger } from 'ui/lightbox'
import { Link } from 'ui/link'
import { List, ListItem } from 'ui/list'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Markdown } from 'ui/markdown'
import { useDateFormat } from 'ui/providers/locale'
import { Rating } from 'ui/rating'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import { CATEGORY_BY_VALUE } from '../../constants'
import type { Place, PlaceCategory, Visit } from '../../types'
import { DAY_FORMAT } from '../../utilities/places-filter'
import type { PlacePanelStep } from '../../utilities/places-url'
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
import { SummaryDrawer } from '../summary-drawer'

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
	/**
	 * The step of the trail that the panel shows. The caller holds it, so that the
	 * address carries it and a reload opens the panel on the same crumb.
	 */
	step: PlacePanelStep
	/** Moves the panel to another step of its trail. */
	onStepChange: (step: PlacePanelStep) => void
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

/**
 * The photos of a visit, in squares of 96 pixels. A press on a square raises
 * its photo into a `Lightbox`, which steps through the photos of the visit.
 *
 * The address of a photo is the one that the reader typed, so its size is not
 * known before it loads. The `Lightbox` reads the size from the thumbnail, and
 * a placeholder pulses in the square until then. A photo that does not load
 * leaves a still placeholder, and the viewer steps over it. The name of the
 * place is the alt text because it is the one thing known about the picture.
 *
 * Squares, stated on both axes, so every photo reads the same however it was
 * shot, and the row wraps them at any panel width. The fixed box also keeps
 * the text below in position while the photo loads. The trigger fills the box
 * with `object-fit: cover` and crops the overflow, which is what makes one size
 * honest for any aspect.
 */
function PlacePhotos({ photos, alt }: { photos: readonly string[]; alt: string }) {
	return (
		<Lightbox photos={photos.map((src) => ({ src, alt }))} aria-label={`Photos of ${alt}`}>
			<Flex gap="sm" wrap>
				{/* The address alone is not unique: a reader can add one photo twice. */}
				{photos.map((src, at) => (
					<LightboxTrigger key={`${at}:${src}`} index={at} className="size-24 shrink-0" />
				))}
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
 * The summary drawer over places: a place's details, and a list of places
 * with a category picker and a sort picker. See {@link SummaryDrawer} for the
 * trail, the steps, and the size.
 */
export function PlaceDrawer({
	places,
	trail,
	regionPlaces,
	step,
	onStepChange,
	onOpenChange,
	onNavigate,
	actions,
}: PlaceDrawerProps) {
	// Which categories the list is narrowed to; empty is unfiltered. Held here
	// rather than lifted, because it narrows this panel's list and nothing else —
	// the bar over the map already narrows the map. Held here rather than in the
	// list, because the list unmounts while a place is open, and the reader comes
	// back to the list they narrowed.
	const [categories, setCategories] = useState<PlaceCategory[]>([])

	// The order of the list. Alphabetical by default, and back to it on a new
	// pick, the same as the categories.
	const [order, setOrder] = useState<PlaceOrder>('name')

	// Which dots the group stands for, as one string. It is what a new pick
	// changes and what a re-read of the same pick does not: an edit or a refetch
	// hands back an equal group in a new array, and resetting on that identity
	// would throw a reader out of the row they had opened.
	const groupKey = places.map((place) => place.id).join('|')

	// Returns the list's own pickers to their start. Keyed on the pick alone — the
	// reset belongs to a new pick, not to every re-read — and skipped while
	// closing, or the list would change under its own exit.
	useEffect(() => {
		if (groupKey === '') return

		setCategories([])

		setOrder('name')
	}, [groupKey])

	// What the list narrows to. Empty admits everything: a reader who clears the
	// last category means to stop filtering, not to empty the panel.
	const narrow = useCallback(
		(list: readonly Place[]) =>
			sortPlaces(
				categories.length === 0 ? list : list.filter((item) => categories.includes(item.category)),
				order,
			),
		[categories, order],
	)

	return (
		<SummaryDrawer<Place>
			items={places}
			trail={trail}
			regionItems={regionPlaces}
			step={step}
			onStepChange={onStepChange}
			onOpenChange={onOpenChange}
			onNavigate={onNavigate}
			narrow={narrow}
			noun="places"
			menu={(place) => (
				<PlaceMenu
					items={placeMenuItems(place, actions)}
					aria-label={`Actions for ${place.name}`}
				/>
			)}
			details={(place) => <PlaceDetails place={place} actions={actions} />}
			list={({ list, shown, open }) => (
				<PlaceList
					shown={shown}
					// How many categories the list spans. A picker over one of them offers
					// the reader a choice between everything and everything, so it is not
					// offered.
					spanned={new Set(list.map((item) => item.category)).size}
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
