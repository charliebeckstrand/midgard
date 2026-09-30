// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { stackedAreas } from '../../modules/chart/engine/chart-geometry/area'

describe('stackedAreas', () => {
	const xs = [0, 10, 20]

	const map = (value: number) => 100 - value

	it('rides each band on the running total below it', () => {
		const [first, second] = stackedAreas(
			[
				[20, 30, 25],
				[10, 10, 10],
			],
			xs,
			map,
		)

		// First band's top edge sits at its own values.
		expect(first?.points.map((p) => p.y)).toEqual([80, 70, 75])

		// Second band's top edge sits at the cumulative total (value + first).
		expect(second?.points.map((p) => p.y)).toEqual([70, 60, 65])
	})

	it('counts a missing value as zero so the stack stays continuous', () => {
		const [, second] = stackedAreas(
			[
				[20, null, 25],
				[10, 10, 10],
			],
			xs,
			map,
		)

		// At the gap the first band contributes 0, so the second rides on 10 alone.
		expect(second?.points[1]?.y).toBe(map(10))
	})

	it('closes the first ribbon on the zero line and each next one on the edge below', () => {
		const [first, second] = stackedAreas(
			[
				[20, 30, 25],
				[10, 10, 10],
			],
			xs,
			map,
		)

		expect(first?.area).toBe('M 0 80 L 10 70 L 20 75 L 20 100 L 0 100 Z')

		expect(second?.area).toBe('M 0 70 L 10 60 L 20 65 L 20 75 L 10 70 L 0 80 Z')
	})

	it('decimates a dense stack for drawing, with exact seams and full-resolution points', () => {
		const n = 8_000

		const dense = Array.from({ length: n }, (_, i) => (i / (n - 1)) * 800)

		const lower = Array.from({ length: n }, (_, i) => Math.sin(i / 20) * 40 + 50)

		const upper = Array.from({ length: n }, (_, i) => Math.cos(i / 30) * 20 + 30)

		const [first, second] = stackedAreas([lower, upper], dense, map)

		const pairs = (d: string) => [...d.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => m[0])

		// The drawn edge is a fraction of the data, and the points keep every datum.
		expect(pairs(first?.line ?? '').length).toBeLessThan(n / 2)

		expect(first?.points).toHaveLength(n)

		// The lower edge of the second ribbon is the drawn top edge of the first,
		// point for point, so the two ribbons meet with no gap.
		const seam = pairs(second?.area ?? '').slice(pairs(second?.line ?? '').length)

		expect(seam).toEqual(pairs(first?.line ?? '').reverse())
	})
})
