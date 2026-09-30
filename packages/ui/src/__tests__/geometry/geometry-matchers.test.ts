// @vitest-environment node
import { fc, test } from '@fast-check/vitest'
import { describe, expect, it } from 'vitest'
import {
	type Box,
	boxOf,
	centerOf,
	formatLength,
	isBoxSource,
	overhang,
} from '../helpers/geometry/box'
import { FLOAT, LAYOUT_UNIT, PIXEL } from '../helpers/geometry/tolerance'

const frame: Box = { left: 0, top: 0, right: 100, bottom: 50 }

/**
 * A length in whole layout units, as Chromium keeps one. The sums of such
 * lengths are exact in floating point, so a property can state an exact bound.
 */
const units = (min: number, max: number) => fc.integer({ min, max }).map((n) => n * LAYOUT_UNIT)

/** A box whose edges are whole layout units. */
const box = fc
	.tuple(units(-64_000, 64_000), units(-64_000, 64_000), units(0, 64_000), units(0, 64_000))
	.map(([left, top, width, height]) => ({ left, top, right: left + width, bottom: top + height }))

/**
 * A stand-in for an element. The matchers read only these members, so the
 * project needs no window.
 */
function fakeElement(rect: Box, slot?: string): Element {
	const element = {
		tagName: 'SPAN',
		getBoundingClientRect: () => ({ ...rect, width: rect.right - rect.left }),
		closest: () => (slot ? { getAttribute: () => slot } : null),
	}

	return element as unknown as Element
}

describe('toContainBox', () => {
	it('passes for a box inside the frame, and for the frame itself', () => {
		expect(frame).toContainBox({ left: 10, top: 10, right: 90, bottom: 40 })

		expect(frame).toContainBox(frame)
	})

	it('names each edge that the inner box extends past, by how much', () => {
		expect(() =>
			expect(frame).toContainBox({ left: -2, top: 0, right: 103.5, bottom: 50 }),
		).toThrow('it extends past left by 2, right by 3.5')
	})

	it('holds an edge that misses by no more than the tolerance', () => {
		expect(frame).toContainBox(
			{ left: 0, top: 0, right: 100 + PIXEL, bottom: 50 },
			{ tolerance: PIXEL },
		)

		expect(() =>
			expect(frame).toContainBox(
				{ left: 0, top: 0, right: 100 + PIXEL + LAYOUT_UNIT, bottom: 50 },
				{ tolerance: PIXEL },
			),
		).toThrow('right by 1.0156')
	})

	it('has no slack by default', () => {
		expect(() => expect(frame).toContainBox({ ...frame, bottom: 50 + LAYOUT_UNIT })).toThrow(
			'bottom by 0.0156',
		)
	})

	it('inverts under not', () => {
		expect(frame).not.toContainBox({ ...frame, right: 101 })

		expect(() => expect(frame).not.toContainBox(frame)).toThrow('not to contain')
	})

	it('reads the bounding box of an element, and names its anchor', () => {
		const plot = fakeElement(frame, 'chart-plot')
		const label = fakeElement({ left: 95, top: 10, right: 110, bottom: 20 })

		expect(() => expect(plot).toContainBox(label)).toThrow(
			'expected <span>[data-slot="chart-plot"] { left: 0, top: 0, right: 100, bottom: 50 } to contain <span> { left: 95, top: 10, right: 110, bottom: 20 }',
		)
	})

	it('rejects a value that gives no box, and a negative tolerance', () => {
		expect(() => expect(frame).toContainBox({ left: 0, top: 0 } as never)).toThrow(TypeError)

		expect(() => expect(42).toContainBox(frame)).toThrow(TypeError)

		expect(() => expect(frame).toContainBox(frame, { tolerance: -1 })).toThrow(RangeError)

		expect(() => expect(frame).toContainBox(frame, { tolerance: Number.NaN })).toThrow(RangeError)
	})

	test.prop([box])('a box contains itself', (b) => {
		expect(b).toContainBox(b)
	})

	test.prop([box, box])(
		'holds exactly when no edge of the overhang is positive',
		(inner, outer) => {
			const holds = Object.values(overhang(inner, outer)).every((n) => n <= 0)

			if (holds) expect(outer).toContainBox(inner)
			else expect(outer).not.toContainBox(inner)
		},
	)
})

describe('toMatchBox', () => {
	it('passes for the same box, and for a box within the tolerance on each edge', () => {
		expect(frame).toMatchBox({ ...frame })

		expect({ left: 0.5, top: -0.5, right: 100.25, bottom: 49.5 }).toMatchBox(frame, {
			tolerance: PIXEL,
		})
	})

	it('names each edge that misses, with its signed difference', () => {
		expect(() => expect({ ...frame, left: -3, bottom: 52 }).toMatchBox(frame)).toThrow(
			'it misses at left by -3, bottom by 2',
		)
	})

	it('inverts under not', () => {
		expect({ ...frame, top: 1 }).not.toMatchBox(frame)
	})

	test.prop([box, fc.integer({ min: 0, max: 64 }), fc.integer({ min: -1, max: 1 })])(
		'a shift of each edge up to the tolerance matches, and one unit more misses',
		(b, tolerance, sign) => {
			const shifted = (by: number): Box => ({
				left: b.left + by * sign,
				top: b.top - by * sign,
				right: b.right + by,
				bottom: b.bottom - by,
			})

			const bound = tolerance * LAYOUT_UNIT

			expect(shifted(bound)).toMatchBox(b, { tolerance: bound })

			expect(shifted(bound + LAYOUT_UNIT)).not.toMatchBox(b, { tolerance: bound })
		},
	)
})

describe('toBeNear', () => {
	it('passes within an absolute tolerance, at the bound too', () => {
		expect(10.4).toBeNear(10, 0.5)

		expect(10.5).toBeNear(10, 0.5)

		expect(0.1 + 0.2).toBeNear(0.3, FLOAT)
	})

	it('states the difference on failure', () => {
		expect(() => expect(12).toBeNear(10, 1)).toThrow(
			'expected 12 to be within 1 of 10; the difference is 2',
		)
	})

	it('fails a NaN, and passes two equal infinities', () => {
		expect(Number.NaN).not.toBeNear(0, Number.POSITIVE_INFINITY)

		expect(Number.POSITIVE_INFINITY).toBeNear(Number.POSITIVE_INFINITY, 0)

		expect(Number.POSITIVE_INFINITY).not.toBeNear(Number.NEGATIVE_INFINITY, 0)
	})

	it('rejects a value that is not a number, and a negative tolerance', () => {
		expect(() => expect('10').toBeNear(10, 1)).toThrow(TypeError)

		expect(() => expect(10).toBeNear(10, -1)).toThrow(RangeError)
	})
})

describe('box helpers', () => {
	it('keeps only the four edges of a bounding box', () => {
		expect(boxOf(fakeElement(frame))).toEqual(frame)
	})

	it('copies a box whose edges are getters, as a DOMRect keeps them', () => {
		class Rect {
			get left() {
				return 1
			}

			get top() {
				return 2
			}

			get right() {
				return 3
			}

			get bottom() {
				return 4
			}
		}

		expect({ ...boxOf(new Rect()) }).toEqual({ left: 1, top: 2, right: 3, bottom: 4 })
	})

	it('gives the center of a box and of an element', () => {
		expect(centerOf(frame)).toEqual({ x: 50, y: 25 })

		expect(centerOf(fakeElement({ left: 10, top: 20, right: 11, bottom: 23 }))).toEqual({
			x: 10.5,
			y: 21.5,
		})
	})

	it('tells a box source from other values', () => {
		expect(isBoxSource(frame)).toBe(true)

		expect(isBoxSource(fakeElement(frame))).toBe(true)

		expect(isBoxSource({ left: 0, top: 0, right: '1', bottom: 0 })).toBe(false)

		expect(isBoxSource(null)).toBe(false)
	})

	it('writes a length to four decimals, which show a layout unit', () => {
		expect(formatLength(3)).toBe('3')

		expect(formatLength(LAYOUT_UNIT)).toBe('0.0156')

		expect(formatLength(1.5)).toBe('1.5')
	})
})
