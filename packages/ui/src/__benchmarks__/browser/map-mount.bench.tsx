/**
 * Initial-render cost for the map scenarios, side by side per scenario: one
 * full mount-to-painted-DOM plus teardown per iteration, the shape the chart
 * mount bench times. Steady-state mounts: each library's one-time geometry
 * setup (the ui module's static-geometry cache, ECharts' `registerMap`,
 * whatever Highcharts caches on the topology) warms during the uncounted
 * warmup iterations, so the timed region is the remount a dashboard actually
 * pays — projection fit, path building, and the painted DOM.
 */

import { bench, describe } from 'vitest'
import type { Contender } from './contenders'
import { choroplethMapContenders, zoneMapContenders } from './map-contenders'
import { countiesAtlas, makeValues, makeZones, statesAtlas } from './map-fixtures'

const host = document.createElement('div')

document.body.append(host)

/** The county scenarios see >100ms iterations; a longer window keeps samples up. */
const SLOW = { time: 2_000 }

function mountBenches<D>(contenders: Contender<D>[], data: D, options?: { time: number }) {
	for (const contender of contenders) {
		bench(
			contender.name,
			async () => {
				const map = await contender.mount(host, data)

				map.destroy()
			},
			options,
		)
	}
}

describe('mount · map · states · 49 regions × 4 zones', () => {
	mountBenches(zoneMapContenders(statesAtlas), makeZones(statesAtlas))
})

describe('mount · map · counties · 3,108 regions × 4 zones', () => {
	mountBenches(zoneMapContenders(countiesAtlas), makeZones(countiesAtlas), SLOW)
})

describe('mount · map · counties choropleth · 3,108 regions', () => {
	mountBenches(choroplethMapContenders(countiesAtlas), makeValues(countiesAtlas), SLOW)
})
