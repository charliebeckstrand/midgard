import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { type GeoPermissibleObjects, geoBounds, geoContains } from 'd3-geo'
import { type ComponentProps, useMemo, useState } from 'react'
import { feature } from 'topojson-client'
import statesUrl from 'us-atlas/states-10m.json?url'
import { Flex } from '../../../../components/flex'
import { Kbd } from '../../../../components/kbd'
import { Select, SelectLabel, SelectOption } from '../../../../components/select'
import { Stack } from '../../../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../../components/tabs'
import { Text } from '../../../../components/text'
import {
	fetchOsrmRoute,
	type LngLat,
	type MapFeature,
	type MapFeatureCollection,
	MapGeofence,
	type MapGeography,
	MapMarker,
	MapPlat,
	MapPoint,
	MapPoints,
	MapRoute,
	type MapRouteResult,
} from '../../../../modules/map'
import { Example as ExampleFrame } from '../../../engine'
import {
	corridors,
	deliveryStops,
	ikeaDestinations,
	ikeaHub,
	laToChicago,
	serviceAreas,
	texasMetros,
	texasTriangle,
	timezones,
	warehouses,
	zoneCategories,
} from './data'

// Every map demo renders in the same fixed-width, resizable frame so its
// responsive behaviour is visible at a glance. Wrapping the engine Example once
// here injects those defaults into all the `<Example>` call sites below —
// including AnimatedExample's — without repeating the props on each. A call site
// can still override either default by passing its own `width`/`resize`.
function Example(props: ComponentProps<typeof ExampleFrame>) {
	return <ExampleFrame width={720} minWidth={480} resize {...props} />
}

// The timezone rows key by state name, so region identity is the name rather
// than the atlas's own numeric id. Module scope, not an inline arrow: it closes
// over nothing, and a fresh identity each render would re-resolve every
// region's id — and, on the clickable map below, re-render the region layer on
// each pick.
const stateName = (feature: MapFeature) => String(feature.properties?.name)

/**
 * One state's own geometry, or the whole atlas where no state is named. Handing
 * the plat a single feature refits the projection to it — the fit it runs on
 * every geography, no zoom layer — which is the drill-down both examples below
 * frame their maps with.
 */
function stateFrame(
	geography: MapFeatureCollection | null,
	name: string | null,
): MapGeography | null {
	const held = name === null ? undefined : geography?.features.find((s) => stateName(s) === name)

	return held === undefined
		? geography
		: ({ type: 'FeatureCollection', features: [held] } satisfies MapFeatureCollection)
}

// Atlas data stays out of the package (and the docs bundle): the demos fetch
// the TopoJSON from us-atlas as a static asset, decode it once, and cache the
// result with react-query, standing a MapSkeleton in while it loads — the same
// shape a consumer's lazily-loaded geography takes. The plat draws a topology
// just as readily; these demos decode because one of them reads a single state
// out of the atlas.
//
// Fetching runs through react-query so a result outlives the tab that asked for
// it: switching away and back reads the cache instead of refetching, and a tab
// warms on hover before it opens (see `onPreload` below). The query definitions
// live in these factories so the render hooks and the preload prefetch key the
// same entry — the route a hover warms is the one the panel reads. The plat
// itself never fetches; this is the geocode → route → draw flow a consumer runs,
// and where they would point react-query at their own data.

/**
 * The us-atlas states, fetched once and cached (static, so it never restales).
 * Decoded here rather than handed to the plat as a topology: the delivery
 * example picks one state out of the atlas to draw on its own, and the plat
 * takes either form — so one decode, inside the query, serves both and outlives
 * every tab switch.
 */
function geographyQuery(url: string) {
	return {
		queryKey: ['us-atlas', url] as const,
		queryFn: async (): Promise<MapFeatureCollection> => {
			const atlas = (await fetch(url).then((response) => response.json())) as Parameters<
				typeof feature
			>[0]

			return feature(
				atlas,
				atlas.objects.states as Parameters<typeof feature>[1],
			) as unknown as MapFeatureCollection
		},
	}
}

/**
 * A road route between two coordinates from the OSRM demo server, cached per
 * pair. The public demo server is rate-limited and non-commercial; a real app
 * points `fetchOsrmRoute` at a self-hosted OSRM through its `baseUrl` option.
 * react-query supplies the abort signal, so a query dropped mid-flight cancels.
 * The route comes back at `fetchOsrmRoute`'s default `overview: 'simplified'`
 * detail — a fraction of the coordinates, sub-pixel-identical at this scale —
 * so the drawn overlay stays cheap on a cross-country leg.
 */
function routeQuery(start: LngLat, end: LngLat) {
	return {
		queryKey: ['osrm-route', start, end] as const,
		queryFn: ({ signal }: { signal: AbortSignal }) => fetchOsrmRoute([start, end], { signal }),
	}
}

/** The atlas for the plats; `null` while it loads, so the frame holds its skeleton. */
function useGeography(url: string): MapFeatureCollection | null {
	return useQuery(geographyQuery(url)).data ?? null
}

/**
 * The routed leg for an overlay; `null` while it loads or if routing fails, so
 * callers fall back to the straight line the overlay draws without a `path`.
 * A failed answer names its own reason — a rate-limited demo server reads as a
 * retryable `'http'` where an unroutable pair reads as `'no-route'` — which an
 * app surfaces in its own way and this demo drops.
 */
function useRoute(start: LngLat, end: LngLat): MapRouteResult | null {
	const answer = useQuery(routeQuery(start, end)).data

	return answer?.ok ? answer.route : null
}

/** Formats a routed distance in whole miles. */
function miles(meters: number): string {
	return `${Math.round(meters / 1609.344).toLocaleString()} mi`
}

// The routed overlays stay unmounted until the road route arrives — no
// straight-line fallback flashes first. Mounting once loaded lets the marks
// draw themselves in under the plat's `animate`.

/** A line-only route between two points, drawn on real roads once fetched. */
function RoutedLine({ label, start, end }: { label: string; start: LngLat; end: LngLat }) {
	const route = useRoute(start, end)

	if (route === null) return null

	return <MapRoute label={label} path={route.path} detail={miles(route.distanceMeters)} />
}

/** An origin → destination marker whose connecting route follows the roads. */
function RoutedMarker({ label, start, end }: { label: string; start: LngLat; end: LngLat }) {
	const route = useRoute(start, end)

	if (route === null) return null

	return (
		<MapMarker
			label={label}
			start={start}
			end={end}
			path={route.path}
			detail={miles(route.distanceMeters)}
		/>
	)
}

/**
 * `onRegionClick` and `selectedRegion` in full: clicking a state picks it, the
 * Select beside the map picks the same one, and the map rings whichever is
 * picked. One `picked` state drives both halves, so neither can disagree about
 * what is selected. Both halves are the contract — the region paths are
 * presentational inside the plot's `role="img"`, so the pointer affordance on
 * the map is an enhancement over a control that carries the keyboard.
 */
function ClickableStates({ geography }: { geography: MapGeography | null }) {
	const [picked, setPicked] = useState<string | null>(null)

	const zone = timezones.find((row) => row.state === picked)?.zone

	// Clicking the ringed state clears it, and the Select's clear button does the
	// same from the keyboard: a picker that can only ever move its pick leaves no
	// way back out of one.
	const pick = (state: string) => setPicked((prev) => (prev === state ? null : state))

	return (
		<Stack gap="md">
			<Flex>
				<Select<string>
					aria-label="State"
					placeholder="No state picked"
					value={picked}
					onValueChange={setPicked}
					displayValue={(state: string) => state}
					clearable
				>
					{timezones.map((row) => (
						<SelectOption key={row.state} value={row.state}>
							<SelectLabel>{row.state}</SelectLabel>
						</SelectOption>
					))}
				</Select>
			</Flex>

			<Text>{picked === null ? 'Pick a state.' : `${picked} — ${zone} time.`}</Text>

			<MapPlat
				aria-label="Timezones across America"
				geography={geography}
				projection="albers-usa"
				data={timezones}
				regionKey="state"
				categoryKey="zone"
				categories={zoneCategories}
				regionId={stateName}
				onRegionClick={pick}
				selectedRegion={picked}
				legend="right"
			/>
		</Stack>
	)
}

/** One state as the stop lookup below reads it: its name, its lon/lat box, and its rings. */
type StateBounds = { name: string; box: [LngLat, LngLat]; shape: GeoPermissibleObjects }

/** Each state with the box around it, measured once for the whole lookup. */
function stateBounds(features: MapFeature[]): StateBounds[] {
	return features.map((state) => {
		const shape = state as unknown as GeoPermissibleObjects

		return { name: stateName(state), box: geoBounds(shape), shape }
	})
}

/** Whether a position sits in a `geoBounds` box, which reads west past east where it wraps the antimeridian. */
function withinBox([[west, south], [east, north]]: [LngLat, LngLat], [lon, lat]: LngLat): boolean {
	const inLongitude = west <= east ? lon >= west && lon <= east : lon >= west || lon <= east

	return inLongitude && lat >= south && lat <= north
}

/**
 * Which state holds each stop, index-aligned with `deliveryStops`. Read off the
 * atlas, so no row of the data names a state the geometry already knows — and
 * the picker below offers exactly the states that hold one.
 *
 * The box test comes first because `geoContains` streams every vertex of a
 * multipolygon and this atlas carries thousands per state: on these stops it
 * takes the pass from ~85 ms to ~25 ms, which a demo panel pays on mount.
 */
function stopStates(bounds: StateBounds[]): (string | null)[] {
	return deliveryStops.map((stop) => {
		for (const state of bounds) {
			if (!withinBox(state.box, stop.at)) continue

			if (geoContains(state.shape, stop.at)) return state.name
		}

		return null
	})
}

/** A summary's readout: how many stops it stands for, and how far they spread. */
function roundSummary(count: number, span: number): string {
	return `${count} stops · ${miles(span)} across`
}

/**
 * Clustering, a state pick, and a picked stop, together. Zoomed out to the
 * nation the rounds bunch past telling apart, so `MapPoints` draws each bunch as
 * one summary graded by how many stops it holds; picking a state hands the plat
 * that state's own geometry, which refits the projection to it — the fit the
 * plat runs on every geography, no zoom layer — and the stops that fitted frame
 * has room for separate into themselves. Clustering stays on at either scale,
 * because which marks would cover one another is a question only the drawn frame
 * answers.
 *
 * Inside a state a click picks the stop instead of drilling further, and
 * `selectedOverlay` haloes it: the pick the click reports is the pick the map
 * draws, so the line of text, the halo, and the table can never disagree about
 * which stop is held.
 */
function DeliveryRounds({ geography }: { geography: MapFeatureCollection | null }) {
	const [picked, setPicked] = useState<string | null>(null)

	// The picked stop, by its index in the drawn set. Cleared with the state below,
	// since the set it counts in is the one that state holds.
	const [stop, setStop] = useState<number | null>(null)

	const pickState = (state: string | null) => {
		setPicked(state)

		setStop(null)
	}

	// Held across renders: an empty fallback rebuilt each render would re-measure
	// every state's box on every pick.
	const features = useMemo(() => geography?.features ?? [], [geography])

	const bounds = useMemo(() => stateBounds(features), [features])

	const holders = useMemo(() => stopStates(bounds), [bounds])

	const selectable = useMemo(
		() => [...new Set(holders.filter((state) => state !== null))].sort(),
		[holders],
	)

	// Memoised on the pick: the plat caches its decode and its fit against the
	// geography's identity, so a fresh collection each render would re-fit the map
	// on every keystroke elsewhere on the page.
	const frame = useMemo(() => stateFrame(geography, picked), [geography, picked])

	const stops = useMemo(
		() =>
			picked === null
				? deliveryStops
				: deliveryStops.filter((_, index) => holders[index] === picked),
		[picked, holders],
	)

	return (
		<Stack gap="md">
			<Flex>
				<Select<string>
					aria-label="State"
					placeholder="Every round"
					value={picked}
					onValueChange={pickState}
					displayValue={(state: string) => state}
					clearable
				>
					{selectable.map((state) => (
						<SelectOption key={state} value={state}>
							<SelectLabel>{state}</SelectLabel>
						</SelectOption>
					))}
				</Select>
			</Flex>

			<MapPlat
				aria-label="Delivery rounds"
				geography={frame}
				projection="albers-usa"
				animate
				legend="right"
				// The pick the click below reports, handed straight back: the halo, the
				// readout above, and the table all read the one state.
				selectedOverlay={stop === null ? null : { id: 'round', index: stop }}
			>
				<MapPoints
					id="round"
					label="Stops"
					points={stops}
					detail={`${stops.length} stops`}
					clusterDetail={roundSummary}
					// One click, two readings of it, by how far out the map sits: across
					// the nation it drills into the state under the summary, and inside a
					// state — where the stops stand apart — it picks the stop itself.
					// Picking the picked one clears it, so a pointer user has a way back
					// out.
					onClick={
						picked === null
							? (_, index) => pickState(holders[index] ?? null)
							: (_, index) => setStop((prev) => (prev === index ? null : index))
					}
				/>
			</MapPlat>
		</Stack>
	)
}

/**
 * Zoom and pan over one fitted geography — the drill-down above read the other
 * way. That one hands the plat another geography and the fit reframes; this one
 * leaves the fit alone and moves a transform over what the projection already
 * placed, so no path is reprojected and every mark holds its size. The rounds
 * that summarise at the national frame separate into their own stops as the view
 * closes on them, because a merge distance is a pixel distance and the transform
 * spreads the dots across those pixels.
 *
 * The wheel is armed by the shift key, which is the default and what this page
 * needs: the demo sits in a long scrolling page, and a map that took every wheel
 * over it would stop the reader scrolling past.
 */
function ZoomableRounds({ geography }: { geography: MapFeatureCollection | null }) {
	return (
		<Stack gap="md">
			<Text>
				Hold <Kbd>shift</Kbd> and scroll to zoom. Drag to pan.
			</Text>

			<MapPlat
				aria-label="Delivery rounds, zoomable"
				geography={geography}
				projection="albers-usa"
				legend="right"
				zoom
			>
				<MapPoints
					id="round"
					label="Stops"
					points={deliveryStops}
					detail={`${deliveryStops.length} stops`}
					clusterDetail={roundSummary}
				/>
			</MapPlat>
		</Stack>
	)
}

/**
 * A zone that answers no radius, drawn from its own ring. The plat fits whatever
 * geography it is handed, so passing Texas alone frames the corridor — the
 * drill-down `DeliveryRounds` runs on a pick, here fixed to one state.
 *
 * The metros inside stay pointable: a geofence answers the pointer along its
 * boundary and never over its fill, so a zone never swallows the marks it holds.
 */
function TexasTriangle({ geography }: { geography: MapFeatureCollection | null }) {
	// Memoised on the atlas: the plat caches its decode and its fit against the
	// geography's identity, so a fresh collection each render would refit the map.
	const frame = useMemo(() => stateFrame(geography, 'Texas'), [geography])

	return (
		<MapPlat
			aria-label="Texas Triangle corridor"
			geography={frame}
			projection="albers-usa"
			animate
			legend="right"
		>
			<MapGeofence
				label="Texas Triangle"
				boundary={texasTriangle}
				color="green"
				detail="4 metros"
			/>

			<MapPoints id="metro" label="Metros" points={texasMetros} color="rose" />
		</MapPlat>
	)
}

function MapDemo() {
	const states = useGeography(statesUrl)

	const queryClient = useQueryClient()

	// Warm a tab's routes on the first hover or focus of its trigger, before the
	// click: the overlays then draw from cache instead of a fresh OSRM round trip.
	const warm = (pairs: readonly { start: LngLat; end: LngLat }[]) => {
		for (const pair of pairs) void queryClient.prefetchQuery(routeQuery(pair.start, pair.end))
	}

	return (
		<Tabs defaultValue="plat">
			<Stack gap="lg">
				<TabList aria-label="Map feature">
					<Tab value="plat">Plat</Tab>
					<Tab value="point">Point</Tab>
					<Tab value="marker" onPreload={() => warm([laToChicago])}>
						Marker
					</Tab>
					<Tab
						value="route"
						onPreload={() =>
							warm([
								...ikeaDestinations.map((destination) => ({
									start: ikeaHub,
									end: destination.at,
								})),
								...corridors.map((corridor) => ({ start: corridor.start, end: corridor.end })),
							])
						}
					>
						Route
					</Tab>
					<Tab value="geofence">Geofence</Tab>
				</TabList>

				<TabContents fade={false}>
					<TabContent value="plat">
						<Stack gap="xl">
							<Example title="Timezones across America">
								<MapPlat
									aria-label="Timezones across America"
									geography={states}
									projection="albers-usa"
									data={timezones}
									regionKey="state"
									categoryKey="zone"
									categories={zoneCategories}
									regionId={stateName}
									animate
									legend="right"
								/>
							</Example>

							<Example title="Pick a state">
								<ClickableStates geography={states} />
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="point">
						<Stack gap="xl">
							<Example title="Warehouses">
								<MapPlat
									aria-label="Warehouse network"
									geography={states}
									projection="albers-usa"
									animate
									legend="right"
								>
									{warehouses.map((warehouse) => (
										<MapPoint
											key={warehouse.city}
											label={warehouse.city}
											at={warehouse.at}
											detail={warehouse.detail}
										/>
									))}
								</MapPlat>
							</Example>

							{/* One entry for every round, where a MapPoint each would claim a
							    legend row each and run past the eight-slot palette. Every dot
							    still names itself in the readout — and every summary names how
							    many it stands for. */}
							<Example title="Delivery rounds">
								<DeliveryRounds geography={states} />
							</Example>

							{/* The same rounds under a view transform rather than a refit: the
							    summaries break apart as the frame closes on them, and every dot,
							    hit target, and count holds its size through the whole gesture. */}
							<Example title="Zoom into the rounds">
								<ZoomableRounds geography={states} />
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="marker">
						<Example title="Line haul">
							<MapPlat
								aria-label="Line haul"
								geography={states}
								projection="albers-usa"
								animate
								legend="right"
							>
								<RoutedMarker label="LA → CHI" start={laToChicago.start} end={laToChicago.end} />
							</MapPlat>
						</Example>
					</TabContent>

					<TabContent value="route">
						<Stack gap="xl">
							<Example title="IKEA distribution network">
								<MapPlat
									aria-label="IKEA distribution network"
									geography={states}
									projection="albers-usa"
									animate
									legend="right"
								>
									{ikeaDestinations.map((destination) => (
										<RoutedMarker
											key={destination.city}
											label={`KC → ${destination.abbreviation}`}
											start={ikeaHub}
											end={destination.at}
										/>
									))}
								</MapPlat>
							</Example>

							<Example title="Long-haul corridors">
								<MapPlat
									aria-label="Long-haul corridors"
									geography={states}
									projection="albers-usa"
									animate
									legend="right"
								>
									{corridors.map((corridor) => (
										<RoutedLine
											key={corridor.city}
											label={corridor.abbreviation}
											start={corridor.start}
											end={corridor.end}
										/>
									))}
								</MapPlat>
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="geofence">
						<Stack gap="xl">
							{/* Each catchment draws before the depot it holds, so the dot sits
							    over its own wash rather than under it — and each pair shares a
							    slot colour, so the legend reads zone-and-depot as one thing. */}
							<Example title="Depot catchments">
								<MapPlat
									aria-label="Depot catchments"
									geography={states}
									projection="albers-usa"
									animate
									legend="right"
								>
									{serviceAreas.map((area) => (
										<MapGeofence
											key={area.city}
											label={`${area.city} catchment`}
											at={area.at}
											radius={area.radius}
											color={area.color}
											detail={area.detail}
										/>
									))}

									{serviceAreas.map((area) => (
										<MapPoint
											key={area.city}
											label={area.city}
											at={area.at}
											color={area.color}
											detail="Depot"
										/>
									))}
								</MapPlat>
							</Example>

							<Example title="Texas Triangle">
								<TexasTriangle geography={states} />
							</Example>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}

export function Demo() {
	// A client scoped to the demo and sitting above the tabs, so a route fetched
	// in one tab survives a switch away and back. The data is static, so nothing
	// restales, focus never refetches, and a failed OSRM call doesn't retry-storm
	// the rate-limited demo server.
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: Number.POSITIVE_INFINITY,
						retry: false,
						refetchOnWindowFocus: false,
					},
				},
			}),
	)

	return (
		<QueryClientProvider client={queryClient}>
			<MapDemo />
		</QueryClientProvider>
	)
}
