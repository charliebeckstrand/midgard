/**
 * MapPlat's jsdom render cost, and the geometry cache underneath it. The
 * competitive suite one directory down scores the module against Highcharts
 * Maps and ECharts in a real browser; this one localizes — the mount rungs
 * separate a pre-decoded GeoJSON from a topology that must decode first, the
 * cold/warm pair isolates what the static-geometry cache saves on a remount,
 * and the cascade scenarios drive a mounted plat so a hover or a legend
 * emphasis reads as re-render cost alone.
 */

import { fireEvent, render } from '@testing-library/react'
import type { ReactElement } from 'react'
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

// Round-robins every region through the zones, so each category paints regions.
const stateRows = geographyFeatures(statesTopo).map((feature, index) => ({
	state: defaultRegionId(feature),
	zone: ZONES[index % ZONES.length] as string,
}))

const countyRows = geographyFeatures(countiesTopo).map((feature, index) => ({
	county: defaultRegionId(feature),
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

function countiesPlat() {
	return <MapPlat aria-label="Counties" geography={countiesGeo} width={800} />
}

/**
 * One mount-plus-teardown bench, tearing down only its own tree.
 *
 * @remarks Deliberately not the shared `mountBench`: that one ends on
 * `cleanup()`, which unmounts *every* tree the testing library holds — and the
 * cascade scenarios below mount their plats at collection time and drive them
 * for the whole run. A tree-local `unmount` leaves those standing.
 */
function mountBench(name: string, element: () => ReactElement) {
	bench(name, () => {
		const { unmount, container } = render(element())

		unmount()

		container.remove()
	})
}

describe('MapPlat · mount', () => {
	mountBench('states-10m topology (52 regions, 4 categories)', statesPlat)

	mountBench('counties-10m pre-decoded GeoJSON (3143 regions)', countiesPlat)

	mountBench('counties-10m topology (3143 regions, incl. decode)', () => (
		<MapPlat aria-label="Counties" geography={countiesTopo} width={800} />
	))
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

/** Pointer moves per iteration — enough that per-move cascade work accumulates. */
const MOVES = 10

/** Mounts a plat and hands back the elements the cascade scenarios drive. */
function cascade(node: ReturnType<typeof statesPlat>) {
	const { container } = render(node)

	return {
		region: container.querySelector('[data-region-index]') as Element,
		legendItem: container.querySelector('[data-slot="map-legend-item"]') as Element,
	}
}

/** One sweep of `MOVES` pointer moves across a single region. */
function sweep(region: Element) {
	for (let move = 0; move < MOVES; move++) {
		fireEvent.pointerMove(region, { clientX: 100 + move, clientY: 100 })
	}
}

/** One legend emphasis: enter, then leave. */
function emphasize(legendItem: Element) {
	fireEvent.pointerEnter(legendItem)

	fireEvent.pointerLeave(legendItem)
}

describe('MapPlat · hover cascade (states, 52 regions)', () => {
	const { region, legendItem } = cascade(statesPlat())

	bench(`${MOVES} pointermoves over one region`, () => sweep(region))

	bench('legend emphasis enter + leave', () => emphasize(legendItem))
})

describe('MapPlat · hover cascade (counties, 3143 regions)', () => {
	const { region } = cascade(countiesPlat())

	bench(`${MOVES} pointermoves over one region`, () => sweep(region))
})

describe('MapPlat · legend cascade (counties, 3143 regions + legend)', () => {
	// A legend emphasis re-renders the plat: the region layer must repaint (its
	// fills dim) but the visually-hidden table reads neither hidden nor
	// emphasis, so its memo holds a 3143-row re-map on every enter and leave.
	const { legendItem } = cascade(
		<MapPlat
			aria-label="Counties"
			geography={countiesGeo}
			data={countyRows}
			regionKey="county"
			categoryKey="zone"
			width={800}
		/>,
	)

	bench('legend emphasis enter + leave', () => emphasize(legendItem))
})
