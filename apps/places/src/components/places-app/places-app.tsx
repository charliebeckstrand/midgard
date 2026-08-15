'use client'

import { Check, MapPin, Plus } from 'lucide-react'
import { type MouseEvent, useMemo, useState } from 'react'
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
	useDeletePlace,
	usePlaces,
	useSavePlace,
	useSetVisit,
	useStatesAtlas,
	useVisits,
} from '../../queries/places-queries'
import type { Place } from '../../types'
import { filterPlaces, type PlaceFilterValue } from '../../utilities/places-filter'
import { boundStates, groupPlacesByState, stateName } from '../../utilities/places-geography'
import { PlaceDrawer } from '../place-drawer'
import { PlaceFilters } from '../place-filters'
import { PlaceFormDrawer } from '../place-form-drawer'
import { PlacesMap } from '../places-map'

/** The title crumbs' weight, held on the crumb so it beats the current one's `font-normal`. */
const TITLE_CRUMB = 'font-semibold'

/** The empty list a pending places query stands in for, held so its identity is stable. */
const NO_PLACES: Place[] = []

/** The same, for the visited states. */
const NO_STATES: string[] = []

/**
 * The app: a map filling the screen, a header over it, and the two drawers that
 * dock from the bottom.
 *
 * It owns every piece of state the panels share — the filter, the drill, and
 * which place is open — because each of them is read by more than one child and
 * none of them belongs to a single panel.
 */
export function PlacesApp() {
	const { data: states = null } = useStatesAtlas()

	const { data: places = NO_PLACES, isPending, error } = usePlaces()

	const addPlace = useAddPlace()

	const savePlace = useSavePlace()

	const deletePlace = useDeletePlace()

	const { data: visitedList = NO_STATES } = useVisits()

	const setVisit = useSetVisit()

	const [filter, setFilter] = useState<PlaceFilterValue>({})

	const [drilled, setDrilled] = useState<string | null>(null)

	// What the last picked dot stood for: one place, or every place a summary
	// merged. Empty is the closed drawer.
	//
	// Ids rather than the records themselves, because a record here is a snapshot:
	// read back through the live list, an edit reaches the open panel and a delete
	// closes it, where a held record would go on showing what the store dropped.
	const [selectedIds, setSelectedIds] = useState<readonly string[]>([])

	const [adding, setAdding] = useState(false)

	// The place the form drawer is editing, and the place the confirmation stands
	// over. Both are `null` for "no such panel", which is also what opens the form
	// on a new place.
	const [editing, setEditing] = useState<Place | null>(null)

	const [deleting, setDeleting] = useState<Place | null>(null)

	const selected = useMemo(() => {
		if (selectedIds.length === 0) return NO_PLACES

		const byId = new Map(places.map((place) => [place.id, place]))

		return selectedIds.map((id) => byId.get(id)).filter((place) => place !== undefined)
	}, [selectedIds, places])

	// The visited states as a set, which is the shape the map and the toggle both
	// ask it in.
	const visited = useMemo(() => new Set(visitedList), [visitedList])

	// Each state beside its bounding box. Keyed on the atlas alone, which never
	// changes for the tab's life, so adding a place does not re-measure 56 states.
	const bounded = useMemo(() => boundStates(states), [states])

	// Every state the atlas draws, for the picker that projects one. Read off the
	// geography rather than the places, so a state holding nothing is still
	// somewhere the reader can go.
	const stateNames = useMemo(
		() => (states?.features ?? []).map(stateName).sort((a, b) => a.localeCompare(b)),
		[states],
	)

	// Which state holds each place, against the geometry the map draws. Memoised
	// because it walks the states for every place and this component re-renders on
	// each drawer, filter, and drill.
	//
	// It reads the unfiltered places on purpose: the states a reader can drill are
	// the states that hold places, not the states holding places the bar currently
	// admits — otherwise a drill would open and close as they narrowed it.
	const placesByState = useMemo(() => groupPlacesByState(bounded, places), [bounded, places])

	// The state the open drawer stands in — the list its first crumb leads back to,
	// which for a lone dot is the only list there is.
	//
	// Found by searching the grouping the map and the drill already use, so the
	// crumb names the state the map would open rather than the string the geocoder
	// happened to return. A search rather than an id index: the index cost a walk
	// of every place in every state, rebuilt on each mutation, to answer this one
	// question about one place.
	const openedState = useMemo(() => {
		const first = selected[0]

		if (first === undefined) return null

		for (const [name, list] of placesByState) {
			if (list.some((place) => place.id === first.id)) return name
		}

		return null
	}, [selected, placesByState])

	const openedStatePlaces =
		openedState === null ? NO_PLACES : (placesByState.get(openedState) ?? NO_PLACES)

	// What the bar admits, then what the drill holds — in that order, because the
	// drill is a view of the filtered set and not a filter of its own.
	const filtered = useMemo(() => filterPlaces(places, filter), [places, filter])

	const shown = useMemo(() => {
		if (drilled === null) return filtered

		const inState = new Set(placesByState.get(drilled)?.map((place) => place.id) ?? [])

		return filtered.filter((place) => inState.has(place.id))
	}, [filtered, drilled, placesByState])

	return (
		<Flex direction="col" className="h-full">
			<Flex
				justify="between"
				align="center"
				gap="md"
				className="shrink-0 border-b border-zinc-950/10 dark:border-white/10 px-6 py-4"
			>
				{/* The title is the trail: "Places" alone at the top, and "Places ›
				    {state}" a level in, where the first crumb is the way back. It
				    carries the heading's own size rather than the breadcrumb's, so the
				    line reads as the page title it is and does not shrink on a drill.
				    The weight rides each crumb rather than the list, because the recipe
				    writes `font-normal` on the current one — set on the list, that
				    override would leave the trail bold and its last crumb light. */}
				<Breadcrumb>
					<BreadcrumbList className="text-xl/8">
						<BreadcrumbItem>
							{/* `current` and `href` are independent axes: the first marks the
							    page, the second decides anchor or span. A level in, this crumb
							    is both a link and the way back. */}
							<BreadcrumbLink
								current={drilled === null}
								href={drilled === null ? undefined : '#'}
								className={TITLE_CRUMB}
								onClick={
									drilled === null
										? undefined
										: (event: MouseEvent) => {
												event.preventDefault()

												setDrilled(null)
											}
								}
							>
								Places
							</BreadcrumbLink>
						</BreadcrumbItem>

						{drilled === null ? null : (
							<>
								<BreadcrumbSeparator />

								<BreadcrumbItem>
									<BreadcrumbLink current className={TITLE_CRUMB}>
										{drilled}
									</BreadcrumbLink>
								</BreadcrumbItem>
							</>
						)}
					</BreadcrumbList>
				</Breadcrumb>

				<Flex gap="sm" align="center" className="shrink-0">
					{/* Only over a state, because the designation is about one. It sits by
					    the title rather than in the filter bar: the bar decides what the map
					    draws, and this records something the reader knows — the one control
					    up here that writes.

					    `soft` against Add place's `solid`, so the primary action stays the
					    one that leads. The pair reads as a state rather than a switch: what
					    it says is what is true now, and pressing it changes that. */}
					{drilled === null ? null : (
						<Button
							variant={visited.has(drilled) ? 'soft' : 'outline'}
							color={visited.has(drilled) ? 'green' : undefined}
							prefix={<Icon icon={visited.has(drilled) ? <Check /> : <MapPin />} />}
							aria-pressed={visited.has(drilled)}
							onClick={() => setVisit.mutate({ state: drilled, visited: !visited.has(drilled) })}
						>
							{visited.has(drilled) ? 'Visited' : 'Mark visited'}
						</Button>
					)}

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
						places={places}
						stateNames={stateNames}
						drilled={drilled}
						onDrill={setDrilled}
					/>
				</div>
			) : null}

			<div className="relative min-h-0 flex-1">
				<PlacesMap
					states={states}
					places={shown}
					visited={visited}
					visitedStates={filter.visitedStates}
					drilled={drilled}
					onDrill={setDrilled}
					selected={selected[0] ?? null}
					onSelect={(picked) => setSelectedIds(picked.map((place) => place.id))}
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

			<PlaceDrawer
				places={selected}
				state={openedState}
				statePlaces={openedStatePlaces}
				onOpenChange={() => setSelectedIds([])}
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
