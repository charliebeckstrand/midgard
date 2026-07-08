import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { type ComponentProps, useState } from 'react'
import statesUrl from 'us-atlas/states-10m.json?url'
import { Stack } from '../../../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../../components/tabs'
import {
	fetchOsrmRoute,
	type LngLat,
	type MapGeography,
	MapMarker,
	MapPlat,
	MapPoint,
	MapRoute,
	type MapRouteResult,
} from '../../../../modules/map'
import { Example as ExampleFrame } from '../../../engine'
import {
	corridors,
	ikeaDestinations,
	ikeaHub,
	laToChicago,
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

// Atlas data stays out of the package (and the docs bundle): the demos fetch
// the TopoJSON from us-atlas as a static asset and cache it with react-query,
// standing a MapSkeleton in while it loads — the same shape a consumer's
// lazily-loaded geography takes.
//
// Fetching runs through react-query so a result outlives the tab that asked for
// it: switching away and back reads the cache instead of refetching, and a tab
// warms on hover before it opens (see `onPreload` below). The query definitions
// live in these factories so the render hooks and the preload prefetch key the
// same entry — the route a hover warms is the one the panel reads. The plat
// itself never fetches; this is the geocode → route → draw flow a consumer runs,
// and where they would point react-query at their own data.

/** The us-atlas TopoJSON, fetched once and cached (static, so it never restales). */
function geographyQuery(url: string) {
	return {
		queryKey: ['us-atlas', url] as const,
		queryFn: () => fetch(url).then((response) => response.json() as Promise<MapGeography>),
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
function useGeography(url: string): MapGeography | null {
	return useQuery(geographyQuery(url)).data ?? null
}

/**
 * The routed leg for an overlay; `null` while it loads or if routing fails, so
 * callers fall back to the straight line the overlay draws without a `path`.
 */
function useRoute(start: LngLat, end: LngLat): MapRouteResult | null {
	return useQuery(routeQuery(start, end)).data ?? null
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
									regionId={(feature) => String(feature.properties?.name)}
									animate
									legend="right"
								/>
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="point">
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
