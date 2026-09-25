// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import {
	bandBoundaries,
	bandScale,
	headroomFits,
	linearScale,
	nearestBandIndex,
} from '../../modules/chart/engine/chart-scale'

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

describe('bandBoundaries', () => {
	it('rules one line per gap, halfway between adjacent centers, none at the ends', () => {
		const scale = bandScale({ count: 4, range: [0, 400] })

		// Centers land at 50, 150, 250, 350; boundaries at their midpoints.
		expect(bandBoundaries(scale, 4)).toEqual([100, 200, 300])
	})

	it('draws nothing below two bands or on a collapsed scale', () => {
		expect(bandBoundaries(bandScale({ count: 1, range: [0, 400] }), 1)).toEqual([])

		expect(bandBoundaries(bandScale({ count: 0, range: [0, 400] }), 0)).toEqual([])
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

// The tables above hold the documented examples. The properties below read the
// same scales over a generated domain, so a tick that lands off its step
// shrinks to the smallest series that shows it.
//
// The generators stay on realistic chart numbers — integers, and thousandths of
// one. A pair of subnormal doubles gives a span whose nice step underflows to
// zero, which is a shape no chart reaches and no tick loop ends on.
const value = () =>
	fc.oneof(
		fc.integer({ min: -10_000, max: 10_000 }),
		fc.integer({ min: -1_000_000, max: 1_000_000 }).map((raw) => raw / 1000),
	)

const values = () => fc.array(value(), { minLength: 1, maxLength: 8 })

/** A plot extent in pixels, written top-to-bottom as the charts write it. */
const range = () =>
	fc
		.tuple(fc.integer({ min: 0, max: 400 }), fc.integer({ min: 0, max: 400 }))
		.filter(([from, to]) => from !== to)

/** A tick target that asks for an axis, so the spark tier stays out of these. */
const tickTarget = () => fc.integer({ min: 1, max: 12 })

/**
 * The mantissa of `step`, in `[1, 10)`. A clean step is a mantissa of 1, 2, or
 * 5 over a power of ten, and the scaling loop reads that power off without
 * `Math.log10`, whose result at a power of ten is not always exact.
 */
function mantissa(step: number): number {
	let scaled = step

	while (scaled >= 9.999_999_9) scaled /= 10

	while (scaled < 0.999_999_9) scaled *= 10

	return scaled
}

/** Whether two numbers agree to within `slack` parts of `scale`. */
function near(a: number, b: number, scale: number, slack = 1e-6): boolean {
	return Math.abs(a - b) <= Math.abs(scale) * slack
}

describe('linearScale · tick properties', () => {
	test.prop([values(), range(), tickTarget()])(
		'spaces every tick by one step',
		(series, extent, target) => {
			const scale = linearScale({ values: series, range: extent, tickTarget: target })

			if (!scale) throw new Error('a finite series must resolve')

			expect(scale.ticks.length).toBeGreaterThanOrEqual(1)

			if (scale.ticks.length < 2) return

			const step = (scale.ticks[1] as number) - (scale.ticks[0] as number)

			expect(step).toBeGreaterThan(0)

			for (let index = 1; index < scale.ticks.length; index++) {
				const gap = (scale.ticks[index] as number) - (scale.ticks[index - 1] as number)

				expect(near(gap, step, step, 1e-5)).toBe(true)
			}
		},
	)

	test.prop([values(), range(), tickTarget()])(
		'steps by one, two, or five over a power of ten',
		(series, extent, target) => {
			const scale = linearScale({ values: series, range: extent, tickTarget: target })

			if (!scale || scale.ticks.length < 2) return

			const step = (scale.ticks[1] as number) - (scale.ticks[0] as number)

			const unit = mantissa(step)

			expect([1, 2, 5].some((clean) => near(unit, clean, clean, 1e-6))).toBe(true)
		},
	)

	test.prop([values(), range(), tickTarget()])(
		'keeps every tick inside the domain',
		(series, extent, target) => {
			const scale = linearScale({ values: series, range: extent, tickTarget: target })

			if (!scale) throw new Error('a finite series must resolve')

			const [low, high] = scale.domain

			const slack = (high - low) * 1e-6

			for (const tick of scale.ticks) {
				expect(tick).toBeGreaterThanOrEqual(low - slack)

				expect(tick).toBeLessThanOrEqual(high + slack)
			}
		},
	)

	test.prop([values(), range(), tickTarget()])(
		'holds the whole series inside an unpinned domain',
		(series, extent, target) => {
			const scale = linearScale({ values: series, range: extent, tickTarget: target })

			if (!scale) throw new Error('a finite series must resolve')

			const [low, high] = scale.domain

			const slack = (high - low) * 1e-9

			for (const datum of series) {
				expect(datum).toBeGreaterThanOrEqual(low - slack)

				expect(datum).toBeLessThanOrEqual(high + slack)
			}
		},
	)

	test.prop([values(), range()])('draws no tick at the spark tier', (series, extent) => {
		const scale = linearScale({ values: series, range: extent, tickTarget: 0 })

		expect(scale?.ticks).toEqual([])
	})
})

describe('linearScale · map properties', () => {
	test.prop([values(), range(), tickTarget()])(
		'sends each domain edge to its own range edge',
		(series, extent, target) => {
			const scale = linearScale({ values: series, range: extent, tickTarget: target })

			if (!scale) throw new Error('a finite series must resolve')

			expect(scale.map(scale.domain[0])).toBe(extent[0])

			expect(scale.map(scale.domain[1])).toBe(extent[1])
		},
	)

	test.prop([values(), range(), tickTarget(), value(), value()])(
		'never reverses the order of two values',
		(series, extent, target, a, b) => {
			const scale = linearScale({ values: series, range: extent, tickTarget: target })

			if (!scale) throw new Error('a finite series must resolve')

			const [low, high] = a <= b ? [a, b] : [b, a]

			const travel = (scale.map(high) - scale.map(low)) * (extent[1] - extent[0])

			expect(travel).toBeGreaterThanOrEqual(0)
		},
	)

	test.prop([values(), range(), tickTarget(), fc.integer({ min: 1, max: 5000 })])(
		'clamps a value outside the domain to that edge',
		(series, extent, target, beyond) => {
			const scale = linearScale({ values: series, range: extent, tickTarget: target })

			if (!scale) throw new Error('a finite series must resolve')

			expect(scale.map(scale.domain[0] - beyond)).toBe(scale.map(scale.domain[0]))

			expect(scale.map(scale.domain[1] + beyond)).toBe(scale.map(scale.domain[1]))
		},
	)
})

describe('bandScale · properties', () => {
	const band = () =>
		fc.record({
			count: fc.integer({ min: 1, max: 24 }),
			width: fc.integer({ min: 24, max: 1200 }),
			padding: fc.integer({ min: 0, max: 90 }).map((percent) => percent / 100),
		})

	test.prop([band()])('reads a band center back as its own index', ({ count, width, padding }) => {
		const scale = bandScale({ count, range: [0, width], padding })

		for (let index = 0; index < count; index++) {
			expect(nearestBandIndex(scale.center(index), scale, count)).toBe(index)
		}
	})

	test.prop([band()])('centers each band in its slot', ({ count, width, padding }) => {
		const scale = bandScale({ count, range: [0, width], padding })

		for (let index = 0; index < count; index++) {
			expect(near(scale.center(index) - scale.at(index), scale.width / 2, scale.step)).toBe(true)
		}
	})

	test.prop([band()])('leaves no band overlapping the next', ({ count, width, padding }) => {
		const scale = bandScale({ count, range: [0, width], padding })

		for (let index = 0; index + 1 < count; index++) {
			expect(scale.at(index) + scale.width).toBeLessThanOrEqual(scale.at(index + 1) + 1e-9)
		}
	})

	test.prop([band()])('rules one boundary per gap, midway', ({ count, width, padding }) => {
		const scale = bandScale({ count, range: [0, width], padding })

		const boundaries = bandBoundaries(scale, count)

		expect(boundaries).toHaveLength(Math.max(0, count - 1))

		boundaries.forEach((boundary, index) => {
			const midpoint = (scale.center(index) + scale.center(index + 1)) / 2

			expect(near(boundary, midpoint, scale.step)).toBe(true)
		})
	})
})
