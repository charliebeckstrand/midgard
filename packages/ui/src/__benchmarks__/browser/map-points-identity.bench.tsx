/**
 * What a render of a parent costs a live map of dots, by the identity of the
 * `points` that it hands down.
 *
 * `MapPoints` keys its whole pipeline on the identity of `points`: the
 * clustering, the crowding, the readout rows, and the hit targets. A parent
 * that renders again with the same array pays a render of the map shell. A
 * parent that builds a new array of the same dots, as a filter over a list
 * does on each render, pays the whole pipeline again for dots that did not
 * move.
 *
 * Each row mounts the map once and renders it again through its root, under
 * `flushSync`, as a state change of a consumer does. Read the gaps: `same
 * array` is the floor, the step to `new array, same dots` is what a held
 * identity saves, and `new array, new dots` adds the cost of new point
 * objects.
 */

import { MapPlat, MapPoints, type MapPointsProps } from '../../modules/map'
import { compareBenches } from '../compare'
import { HEIGHT, reactSubject, WIDTH } from './charts'
import { benches, host, type Prepared, WINDOW } from './harness'
import { LATTICE_DOTS, statesAtlas } from './map-fixtures'

type Dots = MapPointsProps['points']

/** The map of one row: the states, with the dots over them. */
const map = reactSubject<Dots>('map points', (dots) => (
	<MapPlat
		aria-label="Bench dots"
		geography={statesAtlas.topology}
		projection="albers-usa"
		width={WIDTH}
		height={HEIGHT}
	>
		<MapPoints label="Places" points={dots} />
	</MapPlat>
))

/** How each row builds the `points` of the next render from the dots. */
const ROWS: [string, (dots: Dots) => Dots][] = [
	['same array (the floor)', (dots) => dots],
	['new array, same dots', (dots) => [...dots]],
	['new array, new dots', (dots) => dots.map((dot) => ({ ...dot }))],
]

const prepared: Prepared[] = []

for (const [name, next] of ROWS) {
	const mounted = await map.mount(host(), LATTICE_DOTS)

	prepared.push({ name, run: () => mounted.update(next(LATTICE_DOTS)) })
}

compareBenches(
	`map points · parent render · ${LATTICE_DOTS.length} dots`,
	(bench) => {
		benches(bench, prepared)
	},
	WINDOW.slow,
)
