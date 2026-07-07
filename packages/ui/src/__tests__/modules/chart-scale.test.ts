import { describe, expect, it } from 'vitest'
import { bandScale, linearScale, nearestBandIndex } from '../../modules/chart/chart-scale'

describe('linearScale', () => {
	it('derives the domain from the finite values and lands ticks on clean steps', () => {
		const scale = linearScale({ values: [12, 87, 45], range: [100, 0], tickTarget: 4 })

		expect(scale).not.toBeNull()

		expect(scale?.domain[0]).toBeLessThanOrEqual(12)

		expect(scale?.domain[1]).toBeGreaterThanOrEqual(87)

		// 1/2/5 stepping: every tick is a multiple of the derived step.
		expect(scale?.ticks).toContain(20)

		expect(scale?.ticks.at(0)).toBe(scale?.domain[0])

		expect(scale?.ticks.at(-1)).toBe(scale?.domain[1])
	})

	it('maps the domain onto the range with out-of-domain values clamped', () => {
		const scale = linearScale({
			values: [0, 100],
			range: [200, 0],
			tickTarget: 4,
			min: 0,
			max: 100,
		})

		expect(scale?.map(0)).toBe(200)

		expect(scale?.map(100)).toBe(0)

		expect(scale?.map(50)).toBe(100)

		expect(scale?.map(-10)).toBe(200)

		expect(scale?.map(250)).toBe(0)
	})

	it('anchors the domain at zero for the bar baseline', () => {
		const positive = linearScale({
			values: [40, 90],
			range: [100, 0],
			tickTarget: 4,
			zeroBaseline: true,
		})

		expect(positive?.domain[0]).toBe(0)

		const negative = linearScale({
			values: [-30, 60],
			range: [100, 0],
			tickTarget: 4,
			zeroBaseline: true,
		})

		expect(negative?.domain[0]).toBeLessThanOrEqual(-30)

		expect(negative?.domain[1]).toBeGreaterThanOrEqual(60)

		expect(negative?.ticks).toContain(0)
	})

	it('keeps a pinned bound exact instead of rounding it to a tick', () => {
		const scale = linearScale({
			values: [3, 97],
			range: [100, 0],
			tickTarget: 4,
			min: 3,
			max: 97,
		})

		expect(scale?.domain).toEqual([3, 97])

		// Ticks stay inside the pinned domain.
		expect(scale?.ticks.every((tick) => tick >= 3 && tick <= 97)).toBe(true)
	})

	it('fits the domain tight to the data at the spark tier, drawing no ticks', () => {
		// A spark scale carries no axis (`tickTarget` 0), so it fits the domain to the
		// data extent rather than nice-stepping [3, 47] out to [0, 50] — the sparkline
		// spans its box top to bottom instead of sinking into a band of air.
		const scale = linearScale({ values: [3, 47], range: [100, 0], tickTarget: 0 })

		expect(scale?.domain).toEqual([3, 47])

		expect(scale?.ticks).toEqual([])

		// The extremes land on the range edges, so the marks fill the full height.
		expect(scale?.map(3)).toBe(100)

		expect(scale?.map(47)).toBe(0)

		// A pin still wins on its own side; the other bound stays tight.
		const pinned = linearScale({ values: [3, 47], range: [100, 0], tickTarget: 0, min: 0 })

		expect(pinned?.domain).toEqual([0, 47])
	})

	it('ignores non-finite values without collapsing the scale', () => {
		const scale = linearScale({
			values: [10, Number.NaN, 30, Number.POSITIVE_INFINITY],
			range: [100, 0],
			tickTarget: 4,
		})

		expect(scale?.domain[0]).toBeLessThanOrEqual(10)

		expect(scale?.domain[1]).toBeGreaterThanOrEqual(30)
	})

	it('returns null when nothing yields a domain', () => {
		expect(linearScale({ values: [], range: [100, 0], tickTarget: 4 })).toBeNull()

		expect(linearScale({ values: [Number.NaN], range: [100, 0], tickTarget: 4 })).toBeNull()
	})

	it('widens a flat series so the value still renders mid-domain', () => {
		const scale = linearScale({ values: [7, 7, 7], range: [100, 0], tickTarget: 4 })

		expect(scale?.domain[0]).toBeLessThan(7)

		expect(scale?.domain[1]).toBeGreaterThan(7)

		const zeros = linearScale({
			values: [0, 0],
			range: [100, 0],
			tickTarget: 4,
			zeroBaseline: true,
		})

		expect(zeros?.domain).toEqual([0, 1])
	})
})

describe('bandScale', () => {
	it('splits the range into equal slots with centered bands', () => {
		const scale = bandScale({ count: 4, range: [0, 400], padding: 0.2 })

		expect(scale.step).toBe(100)

		expect(scale.width).toBe(80)

		expect(scale.at(0)).toBe(10)

		expect(scale.center(0)).toBe(50)

		expect(scale.center(3)).toBe(350)
	})

	it('yields zero-width bands rather than NaNs for an empty count', () => {
		const scale = bandScale({ count: 0, range: [0, 400] })

		expect(scale.step).toBe(0)

		expect(scale.width).toBe(0)
	})
})

describe('nearestBandIndex', () => {
	const scale = bandScale({ count: 4, range: [0, 400] })

	it('resolves a pointer x to the band under it', () => {
		expect(nearestBandIndex(50, scale, 4)).toBe(0)

		expect(nearestBandIndex(150, scale, 4)).toBe(1)

		expect(nearestBandIndex(399, scale, 4)).toBe(3)
	})

	it('clamps outside the range and refuses an empty scale', () => {
		expect(nearestBandIndex(-20, scale, 4)).toBe(0)

		expect(nearestBandIndex(500, scale, 4)).toBe(3)

		expect(nearestBandIndex(50, bandScale({ count: 0, range: [0, 400] }), 0)).toBeNull()
	})
})
