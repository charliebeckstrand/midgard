import { RefreshCw } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { feature } from 'topojson-client'
import statesUrl from 'us-atlas/states-10m.json?url'
import countriesUrl from 'world-atlas/countries-50m.json?url'
import { Button } from '../../../../components/button'
import { Icon } from '../../../../components/icon'
import { Stack } from '../../../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../../components/tabs'
import {
	type MapFeature,
	type MapFeatureCollection,
	type MapGeography,
	MapMarker,
	MapPlat,
	MapPoint,
	MapRoute,
	MapSkeleton,
	type MapTopology,
} from '../../../../modules/map'
import { Example } from '../../../engine'
import { lineHaul, m1, m6, timezones, warehouses, zoneCategories } from './data'

// Atlas data stays out of the package (and the docs bundle): the demos fetch
// the TopoJSON from us-atlas / world-atlas as static assets on first render,
// standing a MapSkeleton in while it loads — the same shape a consumer's
// lazy-loaded geography takes.
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

/** The UK alone, filtered out of the world topology as a GeoJSON collection. */
function useUnitedKingdom(): MapFeatureCollection | null {
	const world = useGeography(countriesUrl)

	return useMemo(() => {
		if (world === null || world.type !== 'Topology') return null

		return {
			type: 'FeatureCollection',
			features: topologyFeatures(world, 'countries').filter(
				(entry) => entry.properties?.name === 'United Kingdom',
			),
		}
	}, [world])
}

/** Decodes one topology object to features, so the demo can filter before rendering. */
function topologyFeatures(topology: MapTopology, object: string): MapFeature[] {
	const target = topology.objects[object]

	if (!target) return []

	const decoded = feature(
		topology as unknown as Parameters<typeof feature>[0],
		target as Parameters<typeof feature>[1],
	)

	return (decoded.type === 'FeatureCollection'
		? decoded.features
		: [decoded]) as unknown as MapFeature[]
}

function Loading() {
	return (
		<div className="aspect-video w-full">
			<MapSkeleton />
		</div>
	)
}

// The mount animation plays once; a refresh button remounts the map
// (bumping its `key`) so the reveal replays on demand.
function AnimatedExample({ title, children }: { title: string; children: ReactNode }) {
	const [runKey, setRunKey] = useState(0)

	return (
		<Example
			title={title}
			actions={
				<Button
					variant="bare"
					aria-label="Replay animation"
					onClick={() => setRunKey((n) => n + 1)}
				>
					<Icon icon={<RefreshCw />} />
				</Button>
			}
		>
			<div key={runKey}>{children}</div>
		</Example>
	)
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

	const uk = useUnitedKingdom()

	return (
		<Tabs defaultValue="plat">
			<Stack gap="lg">
				<TabList aria-label="Map feature">
					<Tab value="plat">Plat</Tab>
					<Tab value="route">Route</Tab>
					<Tab value="point">Point</Tab>
					<Tab value="marker">Marker</Tab>
					<Tab value="animated">Animated</Tab>
				</TabList>
				<TabContents>
					<TabContent value="plat">
						<Example title="Timezones across America">
							<Container>
								{states === null ? (
									<Loading />
								) : (
									<MapPlat
										aria-label="Timezones across America"
										geography={states}
										projection="albers-usa"
										data={timezones}
										regionKey="state"
										categoryKey="zone"
										categories={zoneCategories}
										regionId={(feature) => String(feature.properties?.name)}
									/>
								)}
							</Container>
						</Example>
					</TabContent>

					<TabContent value="route">
						<Example title="UK motorways">
							{uk === null ? (
								<Loading />
							) : (
								<Container>
									<MapPlat aria-label="UK motorways" geography={uk} aspectRatio="16/9">
										<MapRoute label="M6" stops={m6} detail="230 mi" />

										<MapRoute label="M1" stops={m1} detail="193 mi" />
									</MapPlat>
								</Container>
							)}
						</Example>
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
									<MapPlat aria-label="Line haul" geography={states} projection="albers-usa">
										<MapMarker
											label="LA → Chicago"
											start={[-118.24, 34.05]}
											end={[-87.63, 41.88]}
											path={lineHaul}
											detail="2,015 mi"
										/>
									</MapPlat>
								)}
							</Container>
						</Example>
					</TabContent>

					<TabContent value="animated">
						<AnimatedExample title="Mount reveal">
							<Container>
								{states === null ? (
									<Loading />
								) : (
									<MapPlat
										aria-label="Timezones across America, animated"
										geography={states}
										projection="albers-usa"
										animate
									>
										<MapMarker
											label="LA → Chicago"
											start={[-118.24, 34.05]}
											end={[-87.63, 41.88]}
											path={lineHaul}
											detail="2,015 mi"
										/>
									</MapPlat>
								)}
							</Container>
						</AnimatedExample>
					</TabContent>
				</TabContents>
			</Stack>
		</Tabs>
	)
}
