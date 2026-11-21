/**
 * The cost of a selection change on a live map: a click that adds a region to
 * a held set, a dashboard cross-filter, or a chat citation that marks a set.
 * Each scenario mounts the map once, and each iteration swaps in the other of
 * two selections. The rows and the geometry never change, so the region layer
 * holds its render. The timed work is the ring, the resolve of the ids, and
 * the commit that the held selection adds. The table rows that a pick renames
 * render in the deferred pass, outside the sample.
 */

import { compareBenches } from '../compare'
import { benches, prepare, WINDOW } from './harness'
import { countiesAtlas, makeZones, statesAtlas } from './map-fixtures'
import { selectionMaps } from './maps'

/** The first `count` regions of an atlas, by FIPS id. */
const first = (ids: readonly string[], count: number) => ids.slice(0, count)

const states = await prepare(
	selectionMaps(statesAtlas, makeZones(statesAtlas, 1)),
	{ selected: [] },
	{ selected: first(statesAtlas.ids, 1) },
)

const counties = await prepare(
	selectionMaps(countiesAtlas, makeZones(countiesAtlas, 1)),
	{ selected: first(countiesAtlas.ids, 300) },
	{ selected: first(countiesAtlas.ids, 301) },
)

compareBenches('update · map · states · pick one region', (bench) => {
	benches(bench, states)
})

compareBenches(
	'update · map · counties · toggle one of 300 held regions',
	(bench) => {
		benches(bench, counties)
	},
	WINDOW.slow,
)
