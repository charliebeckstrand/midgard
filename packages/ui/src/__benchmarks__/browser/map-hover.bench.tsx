/**
 * Pointer-tracking cost on a live map: one iteration sweeps a synthetic
 * pointer across the plot and settles one animation frame, so hit-testing,
 * region emphasis, tooltip work, and any frame-deferred drawing all land
 * inside the timed region. Every contender receives the same `pointermove` +
 * `mousemove` pair per step; the dispatch target differs the way the
 * libraries' interaction stacks do. Highcharts and ECharts listen on their
 * container and hit-test from coordinates, so their target is the container
 * for every step. The ui module's regions are their own hit targets — the
 * browser retargets a real pointer to the path under it, native SVG
 * hit-testing no contender pays in script time — so its per-step targets
 * resolve to the region under each step once, outside the timed region.
 */

import { describe } from 'vitest'
import { MapPlat } from '../../modules/map/map-plat'
import { MapPoints } from '../../modules/map/map-points'
import { type Contender, HEIGHT, reactContender, WIDTH } from './contenders'
import { benches, prepareSweep, SWEEP, WINDOW } from './harness'
import { zoneMapContenders } from './map-contenders'
import { countiesAtlas, makeZones, statesAtlas, type ZoneData } from './map-fixtures'

/** The plot-covering element each library draws into and listens on. */
function plotTarget(host: HTMLElement): Element {
	return (
		host.querySelector('[data-slot="map-plot"] svg') ??
		host.querySelector('canvas') ??
		host.querySelector('.highcharts-container') ??
		host
	)
}

/**
 * The per-step dispatch targets. Where the contender renders per-region hit
 * targets (the ui module), each step resolves to the region under its point —
 * by bounding box, smallest match winning, so an enclosing giant stays behind
 * its neighbours — standing in for the browser's native retargeting of a real
 * pointer. A contender with no region elements falls back to the plot.
 */
function regionTargets(host: HTMLElement, xs: number[], y: number): Element[] {
	const plot = plotTarget(host)

	const regions = [...host.querySelectorAll('[data-region-index]')]

	if (regions.length === 0) return xs.map(() => plot)

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
	zoneMapContenders(statesAtlas),
	makeZones(statesAtlas),
	plotTarget,
	regionTargets,
)

const counties = await prepareSweep(
	zoneMapContenders(countiesAtlas),
	makeZones(countiesAtlas),
	plotTarget,
	regionTargets,
)

/** Dots on a lattice across the lower forty-eight, so every one projects. */
const DOTS = Array.from({ length: 200 }, (_, index) => ({
	at: [-120 + (index % 20) * 3, 30 + Math.floor(index / 20) * 1.8] as [number, number],
	label: `Stop ${index + 1}`,
	detail: `${index} pallets`,
}))

/**
 * A zone map carrying a two-hundred-dot plural mark. The sweep crosses regions
 * and never a dot, which is the point: the pointed mark republishes on every
 * region-to-region crossing, so this measures what an overlay costs a hover it
 * is not part of.
 *
 * The other map benches draw geography and no marks at all, so nothing in the
 * suite could see a mark re-rendering against a hover elsewhere on the map.
 */
function overlayHoverContenders(): Contender<ZoneData>[] {
	return [
		reactContender('ui MapPlat + 200-dot MapPoints', (data) => (
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
				<MapPoints label="Stops" points={DOTS} />
			</MapPlat>
		)),
	]
}

const overlays = await prepareSweep(
	overlayHoverContenders(),
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
