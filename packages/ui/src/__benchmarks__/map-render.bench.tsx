/**
 * MapPlat's jsdom render cost, and the geometry cache underneath it. The
 * competitive suite one directory down scores the module against Highcharts
 * Maps and ECharts in a real browser; this one localizes — the mount rungs
 * separate a pre-decoded GeoJSON from a topology that must decode first, the
 * cold/warm pair isolates what the static-geometry cache saves on a remount,
 * and the cascade scenarios drive a mounted plat so a hover or a legend
 * emphasis reads as re-render cost alone.
 */

import { fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import counties from 'us-atlas/counties-10m.json'
import states from 'us-atlas/states-10m.json'
import { bench, describe } from 'vitest'
import { type MapGeography, MapPlat, type MapTopology } from '../modules/map'
import {
	cachedCanonicalPaths,
	computeStaticMapGeometry,
	staticMapGeometry,
} from '../modules/map/engine/map-geometry/cache'
import { geographyFeatures } from '../modules/map/engine/map-geometry/topology'
import { defaultRegionId } from '../modules/map/engine/map-region/identity'
import { mountBench, persistentTree } from './harness'

const statesTopo = states as unknown as MapTopology

const countiesTopo = counties as unknown as MapTopology

const ZONES = ['Pacific', 'Mountain', 'Central', 'Eastern'] as const

// Round-robins every region through the zones, so each category paints regions.
const stateRows = geographyFeatures(statesTopo).map((feature, index) => ({
	state: defaultRegionId(feature),
	zone: ZONES[index % ZONES.length] as string,
}))

// Decoded once: `geographyFeatures` re-walks every arc of the atlas per call,
// and both the rows and the pre-decoded collection below want the same features.
const countyFeatures = geographyFeatures(countiesTopo)

const countyRows = countyFeatures.map((feature, index) => ({
	county: defaultRegionId(feature),
	zone: ZONES[index % ZONES.length] as string,
}))

const countiesGeo: MapGeography = { type: 'FeatureCollection', features: countyFeatures }

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
		// The paths are a call of their own, so the bar has to make it or it
		// measures two thirds of what it names — the decode and the fit, which is
		// where a `deferPaint` mount genuinely stops. Uncached by construction: the
		// geometry is a fresh object each iteration, so it misses the paths memo.
		const paths = cachedCanonicalPaths(
			computeStaticMapGeometry(statesTopo, undefined, 'albers-usa'),
		)

		if (paths.length === 0) throw new Error('fixture drew no paths')
	})

	bench('warm: cache hit (a remount / second plat on the same atlas)', () => {
		staticMapGeometry(statesTopo, undefined, 'albers-usa')
	})
})

/** Pointer moves per iteration — enough that per-move cascade work accumulates. */
const MOVES = 10

/** Mounts a plat for the whole run and hands back the elements the cascade scenarios drive. */
function cascade(node: ReactElement) {
	const container = persistentTree(node)

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
