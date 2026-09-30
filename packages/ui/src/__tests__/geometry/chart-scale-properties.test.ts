// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import { bandIndexAt, bandScale, nearestBandIndex } from '../../modules/chart/engine/chart-scale'
import { FLOAT } from '../helpers/geometry/tolerance'

// `chart-scale.test.ts` holds the properties of the ticks, of the linear map,
// and of the band centers. The properties below add the band edges and the two
// hit tests, which read a pointer coordinate back to a band.

/** A band scale over a plot extent in whole pixels, as the charts give it. */
const band = () =>
	fc.record({
		count: fc.integer({ min: 1, max: 24 }),
		from: fc.integer({ min: -200, max: 200 }),
		width: fc.integer({ min: 24, max: 1200 }),
		padding: fc.integer({ min: 0, max: 100 }).map((percent) => percent / 100),
	})

/**
 * A fraction of one slot. The bounds keep a point a hundredth of a slot clear
 * of a slot edge, where the floor of the hit test can round either way.
 */
const inSlot = () => fc.integer({ min: 1, max: 99 }).map((percent) => percent / 100)

describe('bandScale · edge properties', () => {
	test.prop([band()])('holds each band inside its own slot', ({ count, from, width, padding }) => {
		const scale = bandScale({ count, range: [from, from + width], padding })

		for (let index = 0; index < count; index++) {
			const slot = from + index * scale.step

			expect(scale.at(index)).toBeGreaterThanOrEqual(slot - FLOAT)

			expect(scale.at(index) + scale.width).toBeLessThanOrEqual(slot + scale.step + FLOAT)
		}
	})

	test.prop([band()])('fills the range with the slots', ({ count, from, width, padding }) => {
		const scale = bandScale({ count, range: [from, from + width], padding })

		expect(scale.step * count).toBeNear(width, FLOAT)

		expect(scale.width).toBeNear(scale.step * (1 - padding), FLOAT)
	})
})

describe('bandIndexAt · properties', () => {
	test.prop([band(), fc.nat(), inSlot()])(
		'reads a point inside a slot as the index of that slot',
		({ count, from, width, padding }, pick, part) => {
			const scale = bandScale({ count, range: [from, from + width], padding })

			const index = pick % count

			const pos = from + (index + part) * scale.step

			expect(bandIndexAt(pos, scale, count)).toBe(index)

			expect(nearestBandIndex(pos, scale, count)).toBe(index)
		},
	)

	test.prop([band(), fc.integer({ min: 1, max: 500 }), fc.boolean()])(
		'misses past the ends, where the nearest band is the end band',
		({ count, from, width, padding }, beyond, before) => {
			const scale = bandScale({ count, range: [from, from + width], padding })

			const pos = before ? from - beyond : from + width + beyond

			expect(bandIndexAt(pos, scale, count)).toBeNull()

			expect(nearestBandIndex(pos, scale, count)).toBe(before ? 0 : count - 1)
		},
	)
})
