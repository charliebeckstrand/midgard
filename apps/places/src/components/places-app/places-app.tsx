'use client'

import type { User } from 'auth'
import { MapPin, MapPinCheck } from 'lucide-react'
import { Activity, useCallback, useEffect, useMemo, useState } from 'react'
import { Alert } from 'ui/alert'
import { Confirm } from 'ui/confirm'
import { ReadyReveal } from 'ui/primitives/ready-reveal'
import { AppearanceSettings } from 'ui/providers/appearance'
import { Flex } from 'ui/structure/flex'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
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
	type PlaceView,
	regionOf,
	stateOf,
	UNITED_STATES_VIEW,
	viewAtlas,
	viewCrumbs,
	viewForPlace,
	viewKey,
	viewMark,
	viewRegion,
	viewUp,
} from '../../utilities/places-view'
import { CountrySearch } from '../country-search'
import { PlaceDrawer } from '../place-drawer'
import { PlaceFilters, PlaceFiltersSkeleton } from '../place-filters'
import { PlaceFormDrawer } from '../place-form-drawer'
import { PlaceTrail } from '../place-trail'
import { PlacesIndex } from '../places-index'
import { PlacesMap } from '../places-map'
import { UserMenu } from '../user-menu'
import { usePlaceLocation } from './use-place-location'

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
 * The places of `filtered` that `byRegion` puts in `cut`, or all of them when
 * `cut` is `null`.
 */
function placesInRegion(
	filtered: Place[],
	byRegion: ReadonlyMap<string, readonly Place[]>,
	cut: string | null,
): Place[] {
	if (cut === null) return filtered

	const inRegion = new Set(byRegion.get(cut)?.map((place) => place.id) ?? [])

	return filtered.filter((place) => inRegion.has(place.id))
}

/**
 * The app: a map filling the screen, a header over it, and the two drawers that
 * dock from the bottom.
 *
 * It owns every piece of state the panels share — the filter, the view, and
 * which place is open — because each of them is read by more than one child and
 * none of them belongs to a single panel. `user` is the signed-in user, for the
 * menu.
 */
export function PlacesApp({ user }: { user: User }) {
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

	// That grouping inverted, which four readers want: the countries grouping
	// trusts it ahead of its own geometry, the opening rule counts it, the open
	// panel's trail names a group by it, and the index both says where a row is
	// and resolves the view a picked row opens on.
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

	// Fetched as soon as a view draws it, and otherwise once the opening view has
	// settled. The world then waits in the cache behind the United States, so a
	// step back out to it draws at once instead of on a skeleton. It waits for the
	// settle so that it never competes with the states atlas and the places for the
	// first frame.
	const { data: countriesAtlas = null } = useAtlas('countries', atlas === 'countries' || !settling)

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

	// Which region holds each place, against the geometry the map draws. Memoized
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

	// The countries grouping inverted, held in its own slot for the reason the
	// grouping is: one settled answer per atlas.
	const countryOfPlace = useMemo(() => regionOf(placesByCountry), [placesByCountry])

	// The region the open drawer stands in — the list its first crumb leads back
	// to, which for a lone dot is the only list there is.
	//
	// Read out of the drawn grouping's own inverse, so the crumb names the region
	// the map would open rather than the string the geocoder happened to return.
	// Picked the same way the grouping above is, rather than inverted from it:
	// inside the United States the drawn grouping is the states one, which is
	// already inverted, and inverting the pick would walk it a second time.
	const regionOfPlace = atlas === 'states' ? stateOfPlace : countryOfPlace

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

	const shown = useMemo(
		() => placesInRegion(filtered, placesByRegion, cut),
		[filtered, cut, placesByRegion],
	)

	// The view that the reader is about to open, and the view that the reader was
	// on when the request came. The map for it renders hidden, keyed on the view,
	// so a pick shows a map that React already rendered. A request from a view
	// that the reader left is stale, and nothing renders for it.
	const [preload, setPreload] = useState<{ from: string; view: PlaceView } | null>(null)

	const here = viewKey(view)

	const preloaded =
		preload !== null && preload.from === here && viewKey(preload.view) !== here
			? preload.view
			: null

	// The country search and the map both ask for it: the search for its active
	// option, and the map for the region that the pointer stays on.
	const onPreload = useCallback(
		(region: string) => setPreload({ from: here, view: drillInto(view, region) }),
		[here, view],
	)

	// The props of the hidden map, from the same sources as the visible map.
	const preloadedMap = useMemo(() => {
		if (preloaded === null) return null

		const at = viewAtlas(preloaded)

		return {
			view: preloaded,
			regions: at === 'states' ? statesAtlas : countriesAtlas,
			places: placesInRegion(
				filtered,
				at === 'states' ? placesByState : placesByCountry,
				viewRegion(preloaded),
			),
			visited: new Set(visits[at]),
		}
	}, [preloaded, statesAtlas, countriesAtlas, filtered, placesByState, placesByCountry, visits])

	// Held, because the drawer keys its own trail on this: a fresh arrow each
	// render would rebuild those steps whatever else stayed still.
	const onNavigate = useCallback(
		(region: string) => setView(drillInto(view, region)),
		[view, setView],
	)

	// The page's own trail, as steps that navigate. Every crumb but the last goes
	// back to the view it names; the last is where the reader is and leads nowhere.
	const pageTrail = useMemo(
		() =>
			viewCrumbs(view).map((crumb, at, all) => ({
				label: crumb.label,
				onPick: at === all.length - 1 ? undefined : () => setView(crumb.view),
			})),
		[view, setView],
	)

	return (
		<Flex direction="col" className="h-full">
			<Flex
				justify="between"
				align="center"
				gap="md"
				className="shrink-0 border-b border-zinc-950/10 dark:border-white/10 px-6 py-4"
			>
				{/* The title is the trail: "Places" alone at the top, and a step per level
				    under it, where every crumb but the last is the way back. It carries the
				    heading's own size rather than the breadcrumb's, so the line reads as the
				    page title it is and does not shrink on a drill.

				    `min-w-0` on the wrapper is what lets the trail give way at all: without
				    it this flex child holds its full width and pushes the controls beside it
				    off the row instead of truncating. `flex-1` is what lets it come back: the
				    trail measures the box it is given, and a box that shrinks to the trail
				    would narrow with it and never report the room to expand again. */}
				{/* The trail and the toggle together, because the toggle acts on the
				    region the last crumb names — not on the app, which is what the
				    cluster on the far side holds. `min-w-0` stays on the trail alone, so
				    the crumbs give way and the button never does. */}
				<Flex gap="md" align="center" className="flex-1 min-w-0">
					<div className="min-w-0">
						<PlaceTrail
							className="text-xl/8"
							steps={pageTrail}
							// The search is on the world map only. Under it, the reader
							// already chose a country, and the trail names it.
							after={
								view.country === null && !settling ? (
									<CountrySearch
										countries={regionNames}
										onPick={(country) => setView(drillInto(view, country))}
										onPreload={onPreload}
									/>
								) : undefined
							}
						/>
					</div>

					{/* The visited toggle. It is a button rather than a checkbox, because
					    the reader does not check a place as visited — they mark it as such.
					    The button's own state is the visited state, so the reader sees what
					    they are about to do and the action is a single click rather than a
					    check and a submit.

					    An icon and not a label, so it reads as a mark on the title rather
					    than a second title beside it. It stays on screen rather than coming
					    in on hover, because its pressed state is an answer the reader looks
					    for, and a touch screen has no hover to show it. The tooltip names
					    the region, because the view does not always say it: over the United
					    States the map draws states, and the toggle marks the country. */}
					{mark === null ? null : (
						<Tooltip>
							<TooltipTrigger>
								<ToggleIconButton
									pressed={marked}
									onPressedChange={(visited) => setVisit.mutate({ ...mark, visited })}
									icon={<MapPin />}
									pressedIcon={<MapPinCheck />}
									color={marked ? 'green' : 'zinc'}
									aria-label="Visited"
									className="shrink-0"
								/>
							</TooltipTrigger>

							<TooltipContent>
								{marked ? `${mark.region} is marked visited` : `Mark ${mark.region} visited`}
							</TooltipContent>
						</Tooltip>
					)}
				</Flex>

				<Flex gap="sm" align="center" className="shrink-0">
					<AppearanceSettings />

					{/* The list item shows only once there is a list to read. Over an empty
					    store it would open on an empty sheet.
					    The count shows only where the view is cut to one region, because it
					    is the count of that region: `shown` is the list of the bar,
					    narrowed to the cut. */}
					<UserMenu
						user={user}
						count={cut !== null && shown.length > 0 ? shown.length : undefined}
						onAdd={() => setAdding(true)}
						onList={places.length > 0 ? () => setListing(true) : undefined}
					/>
				</Flex>
			</Flex>

			{settling || places.length > 0 ? (
				// No padding on this wrapper: the rail carries its own, so the whole
				// padded band sits inside the scroll container and a wheel anywhere over
				// it scrolls — the strip above and below the controls included.
				<div className="shrink-0 border-b border-zinc-950/10 dark:border-white/10">
					{/* A skeleton stands in for the bar until the view settles: the region
					    picker lists the atlas, and the other fields filter the places. The
					    bar stays mounted under the skeleton and sizes the band, so the
					    reveal moves nothing.

					    `min-w-0` goes on each layer. Without it, the grid column of the
					    reveal takes the full width of the rail, and the rail cannot
					    scroll. */}
					<ReadyReveal
						ready={!settling}
						placeholder={<PlaceFiltersSkeleton />}
						className="*:min-w-0"
					>
						<PlaceFilters
							value={filter}
							onValueChange={setFilter}
							regionNames={regionNames}
							regionLabel={REGION_LABEL[atlas]}
							drilled={cut}
							onDrill={(region) =>
								setView(region === null ? (viewUp(view) ?? view) : drillInto(view, region))
							}
						/>
					</ReadyReveal>
				</div>
			) : null}

			<div className="relative min-h-0 flex-1">
				{/* Each map is keyed on its view. When the reader goes to the view of the
				    hidden map, React keeps that map and shows it, and does not render a
				    new one. `<Activity>` renders the hidden map at a low priority and
				    starts none of its effects until it shows. */}
				<Activity key={here}>
					<PlacesMap
						// Held back until the view settles. Otherwise the map draws the United
						// States first and then jumps to the frame that the places ask for.
						regions={settling ? null : regions}
						places={shown}
						view={view}
						visited={visited}
						visitedRegions={filter.visitedRegions}
						onDrill={(region) => setView(drillInto(view, region))}
						onPreload={onPreload}
						selected={selected[0] ?? null}
						onSelect={(picked) => setSelected(picked.map((place) => place.id))}
					/>
				</Activity>

				{preloadedMap === null ? null : (
					<Activity key={viewKey(preloadedMap.view)} mode="hidden">
						<PlacesMap
							regions={preloadedMap.regions}
							places={preloadedMap.places}
							view={preloadedMap.view}
							visited={preloadedMap.visited}
							visitedRegions={filter.visitedRegions}
							onDrill={(region) => setView(drillInto(preloadedMap.view, region))}
							selected={null}
							onSelect={(picked) => setSelected(picked.map((place) => place.id))}
						/>
					</Activity>
				)}

				{error ? (
					<div className="absolute inset-x-0 top-0 p-6">
						<Alert severity="error">
							<Text>{error.message}</Text>
						</Alert>
					</div>
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
				regionByPlace={regionOfPlace}
				// The region the view is cut to, which the sheet opens on where it holds
				// anything. The reader came from that projection, so it is the narrowing
				// they already made; clearing the filter widens it back to the bar's.
				region={cut}
				// The state, but only where the region column is not already it: inside
				// the United States the drawn region is the state, and the two columns
				// would print every state beside itself.
				stateByPlace={atlas === 'states' ? undefined : stateOfPlace}
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
				onNavigate={onNavigate}
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
