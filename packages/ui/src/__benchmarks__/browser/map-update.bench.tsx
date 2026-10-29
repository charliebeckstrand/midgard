/**
 * Redraw cost on a live map: the dashboard refresh path, the chart update
 * bench's shape over regions. Each scenario mounts the map once (top-level
 * await; the map stays up for the whole run) and each iteration swaps in the
 * other of two same-shape datasets, so every redraw recolors real regions and
 * never bails on an equality guard. The ui module re-renders through its React
 * root. Geometry never changes: an update moves data, not the atlas.
 */

import { compareBenches } from '../compare'
import { benches, prepare, WINDOW } from './harness'
import { countiesAtlas, makeValues, makeZones, statesAtlas } from './map-fixtures'
import { choroplethMaps, zoneMaps } from './maps'

const states = await prepare(
	zoneMaps(statesAtlas),
	makeZones(statesAtlas, 1),
	makeZones(statesAtlas, 2),
)

const counties = await prepare(
	zoneMaps(countiesAtlas),
	makeZones(countiesAtlas, 1),
	makeZones(countiesAtlas, 2),
)

const choropleth = await prepare(
	choroplethMaps(countiesAtlas),
	makeValues(countiesAtlas, 1),
	makeValues(countiesAtlas, 2),
)

compareBenches('update · map · states · re-zone 49 regions', (bench) => {
	benches(bench, states)
})

compareBenches(
	'update · map · counties · re-zone 3,108 regions',
	(bench) => {
		benches(bench, counties)
	},
	WINDOW.slow,
)

compareBenches(
	'update · map · counties choropleth · re-value 3,108 regions',
	(bench) => {
		benches(bench, choropleth)
	},
	WINDOW.slow,
)
