/**
 * Initial-render cost: one full mount-to-painted-DOM plus teardown per
 * iteration, the way the jsdom grid bench times `render` + `cleanup`. The
 * chart draws each dataset into a fixed box with the animations off.
 */

import { describe } from 'vitest'
import { barCharts, lineCharts, scatterCharts } from './charts'
import { makeDatedTrend, makePoints, makeTrend } from './fixtures'
import { mountBenches, WINDOW } from './harness'

describe('mount · line · 100 × 1 series', () => {
	mountBenches(lineCharts(1), makeTrend(100, 1))
})

describe('mount · line · 1,000 × 1 series', () => {
	mountBenches(lineCharts(1), makeTrend(1_000, 1))
})

describe('mount · line · 10,000 × 1 series', () => {
	mountBenches(lineCharts(1), makeTrend(10_000, 1), WINDOW.slow)
})

describe('mount · line · 1,000 × 5 series', () => {
	mountBenches(lineCharts(5), makeTrend(1_000, 5), WINDOW.slow)
})

describe('mount · bar · 50 × 2 series', () => {
	mountBenches(barCharts(2), makeTrend(50, 2))
})

describe('mount · bar · 500 × 2 series', () => {
	mountBenches(barCharts(2), makeTrend(500, 2), WINDOW.slow)
})

describe('mount · scatter · 1,000 points', () => {
	mountBenches(scatterCharts(), makePoints(1_000))
})

describe('mount · scatter · 10,000 points', () => {
	mountBenches(scatterCharts(), makePoints(10_000), WINDOW.slow)
})

// The same line scenarios over ISO-date categories — the time-series dashboard
// shape, and the one the plain-label scenarios above never reach. The ui module
// probes whether all categories parse as dates and formats them through `Intl`
// when they do, where a non-date axis exits on its first value. Held beside the
// plain scenarios of the same size, the pair prices that probe end to end.

describe('mount · line · dated · 1,000 × 1 series', () => {
	mountBenches(lineCharts(1), makeDatedTrend(1_000, 1), WINDOW.slow)
})

describe('mount · line · dated · 10,000 × 1 series', () => {
	mountBenches(lineCharts(1), makeDatedTrend(10_000, 1), WINDOW.slow)
})
