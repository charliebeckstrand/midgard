// @vitest-environment node

import { bandScale, linearScale } from '../modules/chart/engine/chart-scale'
import { makeTrend } from './browser/fixtures'
import { compareBenches } from './compare'

// `linearScale` resolves a series' value domain on every mount and every update
// frame: filter the pool to finite, take its min and max, nice-step the unpinned
// bounds, then walk the ticks. The reduction runs over every value the chart
// draws, so it scales with N. This suite benches it directly in a node env (no
// React, no jsdom) so a core change (single-pass finite min/max in place of
// `filter` + `Math.min(...spread)`) reads as a delta the end-to-end browser
// suite is too coarse to isolate. Data is the shared LCG fixture the browser
// suite draws, so the pool matches the scenarios one rung up.

/** A flat value pool of `seriesCount` random walks over `count` categories. */
function pool(count: number, seriesCount: number): number[] {
	return makeTrend(count, seriesCount).values.flat()
}

/** Salts one in eight values with `NaN` to exercise the finite filter's rejected branch. */
function withHoles(values: number[]): number[] {
	return values.map((value, index) => (index % 8 === 0 ? Number.NaN : value))
}

compareBenches('chart-scale · linearScale', (bench) => {
	for (const count of [1_000, 10_000]) {
		const values = pool(count, 1)

		const holed = withHoles(values)

		bench(`${count.toLocaleString()} values · clean`, () => {
			linearScale({ values, range: [450, 0], tickTarget: 5, zeroBaseline: true })
		})

		bench(`${count.toLocaleString()} values · one-eighth NaN`, () => {
			linearScale({ values: holed, range: [450, 0], tickTarget: 5, zeroBaseline: true })
		})
	}

	// A five-series chart flattens every series into one pool before scaling, so
	// the reduction the multi-series mounts actually pay is over 5×N values.
	const wide = pool(2_000, 5)

	bench('10,000 values · five-series pool', () => {
		linearScale({ values: wide, range: [450, 0], tickTarget: 5, zeroBaseline: true })
	})
})

compareBenches('chart-scale · bandScale', (bench) => {
	// The band scale is closures over a step; construction is O(1), but the x
	// positions the cartesian charts read from it are one `center` call per
	// category, so bench the pass the mark builders actually drive.
	for (const count of [1_000, 10_000]) {
		bench(`${count.toLocaleString()} category centers`, () => {
			const band = bandScale({ count, range: [0, 800] })

			for (let index = 0; index < count; index++) band.center(index)
		})
	}
})
