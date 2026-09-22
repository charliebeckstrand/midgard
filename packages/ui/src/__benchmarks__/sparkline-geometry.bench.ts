// @vitest-environment node

import { bench, describe } from 'vitest'
import { sparklineGeometry } from '../components/sparkline/sparkline-geometry'
import { makeTrend } from './browser/fixtures'

// The sparkline projects a series onto its drawing box: the points, the line
// and area `d` strings, and the bar rects. A Grid cell holds one sparkline per
// row, so a grid render pays this once per visible row. This suite benches the
// projection directly in a node env, which prices the work a memo on the
// component saves. Data is the shared LCG fixture, so a run repeats exactly.

const BOX = { width: 96, height: 24, padding: 2, barGap: 1 }

/** One series of `count` numbers, drawn from the shared trend fixture. */
function series(count: number): number[] {
	return makeTrend(count, 1).values[0] ?? []
}

const TWELVE = series(12)

const SIXTY = series(60)

const YEAR = series(365)

describe('sparklineGeometry', () => {
	// The documented shape: a twelve-period trend in a Grid cell.
	bench('12 points', () => {
		sparklineGeometry(TWELVE, { ...BOX })
	})

	bench('60 points', () => {
		sparklineGeometry(SIXTY, { ...BOX })
	})

	bench('365 points', () => {
		sparklineGeometry(YEAR, { ...BOX })
	})
})
