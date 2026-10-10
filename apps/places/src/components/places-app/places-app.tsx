'use client'

import type { User } from 'auth'
import { MapPin, MapPinCheck } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Activity, useCallback, useEffect, useMemo, useState } from 'react'
import type { Seed } from 'shared/queries'
import { Alert } from 'ui/alert'
import { type ConfirmOptions, useConfirm } from 'ui/confirm'
import { DateTime } from 'ui/date-time'
import { useIdleLoad } from 'ui/hooks'
import { AppearanceSettings } from 'ui/providers/appearance'
import { Flex } from 'ui/structure/flex'
import { Text } from 'ui/text'
import { ToggleIconButton } from 'ui/toggle-icon-button'
import { Tooltip, TooltipContent, TooltipTrigger } from 'ui/tooltip'
import { flags } from '../../flags'
import {
	useAddPlace,
	useDeletePlace,
	useDeleteVisit,
	usePlaces,
	useSavePlace,
	useSetVisit,
	useVisits,
} from '../../queries/places-queries'
import type { Place, Visit, Visits } from '../../types'
import { atlasBounded, atlasNames, atlasRegions } from '../../utilities/places-atlas'
import { DAY_FORMAT, filterPlaces } from '../../utilities/places-filter'
import { groupByRegion, regionName } from '../../utilities/places-geography'
import type { PaletteSource } from '../../utilities/places-palette'
import {
	COUNTRY_SNAP_KM,
	countryOf,
	drillInto,
	groupTrail,
	initialView,
	knownCountry,
	type PlaceAtlas,
	type PlaceView,
	pickerRegions,
	regionOf,
	regionsHolding,
	stateOf,
	viewAtlas,
	viewCrumbs,
	viewFor,
	viewKey,
	viewMark,
	viewRegion,
	viewUp,
} from '../../utilities/places-view'
import { PlaceFilters } from '../place-filters'
import type { PlaceFormTarget } from '../place-form-drawer'
import type { PlaceActions, VisitActions } from '../place-menu'
import { actionSource, PlacePalette, placeSource, regionSource } from '../place-palette'
import { PlaceTrail, type PlaceTrailStep } from '../place-trail'
import { PlacesMap } from '../places-map'
import { UserMenu } from '../user-menu'
import { LazyPanel } from './lazy-panel'
import { usePlaceLocation } from './use-place-location'

/**
 * The code of the index, of the form drawer, and of the place drawer, which a
 * reader opens after the map, if at all. The index carries the data grid, the
 * form carries the address search and the date picker, and the place drawer
 * carries the list and the ratings. Together they are more than a quarter of
 * the JavaScript of the page, so the page does not wait for them.
 */
const loadIndex = () => import('../places-index')

const loadForm = () => import('../place-form-drawer')

const loadDrawer = () => import('../place-drawer')

/** Loads the code of the three panels. {@link usePanelPrefetch} calls it in idle time. */
const loadPanels = () => Promise.all([loadIndex(), loadForm(), loadDrawer()])

/**
 * The three panels. {@link LazyPanel} renders them and tells where each gets a
 * Suspense boundary. They take no `loading` option: that gives each one a
 * boundary of its own, and a panel that the address opens then paints a frame
 * after the page.
 */
const PlacesIndex = dynamic(() => loadIndex().then((module) => module.PlacesIndex))

const PlaceFormDrawer = dynamic(() => loadForm().then((module) => module.PlaceFormDrawer))

const PlaceDrawer = dynamic(() => loadDrawer().then((module) => module.PlaceDrawer))

/**
 * The target of the form for a new place. It is held so that its identity is
 * stable, because the drawer takes a new target as a new open.
 */
const NEW_PLACE: PlaceFormTarget = { kind: 'place', place: null }

/** The empty list a pending places query stands in for, held so its identity is stable. */
const NO_PLACES: Place[] = []

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
 * The view that the region picker of the bar opens: the view cut to `region`,
 * or the view one step up when the reader clears the pick. The top view stays
 * where it is.
 */
function drillOrUp(view: PlaceView, region: string | null): PlaceView {
	return region === null ? (viewUp(view) ?? view) : drillInto(view, region)
}

/**
 * The places of the last step of `trail`: a state's where the trail reached
 * one, the drawn region's otherwise. Empty where the trail is empty.
 */
function trailPlaces(
	trail: readonly string[],
	byState: ReadonlyMap<string, readonly Place[]>,
	byRegion: ReadonlyMap<string, readonly Place[]>,
): readonly Place[] {
	const deepest = trail[trail.length - 1]

	if (deepest === undefined) return NO_PLACES

	return (trail.length > 1 ? byState : byRegion).get(deepest) ?? NO_PLACES
}

/**
 * The props of a map for `view`, from the same sources as the map that shows:
 * the atlas that the view draws, the filtered places in its cut, and the
 * visited regions of that atlas.
 */
function mapForView<Regions>(
	view: PlaceView,
	sources: {
		atlases: (atlas: PlaceAtlas) => Regions
		groupings: Record<PlaceAtlas, ReadonlyMap<string, readonly Place[]>>
		filtered: Place[]
		visits: Visits
	},
) {
	const at = viewAtlas(view)

	return {
		view,
		regions: sources.atlases(at),
		places: placesInRegion(sources.filtered, sources.groupings[at], viewRegion(view)),
		visited: new Set(sources.visits[at]),
	}
}

/**
 * The visited toggle of the region that the last crumb names. The tooltip
 * names the region, because the view does not always show it.
 */
function VisitedToggle({
	region,
	marked,
	onMarkedChange,
}: {
	region: string
	marked: boolean
	onMarkedChange: (visited: boolean) => void
}) {
	return (
		<Tooltip>
			<TooltipTrigger>
				<ToggleIconButton
					pressed={marked}
					onPressedChange={onMarkedChange}
					icon={<MapPin />}
					pressedIcon={<MapPinCheck />}
					color={marked ? 'green' : 'zinc'}
					aria-label="Visited"
					className="shrink-0"
				/>
			</TooltipTrigger>

			<TooltipContent>
				{marked ? `${region} is marked visited` : `Mark ${region} visited`}
			</TooltipContent>
		</Tooltip>
	)
}

/** What a delete removes: a whole place, or one of its visits. */
type Deletion = { place: Place; visit: Visit | null }

/**
 * Whether a delete removes the whole place. A place keeps at least one visit,
 * so a delete of its only visit also deletes the place.
 */
function deletesPlace({ place, visit }: Deletion): boolean {
	return visit === null || place.visits.length === 1
}

/**
 * The question before a delete. It names the place, or the day of the visit.
 * When the visit is the only one, it also says that the place goes with it.
 */
function deleteQuestion(deletion: Deletion): ConfirmOptions {
	const { place, visit } = deletion

	return {
		title:
			visit === null ? (
				`Delete "${place.name}"?`
			) : (
				<>
					Delete the visit on <DateTime value={visit.visitedAt} format={DAY_FORMAT} />?
				</>
			),
		description:
			visit !== null && deletesPlace(deletion)
				? `This is the only visit to "${place.name}", so the place is deleted too.`
				: undefined,
		confirm: { label: 'Delete', color: 'red' },
	}
}

/**
 * Fetches the code of the panels when the main thread is idle after the mount,
 * and tells when all of it has loaded. `useIdleLoad` schedules the fetch. The
 * browser runs the code of a chunk when it arrives, so a fetch at the mount ran
 * it while the page hydrated.
 *
 * The app renders each panel closed from that point on. The render that first
 * shows a lazy panel suspends, also when its code is in the cache, and React
 * holds the content of a boundary that showed its fallback for 300 ms
 * (`FALLBACK_THROTTLE_MS`). A panel that suspended on its first open thus came
 * up about 300 ms after the tap. A closed panel suspends while nothing is on
 * the screen, and the first open renders it at once.
 */
function usePanelPrefetch(): boolean {
	return useIdleLoad(loadPanels) !== undefined
}

/**
 * The action commands of the palette: add a place, open the list where there
 * are places, and mark the region of the view as visited.
 */
function useActionCommands({
	mark,
	marked,
	hasPlaces,
	onAdd,
	setListing,
	onMark,
}: {
	mark: { scope: PlaceAtlas; region: string } | null
	marked: boolean
	hasPlaces: boolean
	onAdd: () => void
	setListing: (listing: boolean) => void
	onMark: (mark: { scope: PlaceAtlas; region: string; visited: boolean }) => void
}) {
	// Keyed on the fields of the mark: `viewMark` gives a new object on each render.
	const markScope = mark?.scope ?? null

	const markRegion = mark?.region ?? null

	return useMemo(
		() =>
			actionSource({
				onAdd,
				onList: hasPlaces ? () => setListing(true) : undefined,
				mark: markRegion,
				marked,
				onMark: (visited) => {
					if (markScope !== null && markRegion !== null) {
						onMark({ scope: markScope, region: markRegion, visited })
					}
				},
			}),
		[hasPlaces, markScope, markRegion, marked, onAdd, setListing, onMark],
	)
}

/** Props for {@link PlacesHeader}. */
type PlacesHeaderProps = {
	user: User
	/** The page trail, as steps that navigate. */
	steps: readonly PlaceTrailStep[]
	/** The region that the visited toggle acts on, or `null` for no toggle. */
	mark: { scope: PlaceAtlas; region: string } | null
	/** Whether the reader marked that region as visited. */
	marked: boolean
	onMarkedChange: (mark: { scope: PlaceAtlas; region: string; visited: boolean }) => void
	paletteSources: PaletteSource[]
	/** The one region that the view is cut to, or `null`. */
	cut: string | null
	/** The number of places that the bar admits in the cut. */
	count: number
	/** Whether the store holds a place, so the list has rows to show. */
	hasPlaces: boolean
	onAdd: () => void
	onList: () => void
}

/**
 * The header over the map: the page trail with the visited toggle, and the
 * palette, the appearance settings, and the user menu.
 */
function PlacesHeader({
	user,
	steps,
	mark,
	marked,
	onMarkedChange,
	paletteSources,
	cut,
	count,
	hasPlaces,
	onAdd,
	onList,
}: PlacesHeaderProps) {
	return (
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
				    off the row instead of truncating. `flex-1` gives the trail the row's full
				    width, which is the room its fit measures.

				    The toggle goes inside the trail, because it acts on the region the last
				    crumb names — not on the app, which is what the cluster on the far side
				    holds. Inside, it shares the trail's row, so the crumbs give way and the
				    button never does. */}
			<div className="flex-1 min-w-0">
				<PlaceTrail className="text-xl/8" steps={steps}>
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
						<VisitedToggle
							region={mark.region}
							marked={marked}
							onMarkedChange={(visited) => onMarkedChange({ ...mark, visited })}
						/>
					)}
				</PlaceTrail>
			</div>

			<Flex gap="sm" align="center" className="shrink-0">
				<PlacePalette sources={paletteSources} />

				<AppearanceSettings />

				{/* The list item shows only once there is a list to read. Over an empty
					    store it would open on an empty sheet.
					    The count shows only where the view is cut to one region, because it
					    is the count of that region: `count` is the length of the list of
					    the bar, narrowed to the cut. */}
				<UserMenu
					user={user}
					count={cut !== null && count > 0 ? count : undefined}
					onAdd={onAdd}
					onList={hasPlaces ? onList : undefined}
				/>
			</Flex>
		</Flex>
	)
}

/**
 * The region that holds the first place of `selected`, or `null` where nothing
 * is selected or no region holds it.
 */
function regionOfFirst(
	selected: readonly Place[],
	regionOfPlace: ReadonlyMap<string, string>,
): string | null {
	const first = selected[0]

	if (first === undefined) return null

	return regionOfPlace.get(first.id) ?? null
}

/**
 * The view of a preload request that is still live: one that came from the
 * view `here`, and that goes to another view. Else `null`.
 */
function livePreload(
	preload: { from: string; view: PlaceView } | null,
	here: string,
): PlaceView | null {
	if (preload === null || preload.from !== here) return null

	return viewKey(preload.view) === here ? null : preload.view
}

/** The error of the places query, over the top of the map. */
function PlacesError({ error }: { error: Error | null }) {
	if (!error) return null

	return (
		<div className="absolute inset-x-0 top-0 p-6">
			<Alert severity="error">
				<Text>{error.message}</Text>
			</Alert>
		</div>
	)
}

/**
 * The app: a map filling the screen, a header over it, and the two drawers that
 * dock from the bottom.
 *
 * It owns every piece of state the panels share — the filter, the view, and
 * which place is open — because each of them is read by more than one child and
 * none of them belongs to a single panel. `user` is the signed-in user, for the
 * menu. `places` and `visits` are the places and the visited set that the page
 * read on the server. With them, the filter bar and the Visited toggle are
 * correct on the first paint.
 */
export function PlacesApp({
	user,
	places: initialPlaces,
	visits: initialVisits,
}: {
	user: User
	places: Seed<Place[]>
	visits: Seed<Visits>
}) {
	const { data: places, error } = usePlaces(initialPlaces)

	const addPlace = useAddPlace()

	const savePlace = useSavePlace()

	const deletePlace = useDeletePlace()

	const deleteVisit = useDeleteVisit()

	const { data: visits } = useVisits(initialVisits)

	const setVisit = useSetVisit()

	// Where the reader is: the view, the filter, what the open panel stands for,
	// and the step of its trail that it shows, all read from the address bar rather than held here. `view` is `null`
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
		step,
		adding,
		setView,
		setFilter,
		setSelected,
		setStep,
		settleView,
		openAt,
		setAdding,
	} = usePlaceLocation()

	// An edit of a place or a visit to one, or `null`. A new place is not held
	// here: the address holds it, so that a reload or a shared link opens the form
	// again.
	const [form, setForm] = useState<PlaceFormTarget | null>(null)

	// What the form drawer writes, or `null` while it is closed.
	const formTarget = form ?? (adding ? NEW_PLACE : null)

	// Whether the index is up. Its own bit rather than a mode of the drawers: it
	// docks from the side and they dock from the bottom, so a reader can have a
	// place open and the list open at once — which is what opening one from the
	// other leaves them with.
	const [listing, setListing] = useState(false)

	const confirm = useConfirm()

	// A delete is the one action here the reader cannot undo — the store keeps
	// no history — so it is the one that asks first. It names the place, because
	// a reader who opened a summary has several in front of them.
	const remove = useCallback(
		async (deletion: Deletion) => {
			if (!(await confirm(deleteQuestion(deletion)))) return

			const { place, visit } = deletion

			if (visit === null || deletesPlace(deletion)) {
				deletePlace.mutate(place.id)

				return
			}

			deleteVisit.mutate({ place, visit })
		},
		[confirm, deletePlace.mutate, deleteVisit.mutate],
	)

	// What the menus of a place and of a visit do, in every spot that shows one.
	// Held, because the index columns and the palette source are memos keyed on it.
	const actions = useMemo<PlaceActions & VisitActions>(
		() => ({
			onAddVisit: (place) => setForm({ kind: 'visit', place, visit: null }),
			onEdit: (place) => setForm({ kind: 'place', place }),
			onDelete: (place) => void remove({ place, visit: null }),
			onEditVisit: (place, visit) => setForm({ kind: 'visit', place, visit }),
			onDeleteVisit: (place, visit) => void remove({ place, visit }),
		}),
		[remove],
	)

	// Held for the palette's action source, which is a memo keyed on it.
	const onAdd = useCallback(() => setAdding(true), [setAdding])

	// Which state holds each place. It answers the opening question — a collection
	// the states atlas accounts for whole is a collection inside the United States
	// — and it is the grouping the app uses whenever the view draws states.
	const placesByState = useMemo(
		() => groupByRegion(() => atlasBounded('states'), places, stateOf),
		[places],
	)

	// That grouping inverted, which four readers want: the countries grouping
	// trusts it ahead of its own geometry, the opening rule counts it, the open
	// panel's trail names a group by it, and the index both says where a row is
	// and resolves the view a picked row opens on.
	const stateOfPlace = useMemo(() => regionOf(placesByState), [placesByState])

	// The view: the address's, or the smallest geography this app draws that holds
	// every place until the address states one. The atlases are in the code and the
	// places come from the server, so the opening rule reads the whole answer on
	// the first render.
	const opening = initialView(stateOfPlace, places)

	const view = stated ?? opening

	// The opening view, written down on the mount. Until it is, "the world" and
	// "nothing stated yet" are the same empty address, and a reader who walked out
	// to the world would be sent back by their own reload. It carries no history
	// entry, so the Back button still leaves the app rather than stepping through a
	// view the reader never chose.
	useEffect(() => {
		if (stated === null) settleView(opening)
	}, [stated, opening, settleView])

	const atlas = viewAtlas(view)

	const panelsLoaded = usePanelPrefetch()

	const formOpen = formTarget !== null

	const regions = atlasRegions(atlas)

	// The one region the view is cut to, which the picker and the crumbs share.
	const cut = viewRegion(view)

	// What the Visited button acts on. It is not the cut: inside the United States
	// the frame draws every state and is cut to none of them, so the country would
	// be the one region on the map a reader could never mark — they cross into it
	// and it stops being somewhere they are. Its scope is its own, because that
	// country is marked among countries while the atlas under it draws states.
	//
	// `null` while the visited regions feature is off, which takes the toggle and
	// the Mark visited command away together.
	const mark = flags.visitedRegions ? viewMark(view) : null

	const marked = mark !== null && visits[mark.scope].includes(mark.region)

	// The visited regions of the drawn atlas, as a set — the shape the map and the
	// toggle both ask it in. The two scopes are held apart in the store because
	// Georgia is a state and Georgia is a country.
	const visited = useMemo(() => new Set(visits[atlas]), [visits, atlas])

	// Every region the drawn atlas holds, for the picker inside the United States.
	// Read off the geography rather than the places, so a state holding nothing is
	// still somewhere the reader can go.
	const regionNames = useMemo(
		() => regions.features.map(regionName).sort((a, b) => a.localeCompare(b)),
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
	// The world geometry is a function, so the grouping decodes the world only
	// for a place that the states do not settle.
	const placesByCountry = useMemo(
		() =>
			groupByRegion(() => atlasBounded('countries'), places, countryOf, {
				known: knownCountry(stateOfPlace),
				snapKm: COUNTRY_SNAP_KM,
			}),
		[places, stateOfPlace],
	)

	const selected = useMemo(() => {
		if (selectedIds.length === 0) return NO_PLACES

		const byId = new Map(places.map((place) => [place.id, place]))

		return selectedIds.map((id) => byId.get(id)).filter((place) => place !== undefined)
	}, [selectedIds, places])

	// The countries grouping inverted, held in its own slot for the reason the
	// grouping is: one settled answer per atlas.
	const countryOfPlace = useMemo(() => regionOf(placesByCountry), [placesByCountry])

	// The grouping of the drawn atlas, and its inverse. The inverse gives the
	// region the open drawer stands in — the list its first crumb leads back
	// to, which for a lone dot is the only list there is.
	//
	// Read out of the drawn grouping's own inverse, so the crumb names the region
	// the map would open rather than the string the geocoder happened to return.
	// Picked the same way the grouping is, rather than inverted from it:
	// inside the United States the drawn grouping is the states one, which is
	// already inverted, and inverting the pick would walk it a second time.
	//
	// The state of each place goes to the index only where the region column is
	// not already it: inside the United States the drawn region is the state, and
	// the two columns would print every state beside itself.
	const { placesByRegion, regionOfPlace, stateByPlace } =
		atlas === 'states'
			? { placesByRegion: placesByState, regionOfPlace: stateOfPlace, stateByPlace: undefined }
			: {
					placesByRegion: placesByCountry,
					regionOfPlace: countryOfPlace,
					stateByPlace: stateOfPlace,
				}

	// The regions the bar's picker offers. Among countries, only the ones that
	// hold a place: the palette reaches every other one. Among states the
	// picker is the only list, so it keeps every state the atlas draws. Read off
	// the unfiltered places for the reason the grouping is.
	const pickedRegions = useMemo(
		() =>
			atlas === 'states' ? regionNames : pickerRegions(regionsHolding(places, countryOfPlace), cut),
		[atlas, regionNames, places, countryOfPlace, cut],
	)

	const openedRegion = regionOfFirst(selected, regionOfPlace)

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
	const openedRegionPlaces = useMemo(
		() => trailPlaces(trail, placesByState, placesByRegion),
		[trail, placesByState, placesByRegion],
	)

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

	const preloaded = livePreload(preload, here)

	// The palette and the map both ask for it: the palette for the region of its
	// active row, and the map for the region that the pointer stays on.
	const preloadView = useCallback(
		(next: PlaceView) => setPreload({ from: here, view: next }),
		[here],
	)

	const onPreload = useCallback(
		(region: string) => preloadView(drillInto(view, region)),
		[preloadView, view],
	)

	// The props of the hidden map, from the same sources as the visible map.
	const preloadedMap = useMemo(
		() =>
			preloaded === null
				? null
				: mapForView(preloaded, {
						atlases: atlasRegions,
						groupings: { states: placesByState, countries: placesByCountry },
						filtered,
						visits,
					}),
		[preloaded, filtered, placesByState, placesByCountry, visits],
	)

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

	// The palette's sources. Each has its own memo, so a change to one does not
	// build the others again: the regions sort more than 200 names.
	const placeCommands = useMemo(
		() => placeSource(places, (place) => openAt(viewFor(stateOfPlace, place), [place.id]), actions),
		[places, openAt, stateOfPlace, actions],
	)

	// Every region of both atlases, whatever the view draws, so a reader can go to
	// a country that holds no places, or to a state from anywhere.
	const regionCommands = useMemo(
		() =>
			regionSource({
				countries: atlasNames('countries'),
				states: atlasNames('states'),
				countryPlaces: placesByCountry,
				statePlaces: placesByState,
				goTo: setView,
				preload: preloadView,
			}),
		[placesByCountry, placesByState, setView, preloadView],
	)

	const actionCommands = useActionCommands({
		mark,
		marked,
		hasPlaces: places.length > 0,
		onAdd,
		setListing,
		onMark: setVisit.mutate,
	})

	const paletteSources = useMemo(
		() => [placeCommands, regionCommands, actionCommands],
		[placeCommands, regionCommands, actionCommands],
	)

	return (
		<Flex direction="col" className="h-full">
			{/* The panels come first in the document, ahead of the map. A panel that
			    the address opens renders in place on the server, and the browser can
			    paint a document that it has not parsed to the end. After the map, the
			    panel could miss that paint, and the map showed for a frame with no
			    panel over it. Each panel covers the page from a layer of its own, so
			    the order changes nothing on the screen. */}

			{/* One drawer for both writes, opened on a place to edit it and on nothing
			    to add one. Two would be the same seven fields twice. */}
			<LazyPanel open={formOpen} loaded={panelsLoaded}>
				<PlaceFormDrawer
					target={formTarget}
					onOpenChange={(next) => {
						if (next) return

						setForm(null)

						if (adding) setAdding(false)
					}}
					onSubmit={(draft) => {
						const place = formTarget?.place ?? null

						return place === null
							? addPlace.mutateAsync(draft)
							: savePlace.mutateAsync({ id: place.id, draft })
					}}
				/>
			</LazyPanel>

			{/* The other index into the same set: the map answers what is near here,
			    and this answers where that place was. It reads the filtered list, so
			    the two never disagree about what is in play. */}
			<LazyPanel open={listing} loaded={panelsLoaded}>
				<PlacesIndex
					open={listing}
					onOpenChange={setListing}
					places={filtered}
					regionByPlace={regionOfPlace}
					// The region the view is cut to, which the sheet opens on where it holds
					// anything. The reader came from that projection, so it is the narrowing
					// they already made; clearing the filter widens it back to the bar's.
					region={cut}
					stateByPlace={stateByPlace}
					actions={actions}
					onOpen={(place) => {
						// One step, not two: the view and the selection are both the address,
						// so writing them apart would leave a history entry standing on a map
						// the reader never saw — and the second write would drop the first.
						openAt(viewFor(stateOfPlace, place), [place.id])

						setListing(false)
					}}
				/>
			</LazyPanel>

			<LazyPanel open={selected.length > 0} loaded={panelsLoaded}>
				<PlaceDrawer
					places={selected}
					trail={trail}
					regionPlaces={openedRegionPlaces}
					step={step}
					onStepChange={setStep}
					onNavigate={onNavigate}
					onOpenChange={() => setSelected([])}
					actions={actions}
				/>
			</LazyPanel>

			<PlacesHeader
				user={user}
				steps={pageTrail}
				mark={mark}
				marked={marked}
				onMarkedChange={(next) => setVisit.mutate(next)}
				paletteSources={paletteSources}
				cut={cut}
				count={shown.length}
				hasPlaces={places.length > 0}
				onAdd={onAdd}
				onList={() => setListing(true)}
			/>

			{/* The bar shows only when there are places to filter. The places come
			    from the server, so the bar is there on the first paint and the map
			    under it never changes size. A reader with no places never sees it. */}
			{places.length > 0 ? (
				// No padding on this wrapper: the rail carries its own, so the whole
				// padded band sits inside the scroll container and a wheel anywhere over
				// it scrolls — the strip above and below the controls included.
				<div className="shrink-0 border-b border-zinc-950/10 dark:border-white/10">
					<PlaceFilters
						value={filter}
						onValueChange={setFilter}
						regionNames={pickedRegions}
						regionLabel={REGION_LABEL[atlas]}
						drilled={cut}
						onDrill={(region) => setView(drillOrUp(view, region))}
					/>
				</div>
			) : null}

			<div className="relative min-h-0 flex-1">
				{/* Each map is keyed on its view. When the reader goes to the view of the
				    hidden map, React keeps that map and shows it, and does not render a
				    new one. `<Activity>` renders the hidden map at a low priority and
				    starts none of its effects until it shows. */}
				<Activity key={here}>
					<PlacesMap
						regions={regions}
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

				<PlacesError error={error} />
			</div>
		</Flex>
	)
}
