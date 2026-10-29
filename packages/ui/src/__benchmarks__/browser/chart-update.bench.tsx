/**
 * Redraw cost on a live chart: the dashboard refresh path. Each scenario
 * mounts the chart once (top-level await; the tree stays up for the whole
 * run) and each iteration swaps in the other of two same-shape datasets, so
 * every redraw moves real values and never bails on an equality guard. The ui
 * module re-renders through its React root.
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
import { makePoints, makeTrend } from './fixtures'
import { benches, prepare, WINDOW } from './harness'

const line1k = await prepare(lineCharts(1), makeTrend(1_000, 1, 1), makeTrend(1_000, 1, 2))

const line10k = await prepare(lineCharts(1), makeTrend(10_000, 1, 1), makeTrend(10_000, 1, 2))

const line1k5 = await prepare(lineCharts(5), makeTrend(1_000, 5, 1), makeTrend(1_000, 5, 2))

const bar500 = await prepare(barCharts(2), makeTrend(500, 2, 1), makeTrend(500, 2, 2))

const barHorizontal50 = await prepare(
	horizontalBarCharts(2),
	makeTrend(50, 2, 1),
	makeTrend(50, 2, 2),
)

const pie8 = await prepare(pieCalloutCharts(), makeTrend(8, 1, 1), makeTrend(8, 1, 2))

const heatmap = await prepare(heatmapCharts(), makeTrend(24, 8, 1), makeTrend(24, 8, 2))

const points10k = await prepare(scatterCharts(), makePoints(10_000, 1), makePoints(10_000, 2))

compareBenches('update · line · 1,000 × 1 series', (bench) => {
	benches(bench, line1k)
})

compareBenches(
	'update · line · 10,000 × 1 series',
	(bench) => {
		benches(bench, line10k)
	},
	WINDOW.slow,
)

compareBenches(
	'update · line · 1,000 × 5 series',
	(bench) => {
		benches(bench, line1k5)
	},
	WINDOW.slow,
)

compareBenches(
	'update · bar · 500 × 2 series',
	(bench) => {
		benches(bench, bar500)
	},
	WINDOW.slow,
)

// New values keep the category labels, so a redraw measures no label again.
compareBenches('update · bar · horizontal · 50 × 2 series', (bench) => {
	benches(bench, barHorizontal50)
})

compareBenches(
	'update · scatter · 10,000 points',
	(bench) => {
		benches(bench, points10k)
	},
	WINDOW.slow,
)

// New values change the percent in each callout, so each redraw measures the
// callout texts again.
compareBenches('update · pie · callouts · 8 slices', (bench) => {
	benches(bench, pie8)
})

// New values keep the row names, so a redraw measures no label again.
compareBenches('update · heatmap · 24 × 8 cells', (bench) => {
	benches(bench, heatmap)
})
