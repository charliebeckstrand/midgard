/**
 * Pointer-tracking cost on a live chart: one iteration sweeps a synthetic
 * pointer across the plot and then settles one animation frame, so
 * hit-testing, crosshair/tooltip work, and any frame-deferred drawing all land
 * inside the timed region. Every contender receives the same `pointermove` +
 * `mousemove` pair per step — each library listens for one of the two and
 * ignores the other, so the dispatch overhead is symmetric even though their
 * interaction stacks differ (the ui module and AG hear pointer events,
 * Highcharts mouse events). All three hit-test from coordinates, so the sweep
 * dispatches at the plot itself throughout.
 */

import { describe } from 'vitest'
import { lineContenders, scatterContenders } from './contenders'
import { makePoints, makeTrend } from './fixtures'
import { benches, prepareSweep, SWEEP, WINDOW } from './harness'

/** The plot-covering element each library actually listens on. */
function hoverTarget(host: HTMLElement): Element {
	return (
		host.querySelector('[data-slot="chart-hit"]') ??
		host.querySelector('canvas') ??
		host.querySelector('.highcharts-container') ??
		host
	)
}

const line1k = await prepareSweep(lineContenders(1), makeTrend(1_000, 1), hoverTarget)

const points10k = await prepareSweep(scatterContenders(), makePoints(10_000), hoverTarget)

describe(`hover · line · 1,000 × 1 series · ${SWEEP}-step sweep`, () => {
	benches(line1k, WINDOW.settled)
})

describe(`hover · scatter · 10,000 points · ${SWEEP}-step sweep`, () => {
	benches(points10k, WINDOW.settled)
})
