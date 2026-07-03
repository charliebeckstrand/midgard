import { fireEvent, render } from '@testing-library/react'
import counties from 'us-atlas/counties-10m.json'
import states from 'us-atlas/states-10m.json'
import { bench, describe } from 'vitest'
import { type MapGeography, MapPlat, type MapTopology } from '../modules/map'
import { defaultRegionId } from '../modules/map/map-categories'
import { geographyFeatures } from '../modules/map/map-geometry'

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
