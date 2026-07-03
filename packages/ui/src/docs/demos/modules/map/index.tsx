import { type ReactNode, useEffect, useState } from 'react'
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
	MapSkeleton,
} from '../../../../modules/map'
import { Example } from '../../../engine'
import {
	corridors,
	ikeaDestinations,
	ikeaHub,
	laToChicago,
	timezones,
	warehouses,
	zoneCategories,
} from './data'

// Atlas data stays out of the package (and the docs bundle): the demos fetch
// the TopoJSON from us-atlas as a static asset on first render, standing a
// MapSkeleton in while it loads — the same shape a consumer's lazy-loaded
// geography takes.
function useGeography(url: string): MapGeography | null {
	const [geography, setGeography] = useState<MapGeography | null>(null)

	useEffect(() => {
		let cancelled = false

		fetch(url)
			.then((response) => response.json())
			.then((json: MapGeography) => {
				if (!cancelled) setGeography(json)
			})
			.catch(() => {})

		return () => {
			cancelled = true
		}
	}, [url])

	return geography
}

// Fetch the road route between two coordinates from the OSRM demo server, once
// per pair (aborted on unmount). `null` while it loads or if routing fails, so
// callers fall back to the straight line the overlay draws without a `path`.
// The public demo server is rate-limited and non-commercial; a real app points
// `fetchOsrmRoute` at a self-hosted OSRM through its `baseUrl` option.
function useRoute(start: LngLat, end: LngLat): MapRouteResult | null {
	const [route, setRoute] = useState<MapRouteResult | null>(null)

	const [sx, sy] = start

	const [ex, ey] = end

	useEffect(() => {
		let active = true

		const controller = new AbortController()

		setRoute(null)

		fetchOsrmRoute(
			[
				[sx, sy],
				[ex, ey],
			],
			{ signal: controller.signal },
		).then((result) => {
			if (active && result) setRoute(result)
		})

		return () => {
			active = false

			controller.abort()
		}
	}, [sx, sy, ex, ey])

	return route
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

// The skeleton reserves the map frame's aspect box itself, so the swap to the
// loaded plat causes no layout shift.
function Loading() {
	return <MapSkeleton />
}

const Container = ({ children, size = 'lg' }: { children: ReactNode; size?: string }) => {
	const sizeMap: Record<string, string> = {
		sm: 'sm:max-w-sm',
		md: 'md:max-w-md',
		lg: 'lg:max-w-4xl',
	}

	return <div className={size ? `${sizeMap[size]}` : undefined}>{children}</div>
}

export function Demo() {
	const states = useGeography(statesUrl)

	return (
		<Tabs defaultValue="plat">
			<Stack gap="lg">
				<TabList aria-label="Map feature">
					<Tab value="plat">Plat</Tab>
					<Tab value="point">Point</Tab>
					<Tab value="marker">Marker</Tab>
					<Tab value="route">Route</Tab>
				</TabList>

				<TabContents>
					<TabContent value="plat">
						<Stack gap="xl">
							<Example title="Default">
								<Container>
									{/* geography is optional: the plat reserves its frame and
									    paints the map in when the atlas lands — no guard here. */}
									<MapPlat
										aria-label="Default map plat"
										geography={states}
										projection="albers-usa"
									/>
								</Container>
							</Example>

							<Example title="Timezones across America">
								<Container>
									{states ? (
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
										/>
									) : undefined}
								</Container>
							</Example>
						</Stack>
					</TabContent>

					<TabContent value="point">
						<Example title="Warehouses">
							<Container>
								{states === null ? (
									<Loading />
								) : (
									<MapPlat
										aria-label="Warehouse network"
										geography={states}
										projection="albers-usa"
										animate
									>
										{warehouses.map((warehouse) => (
											<MapPoint key={warehouse.label} {...warehouse} />
										))}
									</MapPlat>
								)}
							</Container>
						</Example>
					</TabContent>

					<TabContent value="marker">
						<Example title="Line haul">
							<Container>
								{states === null ? (
									<Loading />
								) : (
									<MapPlat
										aria-label="Line haul"
										geography={states}
										projection="albers-usa"
										animate
									>
										<RoutedMarker
											label="LA → Chicago"
											start={laToChicago.start}
											end={laToChicago.end}
										/>
									</MapPlat>
								)}
							</Container>
						</Example>
					</TabContent>

					<TabContent value="route">
						<Stack gap="xl">
							<Example title="IKEA distribution network">
								<Container>
									{states === null ? (
										<Loading />
									) : (
										// Each run is a MapMarker: an origin pin at the shared Kansas
										// City hub, a destination pin, and the road route between them
										// fetched from OSRM. Each draws itself in once its route lands.
										// Pointing a legend entry dims the rest, clicking toggles it off.
										<MapPlat
											aria-label="IKEA distribution network"
											geography={states}
											projection="albers-usa"
											animate
										>
											{ikeaDestinations.map((destination) => (
												<RoutedMarker
													key={destination.city}
													label={`Kansas City → ${destination.city}`}
													start={ikeaHub}
													end={destination.at}
												/>
											))}
										</MapPlat>
									)}
								</Container>
							</Example>

							<Example title="Long-haul corridors">
								<Container>
									{states === null ? (
										<Loading />
									) : (
										<MapPlat
											aria-label="Long-haul corridors"
											geography={states}
											projection="albers-usa"
											animate
										>
											{corridors.map((corridor) => (
												<RoutedLine
													key={corridor.label}
													label={corridor.label}
													start={corridor.start}
													end={corridor.end}
												/>
											))}
										</MapPlat>
									)}
								</Container>
							</Example>
						</Stack>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}
