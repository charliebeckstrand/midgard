// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
	barMarks,
	stackedBarMarks,
	stackedBarSnaps,
} from '../../modules/chart/engine/chart-geometry/bar'
import { bandScale } from '../../modules/chart/engine/chart-scale'

describe('barMarks', () => {
	const band = bandScale({ count: 2, range: [0, 200] })

	const map = (value: number) => 100 - value

	it('rounds only the data end and squares the baseline', () => {
		const [row] = barMarks([[40, -20]], band, map, 100)

		const up = row?.[0]

		expect(up?.positive).toBe(true)

		// Starts and ends on the baseline, arcs at the value end.
		expect(up?.d.startsWith('M ')).toBe(true)

		expect(up?.d).toContain('A 4 4 0 0 1')

		expect(up?.d.endsWith('Z')).toBe(true)

		const down = row?.[1]

		expect(down?.positive).toBe(false)

		expect(down?.d).toContain('A 4 4 0 0 0')
	})

	it('transposes the span and the hit rect when horizontal', () => {
		// map(v) = 100 - v, baseline 100: a positive value lands left of the baseline
		// on x, so the bar grows toward smaller x. One band of width 200 → thickness
		// runs down y.
		const [row] = barMarks([[40]], bandScale({ count: 1, range: [0, 40] }), map, 100, 'horizontal')

		const mark = row?.[0]

		// The value span is horizontal (x), the thickness vertical (top/bottom = the band slot).
		expect(mark?.x).toBe(60)

		expect(mark?.x1).toBe(100)

		expect(mark?.top).toBeLessThan(mark?.bottom ?? 0)

		// 40 maps to x=60, right of the baseline's screen x (100), so it is not positive here.
		expect(mark?.positive).toBe(false)

		expect(mark?.d.startsWith('M ')).toBe(true)

		expect(mark?.d.endsWith('Z')).toBe(true)
	})

	it('clamps the radius on short bars instead of inverting', () => {
		const [row] = barMarks([[2]], bandScale({ count: 1, range: [0, 100] }), map, 100)

		expect(row?.[0]?.d).toContain('A 2 2')
	})

	it('omits null and zero values', () => {
		const [row] = barMarks([[null, 0, 10]], bandScale({ count: 3, range: [0, 300] }), map, 100)

		expect(row?.[0]).toBeNull()

		expect(row?.[1]).toBeNull()

		expect(row?.[2]).not.toBeNull()
	})

	it('caps at the spec thickness by default and fills the band under thick', () => {
		// A band wide enough (160) that the default bar caps at the 24px spec.
		const wide = bandScale({ count: 1, range: [0, 200] })

		const [capped] = barMarks([[40]], wide, map, 100)

		const [full] = barMarks([[40]], wide, map, 100, 'vertical', true)

		expect((capped?.[0]?.x1 ?? 0) - (capped?.[0]?.x ?? 0)).toBe(24)

		expect((full?.[0]?.x1 ?? 0) - (full?.[0]?.x ?? 0)).toBe(wide.width)
	})
})

describe('stackedBarMarks', () => {
	// A single-category band; map inverts value → y so a taller value sits higher.
	const band = bandScale({ count: 1, range: [0, 100] })

	const map = (value: number) => 100 - value

	it('stacks each series onto the running total in one shared column', () => {
		const [lower, upper] = stackedBarMarks([[40], [30]], band, map)

		const bottom = lower?.[0]

		const top = upper?.[0]

		// Both segments occupy the same band slot — one column, not a group.
		expect(top?.x).toBe(bottom?.x)

		expect(top?.x1).toBe(bottom?.x1)

		// The second series rides the first: its span sits above, meeting at the
		// cumulative boundary (map(40) = 60).
		expect(bottom?.bottom).toBe(map(0))

		expect(bottom?.top).toBe(map(40))

		expect(top?.bottom).toBe(map(40))

		expect(top?.top).toBe(map(70))
	})

	it('rounds only the outermost segment and squares the ones within', () => {
		const [lower, upper] = stackedBarMarks([[40], [30]], band, map)

		// The topmost segment keeps the rounded data end; inner segments are square.
		expect(upper?.[0]?.d).toContain('A ')

		expect(lower?.[0]?.d).not.toContain('A ')
	})

	it('takes no segment for a null, zero, or negative value', () => {
		const [row] = stackedBarMarks(
			[[null, 0, -5, 20]],
			bandScale({ count: 4, range: [0, 400] }),
			map,
		)

		expect(row?.[0]).toBeNull()

		expect(row?.[1]).toBeNull()

		expect(row?.[2]).toBeNull()

		expect(row?.[3]).not.toBeNull()
	})

	it('caps the column at the spec thickness by default and fills the band under thick', () => {
		const [capped] = stackedBarMarks([[40]], band, map)

		const [full] = stackedBarMarks([[40]], band, map, 'vertical', true)

		expect((capped?.[0]?.x1 ?? 0) - (capped?.[0]?.x ?? 0)).toBe(24)

		expect((full?.[0]?.x1 ?? 0) - (full?.[0]?.x ?? 0)).toBe(band.width)
	})
})

describe('stackedBarSnaps', () => {
	const band = bandScale({ count: 1, range: [0, 100] })

	const map = (value: number) => 100 - value

	it('reads each segment cumulative top, not the from-zero value positions', () => {
		const marks = stackedBarMarks([[40], [30]], band, map)

		// Bottom segment tops at its own value (map(40)); the second rides it and
		// tops at the running total (map(70)) — not map(30), the from-zero position
		// the shared snap points would carry.
		expect(stackedBarSnaps(marks, [0, 1], 1).points).toEqual([[map(40), map(70)]])
	})

	it('names each stop series by its stack order, dropping the same gaps', () => {
		const marks = stackedBarMarks([[40], [0], [30]], band, map)

		// The zero-valued middle series takes no segment, so it drops from both the
		// positions and the parallel series list, keeping the two aligned.
		expect(stackedBarSnaps(marks, [0, 1, 2], 1)).toEqual({
			points: [[map(40), map(70)]],
			series: [[0, 2]],
		})
	})
})
