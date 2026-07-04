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
	positive: true,
})

describe('withinBarMarks', () => {
	it('hits inside a bar and misses the air beside and above it', () => {
		const marks = [[bar(10, 30, 50, 100), null]]

		expect(withinBarMarks(marks, 20, 75)).toBe(true)

		// Just past the right edge, and above the top.
		expect(withinBarMarks(marks, 31, 75)).toBe(false)

		expect(withinBarMarks(marks, 20, 49)).toBe(false)
	})

	it('bridges the gap between grouped bars when given the gap slack', () => {
		// Two series' bars 2px apart in one group: |10..30| gap |32..52|.
		const group = [[bar(10, 30, 50, 100)], [bar(32, 52, 50, 100)]]

		// x=31 falls in the 2px gap — a miss without slack, flickering the tooltip.
		expect(withinBarMarks(group, 31, 75)).toBe(false)

		// The inter-bar slack closes it, so a sweep across the group never drops.
		expect(withinBarMarks(group, 31, 75, 2)).toBe(true)

		// The slack still ends at the group: the wider space beyond stays a miss.
		expect(withinBarMarks(group, 60, 75, 2)).toBe(false)

		// And it never reaches above the bars.
		expect(withinBarMarks(group, 31, 40, 2)).toBe(false)
	})

	it('applies the gap slack down y for a horizontal chart', () => {
		// Two horizontal bars 2px apart down the band axis: rows |50..70| and |72..92|,
		// each spanning x 10..30. The gap between them is now vertical.
		const group = [[bar(10, 30, 50, 70)], [bar(10, 30, 72, 92)]]

		// y=71 falls in the vertical gap — a miss without slack.
		expect(withinBarMarks(group, 20, 71, 0, 'horizontal')).toBe(false)

		// The slack closes it along y, not x.
		expect(withinBarMarks(group, 20, 71, 2, 'horizontal')).toBe(true)

		// Off the value end (past x=30) stays a miss however wide the band slack.
		expect(withinBarMarks(group, 40, 60, 2, 'horizontal')).toBe(false)
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

	it('hits within the generous tolerance of a segment and misses beyond it', () => {
		// Comfortably on the line.
		expect(nearSeriesLines(runs, 50, 106)).toBe(true)

		// 12px off — inside the widened catch the bare tooltip leans on.
		expect(nearSeriesLines(runs, 50, 112)).toBe(true)

		// Past the tolerance.
		expect(nearSeriesLines(runs, 50, 120)).toBe(false)
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
