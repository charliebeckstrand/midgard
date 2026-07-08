import { describe, expect, it } from 'vitest'
import {
	bandScale,
	headroomFits,
	linearScale,
	nearestBandIndex,
} from '../../modules/chart/chart-scale'

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

	it('reserves label headroom past an unpinned extreme, solving for the grown span', () => {
		// Pin the floor so only the ceiling widens. The peak (97) otherwise sits
		// 3px below the nice ceiling of 100 — too little for a ~21px label. The
		// widened ceiling must leave a full 21px once the larger span is accounted
		// for; a naive px→value pass would fall short.
		const base = linearScale({ values: [3, 97], range: [100, 0], tickTarget: 4, min: 0 })

		expect(base?.domain[1]).toBe(100)

		const roomy = linearScale({
			values: [3, 97],
			range: [100, 0],
			tickTarget: 4,
			min: 0,
			headroom: 21,
		})

		const [low, high] = roomy?.domain ?? [0, 0]

		// The pinned floor holds; the ceiling widened so the peak clears it by ~21px.
		expect(low).toBe(0)

		const clearancePx = (high - 97) / ((high - low) / 100)

		expect(clearancePx).toBeGreaterThanOrEqual(20.5)

		expect(clearancePx).toBeLessThan(22)
	})

	it('shares one span so both extremes clear their edges when both widen', () => {
		// Neither pinned: the peak needs room above, the trough below. Both clear
		// their edge by ~10px, and the data still spans the middle.
		const scale = linearScale({ values: [20, 80], range: [100, 0], tickTarget: 4, headroom: 10 })

		const [low, high] = scale?.domain ?? [0, 0]

		const perPx = (high - low) / 100

		expect((high - 80) / perPx).toBeGreaterThanOrEqual(9.5)

		expect((20 - low) / perPx).toBeGreaterThanOrEqual(9.5)
	})

	it('keeps the reserved gap past the label flip threshold at every affordable height', () => {
		// The label placement flips a label to its point's other side when the
		// point sits within 21px (offset + height) of the plot edge. The reserved
		// headroom must clear that threshold with slack at EVERY size a label can
		// render at — a reservation that only met it would leave the extreme's
		// label exactly on the flip boundary, and a live resize would dance it
		// across, frame by frame, landing it on the line each time. Sweep the
		// plot heights a resize passes through: past the affordability cutoff the
		// gap holds strictly past the threshold; under it nothing is reserved and
		// the same headroomFits verdict sheds the labels instead.
		const values = [12, -6, 9, -14, 18, 7]

		for (let rangePx = 40; rangePx <= 400; rangePx += 1) {
			const scale = linearScale({ values, range: [rangePx, 0], tickTarget: 4, headroom: 25 })

			if (!scale) throw new Error('scale must resolve')

			if (!headroomFits(25, rangePx)) {
				// Unaffordable: the domain stays at its plain nice bounds.
				const base = linearScale({ values, range: [rangePx, 0], tickTarget: 4 })

				expect(scale.domain).toEqual(base?.domain)

				continue
			}

			const perPx = (scale.domain[1] - scale.domain[0]) / rangePx

			expect((scale.domain[1] - 18) / perPx).toBeGreaterThan(21)

			expect((-14 - scale.domain[0]) / perPx).toBeGreaterThan(21)
		}
	})

	it('caps the reservation share so the data keeps at least half the plot', () => {
		// At an affordable height the two reserved bands may take at most a
		// quarter of the range each; the widened domain therefore holds the data
		// to no less than half the plot, so small charts never render a squashed
		// near-flat line under generous empty bands.
		const scale = linearScale({ values: [20, 80], range: [100, 0], tickTarget: 4, headroom: 25 })

		const [low, high] = scale?.domain ?? [0, 0]

		expect((80 - 20) / (high - low)).toBeGreaterThanOrEqual(0.5)
	})

	it('never widens a pinned bound for headroom', () => {
		const scale = linearScale({
			values: [3, 97],
			range: [100, 0],
			tickTarget: 4,
			max: 97,
			headroom: 21,
		})

		// The pin holds exactly despite the headroom ask; the unpinned floor is free.
		expect(scale?.domain[1]).toBe(97)
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
