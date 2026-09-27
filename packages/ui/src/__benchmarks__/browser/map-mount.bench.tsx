/**
 * Initial-render cost for the map scenarios: one full mount-to-painted-DOM
 * plus teardown per iteration, the shape the chart mount bench times. The
 * mounts are steady-state: the static-geometry cache of the ui module warms
 * during the uncounted warmup iterations, so the timed region is the remount a
 * dashboard actually pays — projection fit, path building, and the painted DOM.
 */

import { describe } from 'vitest'
import { mountBenches, WINDOW } from './harness'
import { countiesAtlas, makeValues, makeZones, statesAtlas } from './map-fixtures'
import { choroplethMaps, zoneMaps } from './maps'

describe('mount · map · states · 49 regions × 4 zones', () => {
	mountBenches(zoneMaps(statesAtlas), makeZones(statesAtlas))
})

describe('mount · map · counties · 3,108 regions × 4 zones', () => {
	mountBenches(zoneMaps(countiesAtlas), makeZones(countiesAtlas), WINDOW.slow)
})

describe('mount · map · counties choropleth · 3,108 regions', () => {
	mountBenches(choroplethMaps(countiesAtlas), makeValues(countiesAtlas), WINDOW.slow)
})
