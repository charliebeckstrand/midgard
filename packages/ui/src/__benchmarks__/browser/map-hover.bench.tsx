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
import { benches, prepareSweep, SWEEP, WINDOW } from './harness'
import { zoneMapContenders } from './map-contenders'
import { countiesAtlas, makeZones, statesAtlas } from './map-fixtures'

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

describe(`hover · map · states · ${SWEEP}-step sweep`, () => {
	benches(states, WINDOW.settled)
})

describe(`hover · map · counties · ${SWEEP}-step sweep`, () => {
	benches(counties, WINDOW.settled)
})
