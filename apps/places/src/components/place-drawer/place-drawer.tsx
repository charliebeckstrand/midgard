'use client'

import { Pencil, Trash, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from 'ui/badge'
import { Button } from 'ui/button'
import { Divider } from 'ui/divider'
import { Drawer, DrawerBody, DrawerClose, DrawerFooter, DrawerTitle } from 'ui/drawer'
import { Flex } from 'ui/flex'
import { Icon } from 'ui/icon'
import { Link } from 'ui/link'
import { List, ListItem } from 'ui/list'
import { Rating } from 'ui/rating'
import { Stack } from 'ui/stack'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { CATEGORY_BY_VALUE } from '../../constants'
import type { Place, PlaceCategory } from '../../types'
import { fromDay } from '../../utilities/places-filter'
import { CategoryPicker } from '../category-picker'
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
	/** Opens the place for an edit. */
	onEdit: (place: Place) => void
	/** Asks for the place to be deleted. The confirmation is the caller's. */
	onDelete: (place: Place) => void
}

/** The visit date, category, and score — the line under a place's name. */
function PlaceMeta({ place }: { place: Place }) {
	const category = CATEGORY_BY_VALUE.get(place.category)

	return (
		<Flex gap="sm" align="center" wrap>
			{category ? <Badge color={category.color}>{category.label}</Badge> : null}

			<Text>{fromDay(place.visitedAt).toLocaleDateString()}</Text>

			{place.rating > 0 ? <Rating readOnly value={place.rating} size="sm" /> : null}
		</Flex>
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
	onEdit,
	onDelete,
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
			handle
			// Grown to what each step holds, because this panel is navigated: the
			// crumb walks between the region's list and one place, and the two are
			// not the same size. A fixed height fits one of them — a list of twelve
			// scrolls inside a box built for one place, and a place sits in a box
			// built for the list with half of it empty under the review.
			//
			// It is `fit` and not `auto` because `auto` snaps, and a step that
			// snapped was the reason this was fixed in the first place: the panel
			// collapsed under the reader's hand on the step where they had just
			// committed to something inside it. `fit` travels instead — the panel
			// follows the crumb rather than jumping behind it — and it is the travel,
			// not the size, that makes a moving container read as navigation.
			//
			// The ceiling is the screen. A region with places enough covers the map,
			// which is the honest answer for a step that has that much to show: the
			// crumb above is how the reader gets back to it, and 85dvh would strand
			// the last rows behind a scroll the screen had room for. A dragged
			// height still beats all of this and holds until close.
			height="fit"
			open={open}
			onOpenChange={onOpenChange}
			aria-label={title}
		>
			{/* No top padding: the handle above carries it, so the title sits directly
			    under the grip rather than a step below it. */}
			<Flex justify="between" align="start" gap="md" className="px-6">
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

					{place ? <PlaceMeta place={place} /> : null}
				</Stack>

				<DrawerClose>
					<ToggleIconButton icon={<Icon icon={<X />} />} aria-label="Close" />
				</DrawerClose>
			</Flex>

			<DrawerBody>
				{place ? (
					<Stack gap="md" className="pb-6">
						{/* A plain `img`, not `next/image`: the address is whatever the reader
						    typed, and optimising an arbitrary remote host means listing that
						    host first. The name is the alt text because it is the one thing
						    known about what the picture shows.

						    One square, stated on both axes, so every place reads the same
						    however its photo was shot. `max-h-48 w-full` clamped the tall
						    ones only: a panoramic shot scaled to the panel's width came out
						    under the cap and drew a thin strip, a portrait one filled it, and
						    the address below them landed somewhere different each time — and
						    on a wide panel the picture ran the whole width, which is a banner
						    rather than a thumbnail. A square answers both, and it holds its
						    size as the panel resizes, where a full-width band grew with it.

						    Stating the size also reserves the space before the picture
						    arrives; unsized, the `img` laid out at nothing and shoved the
						    text down on load. `object-cover` fills the box and crops the
						    overflow, which is what makes one size honest for any aspect. */}
						{place.photo ? (
							<img
								src={place.photo}
								alt={place.name}
								loading="lazy"
								className="size-32 rounded-lg bg-white/5 object-cover"
							/>
						) : null}

						<Text>{place.address}</Text>

						{place.url ? (
							<Link href={place.url} target="_blank" underline rel="noopener noreferrer">
								{place.url}
							</Link>
						) : null}

						{place.review ? (
							<>
								<Divider className="my-2" />

								<Stack gap="sm">
									<Text className="font-medium">Your review</Text>

									<Text>{place.review}</Text>
								</Stack>
							</>
						) : null}
					</Stack>
				) : (
					<Stack gap="md">
						{/* Over the list rather than in the header, because it narrows the
						    list and not the panel — and only where there is more than one
						    category to choose between. */}
						{spanned > 1 ? (
							<CategoryPicker
								value={categories}
								onValueChange={setCategories}
								className="w-full sm:w-52"
							/>
						) : null}

						{shown.length === 0 ? (
							<Text severity="warning">
								No places match the selected {categories.length > 1 ? 'categories' : 'category'}.
							</Text>
						) : (
							<List items={[...shown]} sortable={false} getKey={(item) => item.id}>
								{(item) => (
									// The `onClick` marks the row interactive, which is where its
									// cursor, focus ring, and hover wash come from — the card variant's
									// wash being an opaque step, so a hovered row stays a surface over
									// the map rather than turning see-through to it.
									<ListItem
										onClick={() => {
											setOpenedId(item.id)

											setListing(false)
										}}
									>
										<Stack gap="sm" className="text-left">
											<Text className="font-medium">{item.name}</Text>

											<PlaceMeta place={item} />
										</Stack>
									</ListItem>
								)}
							</List>
						)}
					</Stack>
				)}
			</DrawerBody>

			{/* Only over a place, because both actions act on one. A list row is a way
			    into a place, not a place — an Edit over the list would have nothing to
			    open. They sit where the form drawer's own actions sit, so the panel a
			    reader edits in and the panel they edit from answer the same corner. */}
			{place ? (
				<DrawerFooter>
					<Flex justify="end" align="center" gap="sm" full>
						<Button
							variant="plain"
							color="blue"
							prefix={<Icon icon={<Pencil />} />}
							onClick={() => onEdit(place)}
						>
							Edit
						</Button>

						<Button
							variant="plain"
							color="red"
							prefix={<Icon icon={<Trash />} />}
							onClick={() => onDelete(place)}
						>
							Delete
						</Button>
					</Flex>
				</DrawerFooter>
			) : null}
		</Drawer>
	)
}
