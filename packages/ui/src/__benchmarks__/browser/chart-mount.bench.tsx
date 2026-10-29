/**
 * Initial-render cost: one full mount-to-painted-DOM plus teardown per
 * iteration, the way the jsdom grid bench times `render` + `cleanup`. The
 * chart draws each dataset into a fixed box with the animations off.
 */

import { compareBenches } from '../compare'
import {
	barCharts,
	heatmapCharts,
	horizontalBarCharts,
	lineCharts,
	pieCalloutCharts,
	scatterCharts,
} from './charts'
import { makeDatedTrend, makePoints, makeTrend } from './fixtures'
import { mountBenches, WINDOW } from './harness'

compareBenches('mount · line · 100 × 1 series', (bench) => {
	mountBenches(bench, lineCharts(1), makeTrend(100, 1))
})

compareBenches('mount · line · 1,000 × 1 series', (bench) => {
	mountBenches(bench, lineCharts(1), makeTrend(1_000, 1))
})

compareBenches(
	'mount · line · 10,000 × 1 series',
	(bench) => {
		mountBenches(bench, lineCharts(1), makeTrend(10_000, 1))
	},
	WINDOW.slow,
)

compareBenches(
	'mount · line · 1,000 × 5 series',
	(bench) => {
		mountBenches(bench, lineCharts(5), makeTrend(1_000, 5))
	},
	WINDOW.slow,
)

compareBenches('mount · bar · 50 × 2 series', (bench) => {
	mountBenches(bench, barCharts(2), makeTrend(50, 2))
})

compareBenches(
	'mount · bar · 500 × 2 series',
	(bench) => {
		mountBenches(bench, barCharts(2), makeTrend(500, 2))
	},
	WINDOW.slow,
)

// The horizontal bar measures the rendered width of each category label before
// the first paint, and cuts a label past the gutter with an ellipsis.
compareBenches('mount · bar · horizontal · 50 × 2 series', (bench) => {
	mountBenches(bench, horizontalBarCharts(2), makeTrend(50, 2))
})

compareBenches('mount · scatter · 1,000 points', (bench) => {
	mountBenches(bench, scatterCharts(), makePoints(1_000))
})

compareBenches(
	'mount · scatter · 10,000 points',
	(bench) => {
		mountBenches(bench, scatterCharts(), makePoints(10_000))
	},
	WINDOW.slow,
)

// The callout pie measures the rendered width of each label before the first
// paint, so its mount pays one text layout and one more render.
compareBenches('mount · pie · callouts · 8 slices', (bench) => {
	mountBenches(bench, pieCalloutCharts(), makeTrend(8, 1))
})

// The heatmap measures the rendered width of each row label before the first
// paint, and cuts a label past the gutter with an ellipsis.
compareBenches('mount · heatmap · 24 × 8 cells', (bench) => {
	mountBenches(bench, heatmapCharts(), makeTrend(24, 8))
})

// The same line scenarios over ISO-date categories: the time-series dashboard
// shape, and the one the plain-label scenarios above never reach. The ui module
// probes whether all categories parse as dates and formats them through `Intl`
// when they do, where a non-date axis exits on its first value. Held beside the
// plain scenarios of the same size, the pair prices that probe end to end.

compareBenches(
	'mount · line · dated · 1,000 × 1 series',
	(bench) => {
		mountBenches(bench, lineCharts(1), makeDatedTrend(1_000, 1))
	},
	WINDOW.slow,
)

compareBenches(
	'mount · line · dated · 10,000 × 1 series',
	(bench) => {
		mountBenches(bench, lineCharts(1), makeDatedTrend(10_000, 1))
	},
	WINDOW.slow,
)
