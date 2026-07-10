/**
 * Redraw cost on a live map — the dashboard refresh path, the chart update
 * bench's shape over regions. Each scenario mounts every contender once
 * (top-level await; the maps stay up for the whole run) and each iteration
 * swaps in the other of two same-shape datasets, so every redraw recolours
 * real regions and never bails on an equality guard. The ui module re-renders
 * through its React root; Highcharts and ECharts take their in-place data
 * updates. Geometry never changes — an update moves data, not the atlas.
 */

import { bench, describe } from 'vitest'
import type { Contender } from './contenders'
import { choroplethMapContenders, zoneMapContenders } from './map-contenders'
import { countiesAtlas, makeValues, makeZones, statesAtlas } from './map-fixtures'

/** The county scenarios see slow iterations; a longer window keeps samples up. */
const SLOW = { time: 2_000 }

type PreparedBench = { name: string; run: () => void | Promise<void> }

/** Mounts every contender on dataset `a` and closes each over an a/b swap. */
async function prepare<D>(contenders: Contender<D>[], a: D, b: D): Promise<PreparedBench[]> {
	const prepared: PreparedBench[] = []

	for (const contender of contenders) {
		const host = document.createElement('div')

		document.body.append(host)

		const map = await contender.mount(host, a)

		let flip = false

		prepared.push({
			name: contender.name,
			run: () => {
				flip = !flip

				return map.update(flip ? b : a)
			},
		})
	}

	return prepared
}

function updateBenches(prepared: PreparedBench[], options?: { time: number }) {
	for (const { name, run } of prepared) {
		bench(name, run, options)
	}
}

const states = await prepare(
	zoneMapContenders(statesAtlas),
	makeZones(statesAtlas, 1),
	makeZones(statesAtlas, 2),
)

const counties = await prepare(
	zoneMapContenders(countiesAtlas),
	makeZones(countiesAtlas, 1),
	makeZones(countiesAtlas, 2),
)

const choropleth = await prepare(
	choroplethMapContenders(countiesAtlas),
	makeValues(countiesAtlas, 1),
	makeValues(countiesAtlas, 2),
)

describe('update · map · states · re-zone 49 regions', () => {
	updateBenches(states)
})

describe('update · map · counties · re-zone 3,108 regions', () => {
	updateBenches(counties, SLOW)
})

describe('update · map · counties choropleth · re-value 3,108 regions', () => {
	updateBenches(choropleth, SLOW)
})
