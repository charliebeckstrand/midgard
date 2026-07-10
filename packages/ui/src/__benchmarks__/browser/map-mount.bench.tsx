/**
 * Initial-render cost for the map scenarios, side by side per scenario: one
 * full mount-to-painted-DOM plus teardown per iteration, the shape the chart
 * mount bench times. Steady-state mounts: each library's one-time geometry
 * setup (the ui module's static-geometry cache, ECharts' `registerMap`,
 * whatever Highcharts caches on the topology) warms during the uncounted
 * warmup iterations, so the timed region is the remount a dashboard actually
 * pays — projection fit, path building, and the painted DOM.
 */

import { describe } from 'vitest'
import { mountBenches, SLOW } from './harness'
import { choroplethMapContenders, zoneMapContenders } from './map-contenders'
import { countiesAtlas, makeValues, makeZones, statesAtlas } from './map-fixtures'

describe('mount · map · states · 49 regions × 4 zones', () => {
	mountBenches(zoneMapContenders(statesAtlas), makeZones(statesAtlas))
})

describe('mount · map · counties · 3,108 regions × 4 zones', () => {
	mountBenches(zoneMapContenders(countiesAtlas), makeZones(countiesAtlas), SLOW)
})

describe('mount · map · counties choropleth · 3,108 regions', () => {
	mountBenches(choroplethMapContenders(countiesAtlas), makeValues(countiesAtlas), SLOW)
})
