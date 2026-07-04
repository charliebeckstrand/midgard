import { fireEvent, render } from '@testing-library/react'
import counties from 'us-atlas/counties-10m.json'
import states from 'us-atlas/states-10m.json'
import { bench, describe } from 'vitest'
import { type MapGeography, MapPlat, type MapTopology } from '../modules/map'
import { defaultRegionId } from '../modules/map/map-categories'
import { geographyFeatures } from '../modules/map/map-geometry'
import { computeStaticMapGeometry, staticMapGeometry } from '../modules/map/map-geometry-cache'

const statesTopo = states as unknown as MapTopology

const countiesTopo = counties as unknown as MapTopology

const ZONES = ['Pacific', 'Mountain', 'Central', 'Eastern'] as const

const stateRows = geographyFeatures(statesTopo).map((feature, index) => ({
	state: defaultRegionId(feature),
	zone: ZONES[index % ZONES.length] as string,
}))

const countiesGeo: MapGeography = {
	type: 'FeatureCollection',
	features: geographyFeatures(countiesTopo),
}

const countyRows = geographyFeatures(countiesTopo).map((feature, index) => ({
	county: defaultRegionId(feature),
	zone: ZONES[index % ZONES.length] as string,
}))

function statesPlat() {
	return (
		<MapPlat
			aria-label="States"
			geography={statesTopo}
			data={stateRows}
			regionKey="state"
			categoryKey="zone"
			width={800}
		/>
	)
}

describe('MapPlat · mount', () => {
	bench('states-10m topology (52 regions, 4 categories)', () => {
		const { unmount } = render(statesPlat())

		unmount()
	})

	bench('counties-10m pre-decoded GeoJSON (3143 regions)', () => {
		const { unmount } = render(
			<MapPlat aria-label="Counties" geography={countiesGeo} width={800} />,
		)

		unmount()
	})

	bench('counties-10m topology (3143 regions, incl. decode)', () => {
		const { unmount } = render(
			<MapPlat aria-label="Counties" geography={countiesTopo} width={800} />,
		)

		unmount()
	})
})

describe('static geometry · cold vs warm (states-10m)', () => {
	// Warm the shared cache once, so the warm case measures a pure cache hit.
	staticMapGeometry(statesTopo, undefined, 'albers-usa')

	bench('cold: decode + canonical fit + paths (every mount, uncached)', () => {
		computeStaticMapGeometry(statesTopo, undefined, 'albers-usa')
	})

	bench('warm: cache hit (a remount / second plat on the same atlas)', () => {
		staticMapGeometry(statesTopo, undefined, 'albers-usa')
	})
})

describe('MapPlat · hover cascade (states, 52 regions)', () => {
	const { container } = render(statesPlat())

	const region = container.querySelector('[data-slot="map-region"]') as Element

	const legendItem = container.querySelector('[data-slot="map-legend-item"]') as Element

	bench('10 pointermoves over one region', () => {
		for (let i = 0; i < 10; i++) {
			fireEvent.pointerMove(region, { clientX: 100 + i, clientY: 100 })
		}
	})

	bench('legend emphasis enter + leave', () => {
		fireEvent.pointerEnter(legendItem)

		fireEvent.pointerLeave(legendItem)
	})
})

describe('MapPlat · hover cascade (counties, 3143 regions)', () => {
	const { container } = render(
		<MapPlat aria-label="Counties" geography={countiesGeo} width={800} />,
	)

	const region = container.querySelector('[data-slot="map-region"]') as Element

	bench('10 pointermoves over one region', () => {
		for (let i = 0; i < 10; i++) {
			fireEvent.pointerMove(region, { clientX: 100 + i, clientY: 100 })
		}
	})
})

describe('MapPlat · legend cascade (counties, 3143 regions + legend)', () => {
	// A legend emphasis re-renders the plat: the region layer must repaint (its
	// fills dim) but the visually-hidden table reads neither hidden nor
	// emphasis, so its memo holds a 3143-row re-map on every enter and leave.
	const { container } = render(
		<MapPlat
			aria-label="Counties"
			geography={countiesGeo}
			data={countyRows}
			regionKey="county"
			categoryKey="zone"
			width={800}
		/>,
	)

	const legendItem = container.querySelector('[data-slot="map-legend-item"]') as Element

	bench('legend emphasis enter + leave', () => {
		fireEvent.pointerEnter(legendItem)

		fireEvent.pointerLeave(legendItem)
	})
})
