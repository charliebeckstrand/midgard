import { describe, expect, it } from 'vitest'
import type { BarMark } from '../../modules/chart/bar-chart/bar-chart-geometry'
import {
	nearSeriesLines,
	withinBarMarks,
	withinSeriesAreas,
} from '../../modules/chart/chart-hit-test'

const bar = (x: number, x1: number, top: number, bottom: number): BarMark => ({
	d: '',
	x,
	x1,
	top,
	bottom,
	key: 'k',
	up: true,
})

describe('withinBarMarks', () => {
	it('hits inside a bar and misses the air beside and above it', () => {
		const marks = [[bar(10, 30, 50, 100), null]]

		expect(withinBarMarks(marks, 20, 75)).toBe(true)

		// Just past the right edge, and above the top.
		expect(withinBarMarks(marks, 31, 75)).toBe(false)

		expect(withinBarMarks(marks, 20, 49)).toBe(false)
	})
})

describe('nearSeriesLines', () => {
	const runs = [
		[
			[
				{ x: 0, y: 100 },
				{ x: 100, y: 100 },
			],
		],
	]

	it('hits within tolerance of a segment and misses beyond it', () => {
		expect(nearSeriesLines(runs, 50, 106)).toBe(true)

		expect(nearSeriesLines(runs, 50, 112)).toBe(false)
	})

	it('never bridges the gap between runs, but hits a lone point', () => {
		const gappy = [
			[
				[
					{ x: 0, y: 100 },
					{ x: 40, y: 100 },
				],
				[{ x: 120, y: 100 }],
			],
		]

		// Between the runs, on the imaginary bridge.
		expect(nearSeriesLines(gappy, 80, 100)).toBe(false)

		expect(nearSeriesLines(gappy, 122, 102)).toBe(true)
	})
})

describe('withinSeriesAreas', () => {
	const runs = [
		[
			[
				{ x: 0, y: 60 },
				{ x: 100, y: 40 },
			],
		],
	]

	it('hits between the top edge and the baseline, with edge slack', () => {
		expect(withinSeriesAreas(runs, 200, 50, 120)).toBe(true)

		// The stroke itself, just above the interpolated edge at x=50 (y=50).
		expect(withinSeriesAreas(runs, 200, 50, 47)).toBe(true)

		expect(withinSeriesAreas(runs, 200, 50, 40)).toBe(false)

		expect(withinSeriesAreas(runs, 200, 50, 201)).toBe(false)
	})

	it('misses x outside the run', () => {
		expect(withinSeriesAreas(runs, 200, 120, 120)).toBe(false)
	})
})
