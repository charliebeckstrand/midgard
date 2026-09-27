/**
 * Pointer-tracking cost on a live map: one iteration sweeps a synthetic
 * pointer across the plot and settles one animation frame, so hit-testing,
 * region emphasis, tooltip work, and any frame-deferred drawing all land
 * inside the timed region. Each step dispatches the `pointermove` +
 * `mousemove` pair that a real mouse sends. The regions of the ui module are
 * their own hit targets: the browser retargets a real pointer to the path under
 * it, with a native SVG hit test that costs no script time. The target of each
 * step therefore resolves to the region under its point once, outside the
 * timed region.
 */

import { describe } from 'vitest'
import { MapPlat } from '../../modules/map/map-plat'
import { MapPoints } from '../../modules/map/map-points'
import { HEIGHT, reactSubject, type Subject, WIDTH } from './charts'
import { benches, prepareSweep, SWEEP, WINDOW } from './harness'
import { countiesAtlas, LATTICE_DOTS, makeZones, statesAtlas, type ZoneData } from './map-fixtures'
import { zoneMaps } from './maps'

/** The SVG of the plot, which the map draws into and listens on. */
function plotTarget(host: HTMLElement): Element {
	return host.querySelector('[data-slot="map-plot"] svg') ?? host
}

/**
 * The dispatch target of each step: the region under its point, by bounding
 * box, with the smallest match first, so an enclosing giant stays behind its
 * neighbors. It stands in for the native retargeting of a real pointer. A step
 * over no region falls back to the plot.
 */
function regionTargets(host: HTMLElement, xs: number[], y: number): Element[] {
	const plot = plotTarget(host)

	const regions = [...host.querySelectorAll('[data-region-index]')]

	const rects = regions.map((region) => region.getBoundingClientRect())

	return xs.map((x) => {
		let target: Element = plot

		let area = Number.POSITIVE_INFINITY

		for (const [index, rect] of rects.entries()) {
			const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

			if (inside && rect.width * rect.height < area) {
				target = regions[index] as Element

				area = rect.width * rect.height
			}
		}

		return target
	})
}

const states = await prepareSweep(
	zoneMaps(statesAtlas),
	makeZones(statesAtlas),
	plotTarget,
	regionTargets,
)

const counties = await prepareSweep(
	zoneMaps(countiesAtlas),
	makeZones(countiesAtlas),
	plotTarget,
	regionTargets,
)

/**
 * A zone map carrying a two-hundred-dot plural mark. The sweep crosses regions
 * and never a dot, which is the point: the pointed mark republishes on every
 * region-to-region crossing, so this measures what an overlay costs a hover it
 * is not part of.
 *
 * The other map benches draw geography and no marks at all, so nothing in the
 * suite could see a mark re-rendering against a hover elsewhere on the map.
 */
function overlayHoverMaps(): Subject<ZoneData>[] {
	return [
		reactSubject('ui MapPlat + 200-dot MapPoints', (data) => (
			<MapPlat
				aria-label="Bench map"
				geography={statesAtlas.topology}
				projection="albers-usa"
				data={data.rows}
				regionKey="fips"
				categoryKey="zone"
				width={WIDTH}
				height={HEIGHT}
			>
				<MapPoints label="Stops" points={LATTICE_DOTS} />
			</MapPlat>
		)),
	]
}

const overlays = await prepareSweep(
	overlayHoverMaps(),
	makeZones(statesAtlas),
	plotTarget,
	regionTargets,
)

describe(`hover · map · states · ${SWEEP}-step sweep`, () => {
	benches(states, WINDOW.settled)
})

describe(`hover · map · counties · ${SWEEP}-step sweep`, () => {
	benches(counties, WINDOW.settled)
})

describe(`hover · map · states + overlay · ${SWEEP}-step sweep`, () => {
	benches(overlays, WINDOW.settled)
})
