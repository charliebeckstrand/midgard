/**
 * Initial-render cost for the map scenarios: one full mount-to-painted-DOM
 * plus teardown per iteration, the shape the chart mount bench times. The
 * mounts are steady-state: the static-geometry cache of the ui module warms
 * during the uncounted warmup iterations, so the timed region is the remount a
 * dashboard actually pays (projection fit, path building, and the painted DOM).
 */

import { compareBenches } from '../compare'
import { mountBenches, WINDOW } from './harness'
import { countiesAtlas, makeValues, makeZones, statesAtlas } from './map-fixtures'
import { choroplethMaps, zoneMaps } from './maps'

compareBenches('mount · map · states · 49 regions × 4 zones', (bench) => {
	mountBenches(bench, zoneMaps(statesAtlas), makeZones(statesAtlas))
})

compareBenches(
	'mount · map · counties · 3,108 regions × 4 zones',
	(bench) => {
		mountBenches(bench, zoneMaps(countiesAtlas), makeZones(countiesAtlas))
	},
	WINDOW.slow,
)

compareBenches(
	'mount · map · counties choropleth · 3,108 regions',
	(bench) => {
		mountBenches(bench, choroplethMaps(countiesAtlas), makeValues(countiesAtlas))
	},
	WINDOW.slow,
)
