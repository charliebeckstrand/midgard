// @vitest-environment node

import { bench, describe } from 'vitest'
import { MARKER_RADIUS } from '../modules/chart/engine/chart-constants'
import { stackedAreas } from '../modules/chart/engine/chart-geometry/area'
import { barMarks, stackedBarMarks } from '../modules/chart/engine/chart-geometry/bar'
import { lineGeometry } from '../modules/chart/engine/chart-geometry/line'
import {
	scatterData,
	scatterDiscsPath,
	scatterMarks,
} from '../modules/chart/engine/chart-geometry/scatter'
import { seriesDataKey } from '../modules/chart/engine/chart-motion'
import { bandScale, linearScale } from '../modules/chart/engine/chart-scale'
import { makePoints, makeTrend } from './browser/fixtures'

// The chart mark builders project a series' numbers into SVG path `d` strings
// and hit-test geometry — the work every mount and every update frame pays,
// entirely off the DOM. This suite benches them directly in a node env (no
// React, no jsdom), so an engine optimization — structure-of-arrays points,
// single-buffer path synthesis, cached coordinate formatting — reads as a core
// delta the browser suite can't isolate from React reconciliation and the DOM
// commit. Data is the shared LCG fixture the browser suite draws, so these
// numbers sit directly under the end-to-end scenarios one rung up.

const WIDTH = 800

const HEIGHT = 450

/** The zero-baseline value scale over every series' pooled numbers, plus the band's category xs. */
function cartesian(values: number[][]) {
	const count = values[0]?.length ?? 0

	const scale = linearScale({
		values: values.flat(),
		range: [HEIGHT, 0],
		tickTarget: 5,
		zeroBaseline: true,
	})

	if (!scale) throw new Error('fixture yielded no domain')

	const band = bandScale({ count, range: [0, WIDTH] })

	const xs = Array.from({ length: count }, (_, index) => band.center(index))

	return { scale, band, xs, baseline: HEIGHT }
}

describe('chart-geometry · lineGeometry', () => {
	for (const n of [1_000, 10_000]) {
		const { values } = makeTrend(n, 1)

		const series = values[0] as number[]

		const { scale, xs, baseline } = cartesian(values)

		bench(`${n.toLocaleString()} pts · linear`, () => {
			lineGeometry(series, xs, scale.map, baseline, 'linear')
		})

		bench(`${n.toLocaleString()} pts · smooth`, () => {
			lineGeometry(series, xs, scale.map, baseline, 'smooth')
		})

		// A null in every hundred points splits the line into runs. Each run is as
		// dense as the whole line, so it decimates the same way.
		const gappy = series.map((value, index) => (index % 100 === 99 ? null : value))

		bench(`${n.toLocaleString()} pts · linear · gaps`, () => {
			lineGeometry(gappy, xs, scale.map, baseline, 'linear')
		})
	}
})

describe('chart-geometry · stackedAreas', () => {
	for (const n of [1_000, 10_000]) {
		const { values } = makeTrend(n, 3)

		const { scale, xs } = cartesian([
			values.reduce((sum, row) => sum.map((v, i) => v + (row[i] ?? 0))),
		])

		bench(`${n.toLocaleString()} × 3 series`, () => {
			stackedAreas(values, xs, scale.map)
		})
	}
})

describe('chart-motion · seriesDataKey', () => {
	for (const n of [1_000, 10_000]) {
		const { values } = makeTrend(n, 3)

		bench(`${n.toLocaleString()} × 3 series`, () => {
			seriesDataKey(values)
		})
	}
})

describe('chart-geometry · barMarks', () => {
	for (const n of [500, 1_000]) {
		const { values } = makeTrend(n, 2)

		const { scale, band, baseline } = cartesian(values)

		bench(`${n.toLocaleString()} × 2 series · grouped`, () => {
			barMarks(values, band, (value) => scale.map(value), baseline, 'vertical')
		})

		bench(`${n.toLocaleString()} × 2 series · stacked`, () => {
			stackedBarMarks(values, band, scale.map, 'vertical')
		})
	}
})

describe('chart-geometry · scatter project + disc path', () => {
	for (const n of [1_000, 10_000]) {
		const { rows } = makePoints(n)

		const points = scatterData(rows, { xKey: 'x', yKey: 'y' })

		const xScale = linearScale({ values: points.map((p) => p.x), range: [0, WIDTH], tickTarget: 6 })

		const yScale = linearScale({
			values: points.map((p) => p.y),
			range: [HEIGHT, 0],
			tickTarget: 5,
		})

		if (!xScale || !yScale) throw new Error('fixture yielded no domain')

		const radius = () => MARKER_RADIUS

		const marks = [scatterMarks(points, xScale.map, yScale.map, radius)]

		bench(`${n.toLocaleString()} pts · project marks`, () => {
			scatterMarks(points, xScale.map, yScale.map, radius)
		})

		bench(`${n.toLocaleString()} pts · disc path`, () => {
			scatterDiscsPath(marks[0] as ReturnType<typeof scatterMarks>)
		})
	}
})
