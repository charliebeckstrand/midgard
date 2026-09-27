/**
 * Pointer-tracking cost on a live chart: one iteration sweeps a synthetic
 * pointer across the plot and then settles one animation frame, so
 * hit-testing, crosshair/tooltip work, and any frame-deferred drawing all land
 * inside the timed region. Each step dispatches the `pointermove` +
 * `mousemove` pair that a real mouse sends. The chart hit-tests from
 * coordinates, so the sweep dispatches at the plot itself throughout.
 */

import { describe } from 'vitest'
import { lineCharts, scatterCharts } from './charts'
import { makePoints, makeTrend } from './fixtures'
import { benches, prepareSweep, SWEEP, WINDOW } from './harness'

/** The plot-covering element that the chart listens on. */
function hoverTarget(host: HTMLElement): Element {
	return host.querySelector('[data-slot="chart-hit"]') ?? host
}

const line1k = await prepareSweep(lineCharts(1), makeTrend(1_000, 1), hoverTarget)

const points10k = await prepareSweep(scatterCharts(), makePoints(10_000), hoverTarget)

describe(`hover · line · 1,000 × 1 series · ${SWEEP}-step sweep`, () => {
	benches(line1k, WINDOW.settled)
})

describe(`hover · scatter · 10,000 points · ${SWEEP}-step sweep`, () => {
	benches(points10k, WINDOW.settled)
})
