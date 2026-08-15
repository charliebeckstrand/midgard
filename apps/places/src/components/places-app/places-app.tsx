'use client'

import { Check, List, MapPin, Plus } from 'lucide-react'
import { Fragment, type MouseEvent, useEffect, useMemo, useState } from 'react'
import { Alert } from 'ui/alert'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'
import { Button } from 'ui/button'
import { Confirm } from 'ui/confirm'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { Text } from 'ui/text'
import {
	useAddPlace,
	useAtlas,
	useDeletePlace,
	usePlaces,
	useSavePlace,
	useSetVisit,
	useVisits,
} from '../../queries/places-queries'
import type { Place, Visits } from '../../types'
import { filterPlaces } from '../../utilities/places-filter'
import { boundRegions, groupPlacesByRegion, regionName } from '../../utilities/places-geography'
import {
	COUNTRY_SNAP_KM,
	countryOf,
	drillInto,
	groupTrail,
	initialView,
	knownCountry,
	regionOf,
	stateOf,
	UNITED_STATES_VIEW,
	viewAtlas,
	viewCrumbs,
	viewForPlace,
	viewMark,
	viewRegion,
} from '../../utilities/places-view'
import { PlaceDrawer } from '../place-drawer'
import { PlaceFilters } from '../place-filters'
import { PlaceFormDrawer } from '../place-form-drawer'
import { PlacesIndex } from '../places-index'
import { PlacesMap } from '../places-map'
import { usePlaceLocation } from './use-place-location'

/** The title crumbs' weight, held on the crumb so it beats the current one's `font-normal`. */
const TITLE_CRUMB = 'font-semibold'

/** The empty list a pending places query stands in for, held so its identity is stable. */
const NO_PLACES: Place[] = []

/** The same, for the visited regions of both scopes. */
const NO_VISITS: Visits = { states: [], countries: [] }

/** What the region picker calls itself, per atlas. */
const REGION_LABEL = {
	states: 'All states',
	countries: 'All countries',
}

/**
 * The app: a map filling the screen, a header over it, and the two drawers that
 * dock from the bottom.
 *
 * It owns every piece of state the panels share — the filter, the view, and
 * which place is open — because each of them is read by more than one child and
 * none of them belongs to a single panel.
 */
export function PlacesApp() {
	const { data: places = NO_PLACES, isPending, error } = usePlaces()

	const addPlace = useAddPlace()

	const savePlace = useSavePlace()

	const deletePlace = useDeletePlace()

	const { data: visits = NO_VISITS } = useVisits()

	const setVisit = useSetVisit()

	// Where the reader is: the view, the filter, and what the open panel stands
	// for, all read from the address bar rather than held here. `view` is `null`
	// until the address states one, which is what leaves the opening rule below
	// the say exactly once.
	//
	// The selection is ids rather than the records themselves, because a record
	// here is a snapshot: read back through the live list, an edit reaches the open
	// panel and a delete closes it, where a held record would go on showing what
	// the store dropped.
	const {
		view: stated,
		filter,
		selected: selectedIds,
		setView,
		setFilter,
		setSelected,
		settleView,
		openAt,
	} = usePlaceLocation()

	const [adding, setAdding] = useState(false)

	// Whether the index is up. Its own bit rather than a mode of the drawers: it
	// docks from the side and they dock from the bottom, so a reader can have a
	// place open and the list open at once — which is what opening one from the
	// other leaves them with.
	const [listing, setListing] = useState(false)

	// The place the form drawer is editing, and the place the confirmation stands
	// over. Both are `null` for "no such panel", which is also what opens the form
	// on a new place.
	const [editing, setEditing] = useState<Place | null>(null)

	const [deleting, setDeleting] = useState<Place | null>(null)

	// The states atlas answers the opening question, so it is fetched whatever the
	// view — and it is the atlas the app opened on before it drew anywhere else.
	// The countries atlas is fetched only once a view asks for it, so a reader who
	// never leaves the United States never pays for it.
	const { data: statesAtlas = null } = useAtlas('states')

	// Nothing settles the view until both the atlas and the places have landed: an
	// opening rule read off half the answer would open on the world and jump back.
	const settling = statesAtlas === null || isPending

	// Each region beside its bounding box, one memo per atlas. Keyed on its own
	// atlas alone — which never changes for the tab's life — so adding a place does
	// not re-measure 56 states, and crossing back out to the world does not
	// re-measure 177 countries from a topology the cache never dropped.
	const boundedStates = useMemo(() => boundRegions(statesAtlas), [statesAtlas])

	// Which state holds each place. It answers the opening question — a collection
	// the states atlas accounts for whole is a collection inside the United States
	// — and it is the grouping the app uses whenever the view draws states.
	const placesByState = useMemo(
		() => groupPlacesByRegion(boundedStates, places, stateOf),
		[boundedStates, places],
	)

	// That grouping inverted, which three readers want: the countries grouping
	// trusts it ahead of its own geometry, the opening rule counts it, and a row
	// picked in the index resolves through it.
	const stateOfPlace = useMemo(() => regionOf(placesByState), [placesByState])

	// The view: the address's, or the smallest geography this app draws that holds
	// every place until the address states one.
	const opening = settling ? UNITED_STATES_VIEW : initialView(stateOfPlace, places)

	const view = stated ?? opening

	// The opening view, written down as soon as it is settled. Until it is, "the
	// world" and "nothing stated yet" are the same empty address, and a reader who
	// walked out to the world would be sent back by their own reload. It carries no
	// history entry, so the Back button still leaves the app rather than stepping
	// through a view the reader never chose.
	useEffect(() => {
		if (stated === null && !settling) settleView(opening)
	}, [stated, settling, opening, settleView])

	const atlas = viewAtlas(view)

	// Fetched only once a view draws it, so a reader whose places are all inside
	// the United States never pays for the world.
	const { data: countriesAtlas = null } = useAtlas('countries', atlas === 'countries')

	const regions = atlas === 'states' ? statesAtlas : countriesAtlas

	// The one region the view is cut to, which the picker and the crumbs share.
	const cut = viewRegion(view)

	// What the Visited button acts on. It is not the cut: inside the United States
	// the frame draws every state and is cut to none of them, so the country would
	// be the one region on the map a reader could never mark — they cross into it
	// and it stops being somewhere they are. Its scope is its own, because that
	// country is marked among countries while the atlas under it draws states.
	const mark = viewMark(view)

	const marked = mark !== null && visits[mark.scope].includes(mark.region)

	// The visited regions of the drawn atlas, as a set — the shape the map and the
	// toggle both ask it in. The two scopes are held apart in the store because
	// Georgia is a state and Georgia is a country.
	const visited = useMemo(() => new Set(visits[atlas]), [visits, atlas])

	// The countries' own boxes, keyed on their own atlas for the same reason the
	// states' are: shared with the states in one slot, every crossing back out to
	// the world re-measured all 177 of them from a topology the cache still held.
	const boundedCountries = useMemo(() => boundRegions(countriesAtlas), [countriesAtlas])

	// Every region the drawn atlas holds, for the picker that projects one. Read
	// off the geography rather than the places, so a region holding nothing is
	// still somewhere the reader can go.
	const regionNames = useMemo(
		() => (regions?.features ?? []).map(regionName).sort((a, b) => a.localeCompare(b)),
		[regions],
	)

	// Which region holds each place, against the geometry the map draws. Memoised
	// because it walks the regions for every place and this component re-renders on
	// each drawer, filter, and drill.
	//
	// It reads the unfiltered places on purpose: the regions a reader can drill are
	// the regions that hold places, not the regions holding places the bar
	// currently admits — otherwise a drill would open and close as they narrowed
	// it.
	//
	// Its own slot per atlas, so the drawn one is a pick between two settled
	// answers rather than a recompute on every crossing. The countries grouping
	// takes what the states already settled as its `known`: see `knownCountry` for
	// why the coarse world outline defers to the finer atlas, and what it saves.
	const placesByCountry = useMemo(
		() =>
			groupPlacesByRegion(boundedCountries, places, countryOf, {
				known: knownCountry(stateOfPlace),
				snapKm: COUNTRY_SNAP_KM,
			}),
		[boundedCountries, places, stateOfPlace],
	)

	const placesByRegion = atlas === 'states' ? placesByState : placesByCountry

	const selected = useMemo(() => {
		if (selectedIds.length === 0) return NO_PLACES

		const byId = new Map(places.map((place) => [place.id, place]))

		return selectedIds.map((id) => byId.get(id)).filter((place) => place !== undefined)
	}, [selectedIds, places])

	// The region the open drawer stands in — the list its first crumb leads back
	// to, which for a lone dot is the only list there is.
	//
	// Read out of the drawn grouping's own inverse, so the crumb names the region
	// the map would open rather than the string the geocoder happened to return.
	const regionOfPlace = useMemo(() => regionOf(placesByRegion), [placesByRegion])

	const openedRegion =
		selected[0] === undefined ? null : (regionOfPlace.get(selected[0].id) ?? null)

	// The regions the open panel names itself with, and the list under them.
	//
	// A summary dot on the world map often merges one town's worth of places, so
	// where the whole group shares a state the trail says so and the list is that
	// state's — the country it drew in is the coarser answer to a question the
	// reader can see the answer to.
	const trail = useMemo(
		() => groupTrail(openedRegion, selected, stateOfPlace),
		[openedRegion, selected, stateOfPlace],
	)

	// The last step's places: a state's where the trail reached one, the drawn
	// region's otherwise. Empty where nothing holds the group, which the panel
	// reads as "stand the picked group in for a list".
	const openedRegionPlaces = useMemo(() => {
		const deepest = trail[trail.length - 1]

		if (deepest === undefined) return NO_PLACES

		return (trail.length > 1 ? placesByState : placesByRegion).get(deepest) ?? NO_PLACES
	}, [trail, placesByState, placesByRegion])

	// What the bar admits, then what the view holds — in that order, because the
	// view is a frame over the filtered set and not a filter of its own.
	const filtered = useMemo(() => filterPlaces(places, filter), [places, filter])

	const shown = useMemo(() => {
		if (cut === null) return filtered

		const inRegion = new Set(placesByRegion.get(cut)?.map((place) => place.id) ?? [])

		return filtered.filter((place) => inRegion.has(place.id))
	}, [filtered, cut, placesByRegion])

	const crumbs = viewCrumbs(view)

	return (
		<Flex direction="col" className="h-full">
			<Flex
				justify="between"
				align="center"
				gap="md"
				className="shrink-0 border-b border-zinc-950/10 dark:border-white/10 px-6 py-4"
			>
				{/* The title is the trail: "Places" alone at the top, and a step per level
				    under it, where every crumb but the last is the way back. It carries
				    the heading's own size rather than the breadcrumb's, so the line reads
				    as the page title it is and does not shrink on a drill. The weight
				    rides each crumb rather than the list, because the recipe writes
				    `font-normal` on the current one — set on the list, that override
				    would leave the trail bold and its last crumb light. */}
				<Breadcrumb>
					<BreadcrumbList className="text-xl/8">
						{crumbs.map((crumb, at) => {
							const current = at === crumbs.length - 1

							// The separator is a sibling of the items and never a child of
							// one: both render an `li`, and an `li` inside an `li` is not a
							// list the parser will build — it hoists the inner one out, which
							// is a hydration mismatch and a broken trail.
							return (
								<Fragment key={crumb.label}>
									{at > 0 ? <BreadcrumbSeparator /> : null}

									<BreadcrumbItem>
										{/* `current` and `href` are independent axes: the first
										    marks the page, the second decides anchor or span. A
										    level in, every crumb above the last is both a link
										    and the way back. */}
										<BreadcrumbLink
											current={current}
											href={current ? undefined : '#'}
											className={TITLE_CRUMB}
											onClick={
												current
													? undefined
													: (event: MouseEvent) => {
															event.preventDefault()

															setView(crumb.view)
														}
											}
										>
											{crumb.label}
										</BreadcrumbLink>
									</BreadcrumbItem>
								</Fragment>
							)
						})}
					</BreadcrumbList>
				</Breadcrumb>

				<Flex gap="sm" align="center" className="shrink-0">
					{/* Only over one region, because the designation is about one. It sits
					    by the title rather than in the filter bar: the bar decides what the
					    map draws, and this records something the reader knows — the one
					    control up here that writes.

					    `soft` against Add place's `solid`, so the primary action stays the
					    one that leads. The pair reads as a state rather than a switch: what
					    it says is what is true now, and pressing it changes that. */}
					{mark === null ? null : (
						<Button
							variant={marked ? 'soft' : 'outline'}
							color={marked ? 'green' : undefined}
							prefix={<Icon icon={marked ? <Check /> : <MapPin />} />}
							aria-pressed={marked}
							onClick={() => setVisit.mutate({ ...mark, visited: !marked })}
						>
							{marked ? 'Visited' : 'Mark visited'}
						</Button>
					)}

					{/* Only once there is a list to read. Over an empty store it would open
					    on the same "no places yet" the map already says, one step further
					    from the button that fixes it. */}
					{places.length > 0 ? (
						<Button
							variant="plain"
							prefix={<Icon icon={<List />} />}
							onClick={() => setListing(true)}
						>
							All places
						</Button>
					) : null}

					<Button prefix={<Icon icon={<Plus />} />} onClick={() => setAdding(true)}>
						Add place
					</Button>
				</Flex>
			</Flex>

			{places.length > 0 ? (
				// No padding on this wrapper: the rail carries its own, so the whole
				// padded band sits inside the scroll container and a wheel anywhere over
				// it scrolls — the strip above and below the controls included.
				<div className="shrink-0 border-b border-zinc-950/10 dark:border-white/10">
					<PlaceFilters
						value={filter}
						onValueChange={setFilter}
						regionNames={regionNames}
						regionLabel={REGION_LABEL[atlas]}
						drilled={cut}
						onDrill={(region) =>
							setView(
								region === null
									? (crumbs[crumbs.length - 2]?.view ?? view)
									: drillInto(view, region),
							)
						}
					/>
				</div>
			) : null}

			<div className="relative min-h-0 flex-1">
				<PlacesMap
					regions={regions}
					places={shown}
					view={view}
					visited={visited}
					visitedRegions={filter.visitedRegions}
					onDrill={(region) => setView(drillInto(view, region))}
					selected={selected[0] ?? null}
					onSelect={(picked) => setSelected(picked.map((place) => place.id))}
				/>

				{error ? (
					<div className="absolute inset-x-0 top-0 p-6">
						<Alert severity="error">
							<Text>{error.message}</Text>
						</Alert>
					</div>
				) : null}

				{!isPending && places.length === 0 ? (
					<Flex
						direction="col"
						align="center"
						justify="center"
						gap="sm"
						// The map answers the pointer underneath, so the empty note must
						// not take the clicks meant for it.
						className="pointer-events-none absolute inset-0"
					>
						<Heading level={2}>No places yet</Heading>

						<Text>Add one and it lands on the map.</Text>
					</Flex>
				) : null}
			</div>

			{/* One drawer for both writes, opened on a place to edit it and on nothing
			    to add one. Two would be the same seven fields twice. */}
			<PlaceFormDrawer
				open={adding || editing !== null}
				onOpenChange={(next) => {
					setAdding(next)

					if (!next) setEditing(null)
				}}
				place={editing}
				onSubmit={(draft) =>
					editing === null
						? addPlace.mutateAsync(draft)
						: savePlace.mutateAsync({ id: editing.id, draft })
				}
			/>

			{/* The other index into the same set: the map answers what is near here,
			    and this answers where that place was. It reads the filtered list, so
			    the two never disagree about what is in play. */}
			<PlacesIndex
				open={listing}
				onOpenChange={setListing}
				places={filtered}
				placesByRegion={placesByRegion}
				onOpen={(place) => {
					// One step, not two: the view and the selection are both the address,
					// so writing them apart would leave a history entry standing on a map
					// the reader never saw — and the second write would drop the first.
					openAt(viewForPlace(stateOfPlace, place), [place.id])

					setListing(false)
				}}
			/>

			<PlaceDrawer
				places={selected}
				trail={trail}
				regionPlaces={openedRegionPlaces}
				onNavigate={(region) => setView(drillInto(view, region))}
				onOpenChange={() => setSelected([])}
				onEdit={setEditing}
				onDelete={setDeleting}
			/>

			{/* A delete is the one action here the reader cannot undo — the store keeps
			    no history — so it is the one that asks first. It names the place, because
			    a reader who opened a summary has several in front of them. */}
			<Confirm
				open={deleting !== null}
				onOpenChange={(next) => {
					if (!next) setDeleting(null)
				}}
				onConfirm={() => {
					if (deleting !== null) void deletePlace.mutateAsync(deleting.id)

					setDeleting(null)
				}}
				title={deleting === null ? '' : `Delete "${deleting.name}"?`}
				description={deleting === null ? undefined : 'This cannot be undone.'}
				confirm={{ label: 'Delete', color: 'red' }}
			/>
		</Flex>
	)
}
