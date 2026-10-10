'use client'

import { ArrowUpDown, CalendarDays, Copy, Globe, Heart, Luggage, MapPin, Tag } from 'lucide-react'
import { CopyButton } from 'ui/copy-button'
import { Divider } from 'ui/divider'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { Link } from 'ui/link'
import { List } from 'ui/list'
import { Listbox, ListboxLabel, ListboxOption } from 'ui/listbox'
import { Markdown } from 'ui/markdown'
import { useDateFormat } from 'ui/providers/locale'
import { Rating } from 'ui/rating'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import { CATEGORY_BY_VALUE } from '../../constants'
import type { Place, PlaceCategory, Trip, Visit } from '../../types'
import { DAY_FORMAT } from '../../utilities/places-filter'
import { PLACE_ORDER_LABEL, type PlaceOrder } from '../../utilities/places-visits'
import { CategoryPicker } from '../category-picker'
import { PlaceMenu, type VisitActions, visitMenuItems } from '../place-menu'
import { SummaryFact, SummaryPhotos } from '../summary-drawer'
import { PlaceRow } from './place-row'

/**
 * The way from a visit to the trip that it was on: the trips by id, the address
 * that opens one, and the open itself, which is a step the reader can walk back
 * out of.
 */
export type TripLink = {
	trips: ReadonlyMap<string, Trip>
	href: (trip: Trip) => string
	open: (trip: Trip) => void
}

/**
 * The trip of a visit, as a link under its date. It is the way back up from a
 * place to its trip. A click opens the trip in place, and the address of the
 * link opens it from a new tab.
 */
function VisitTrip({ trip, link }: { trip: Trip; link: TripLink }) {
	return (
		<SummaryFact icon={<Luggage />}>
			<Link
				href={link.href(trip)}
				underline
				onClick={(event) => {
					event.preventDefault()

					link.open(trip)
				}}
			>
				{trip.name}
			</Link>
		</SummaryFact>
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
			<SummaryFact icon={<MapPin />}>
				<Text className="truncate">{address}</Text>
			</SummaryFact>

			<CopyButton text={address} icon={<Copy />} aria-label="Copy address" />
		</Flex>
	)
}

/**
 * One visit to the open place: the date, the trip under the date where the
 * visit was on one, the score, and the menu of the visit beside them, then the
 * photos and the review.
 */
function PlaceVisit({
	place,
	visit,
	actions,
	tripLink,
}: {
	place: Place
	visit: Visit
	actions: VisitActions
	tripLink: TripLink
}) {
	const trip = visit.tripId === undefined ? undefined : tripLink.trips.get(visit.tripId)

	const day = useDateFormat(DAY_FORMAT).format(new Date(visit.visitedAt))

	return (
		<Stack gap="md">
			{/* The menu is centered on the facts together. Its box is one line
			    high, so it adds no height to a visit with the date alone; the
			    menu is taller than the line, and goes out of the box above and
			    below. */}
			<Flex justify="between" align="center" gap="sm">
				<Stack gap="md" className="min-w-0">
					<SummaryFact icon={<CalendarDays />}>
						<Text>{day}</Text>
					</SummaryFact>

					{trip === undefined ? null : <VisitTrip trip={trip} link={tripLink} />}

					{visit.rating > 0 ? (
						<SummaryFact icon={<Heart />}>
							<Rating readOnly value={visit.rating} size="sm" />
						</SummaryFact>
					) : null}
				</Stack>

				<div className="flex h-lh items-center">
					<PlaceMenu
						items={visitMenuItems(place, visit, actions)}
						aria-label={`Actions for the visit on ${day}`}
					/>
				</div>
			</Flex>

			{visit.photos.length > 0 ? <SummaryPhotos photos={visit.photos} alt={place.name} /> : null}

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
 * The body of the panel over one place: its address, its web address, its
 * category, and its visits, newest first. A score is a fact about a visit, so
 * each visit shows its own, and the place shows none.
 */
export function PlaceDetails({
	place,
	actions,
	tripLink,
}: {
	place: Place
	actions: VisitActions
	tripLink: TripLink
}) {
	const category = CATEGORY_BY_VALUE.get(place.category)

	return (
		// `pt-1.5` holds the top of the copy button in the first row.
		<Stack gap="md" className="pt-1.5 pb-6">
			<Stack gap="md">
				<PlaceAddress address={place.address} />

				{place.url ? (
					<SummaryFact icon={<Globe />}>
						<Link href={place.url} target="_blank" underline rel="noopener noreferrer">
							{place.url}
						</Link>
					</SummaryFact>
				) : null}

				{category ? (
					<SummaryFact icon={<Tag />}>
						<Text>{category.label}</Text>
					</SummaryFact>
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

					<PlaceVisit place={place} visit={visit} actions={actions} tripLink={tripLink} />
				</Stack>
			))}
		</Stack>
	)
}

/** Props for {@link PlaceList}. */
export type PlaceListProps = {
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
 * The places of a group: the category picker, the sort picker, and the list of
 * the places that the category picker lets through.
 */
export function PlaceList({
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
					{(item) => <PlaceRow place={item} onOpen={onOpen} />}
				</List>
			)}
		</Stack>
	)
}
