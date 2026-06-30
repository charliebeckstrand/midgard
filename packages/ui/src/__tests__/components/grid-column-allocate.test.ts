import { describe, expect, it } from 'vitest'
import {
	allocateColumnWidths,
	type ColumnSizeProfile,
} from '../../modules/grid/grid-column-allocate'

/** Unbounded ceiling, as the measurer emits for a column with no `maxWidth`. */
const UNBOUNDED = Number.MAX_SAFE_INTEGER

/** Builds a profile, defaulting the bounds to a wide-open `[40, ∞]`. */
function profile(
	id: string,
	content: number,
	bounds?: { min?: number; max?: number },
): ColumnSizeProfile {
	return { id, content, min: bounds?.min ?? 40, max: bounds?.max ?? UNBOUNDED }
}

/** Sum of a sizing result's widths. */
function total(sizing: Record<string, number>): number {
	return Object.values(sizing).reduce((sum, w) => sum + w, 0)
}

describe('allocateColumnWidths', () => {
	it('returns an empty map for no columns', () => {
		expect(allocateColumnWidths([], 500)).toEqual({})
	})

	describe('surplus: room to spare', () => {
		it('levels equal-content columns to one width that fills the space', () => {
			const sizing = allocateColumnWidths(
				[profile('a', 100), profile('b', 100), profile('c', 100)],
				400,
			)

			// 300 of content in 400px: the 100px surplus lifts all three to ~133px.
			expect(total(sizing)).toBe(400)

			for (const id of ['a', 'b', 'c']) expect(sizing[id]).toBeGreaterThanOrEqual(133)

			for (const id of ['a', 'b', 'c']) expect(sizing[id]).toBeLessThanOrEqual(134)
		})

		it('lifts the narrow columns to meet the wide one, which keeps its content width', () => {
			// content [80, 150, 80] in 400px: the level solves 2L + 150 = 400 → L = 125,
			// so the two narrow columns rise to 125 while the wide one holds at 150.
			const sizing = allocateColumnWidths(
				[profile('a', 80), profile('b', 150), profile('c', 80)],
				400,
			)

			expect(sizing).toEqual({ a: 125, b: 150, c: 125 })
		})

		it('never lifts a column below its content, so a truncating column gains the room', () => {
			// The narrow column's content (20) clamps up to its 40 min, then the surplus
			// lifts it to 100 while the wide column holds at 200.
			const sizing = allocateColumnWidths([profile('a', 20), profile('b', 200)], 300)

			expect(sizing).toEqual({ a: 100, b: 200 })
		})

		it('holds a width-pinned column exactly and flows the surplus to the others', () => {
			const pinned: ColumnSizeProfile = { id: 'p', content: 150, min: 150, max: 150 }

			const sizing = allocateColumnWidths([pinned, profile('f', 100)], 400)

			expect(sizing.p).toBe(150)

			expect(sizing.f).toBe(250)

			expect(total(sizing)).toBe(400)
		})

		it('caps each column at its max and leaves trailing space rather than overstretching', () => {
			const sizing = allocateColumnWidths(
				[profile('a', 100, { max: 120 }), profile('b', 100, { max: 120 })],
				400,
			)

			// Both ceilings hit before the width fills, so the table holds at 240.
			expect(sizing).toEqual({ a: 120, b: 120 })

			expect(total(sizing)).toBe(240)
		})

		it('respects a max that interrupts the level, spilling the rest to uncapped columns', () => {
			// content [100, 100, 100] in 600px would level to 200 each, but b caps at 150;
			// its 50px of forgone growth spills to a and c (→ 225 each).
			const sizing = allocateColumnWidths(
				[profile('a', 100), profile('b', 100, { max: 150 }), profile('c', 100)],
				600,
			)

			expect(sizing.b).toBe(150)

			expect(sizing.a).toBe(225)

			expect(sizing.c).toBe(225)

			expect(total(sizing)).toBe(600)
		})
	})

	describe('deficit: content meets or exceeds the space', () => {
		it('holds every column at its content width and overflows the container', () => {
			const sizing = allocateColumnWidths(
				[profile('a', 200), profile('b', 200), profile('c', 200)],
				300,
			)

			expect(sizing).toEqual({ a: 200, b: 200, c: 200 })

			// The table runs wider than the space — content shows, the rest scrolls.
			expect(total(sizing)).toBe(600)
			expect(total(sizing)).toBeGreaterThan(300)
		})

		it('clamps content up to the floor before holding', () => {
			const sizing = allocateColumnWidths([profile('a', 10, { min: 80 }), profile('b', 300)], 200)

			// a's tiny content floors at 80; a+b = 380 ≥ 200, so both hold and overflow.
			expect(sizing).toEqual({ a: 80, b: 300 })
		})

		it('holds at content when there is no space to allocate', () => {
			expect(allocateColumnWidths([profile('a', 120), profile('b', 90)], 0)).toEqual({
				a: 120,
				b: 90,
			})
		})
	})

	describe('rounding', () => {
		it('sums to exactly the available width across a pathological split', () => {
			// Seven equal columns in a prime width: floats won't divide evenly, so the
			// carried remainder must still land the integer widths on 701 exactly.
			const profiles = Array.from({ length: 7 }, (_, i) => profile(`c${i}`, 100))

			const sizing = allocateColumnWidths(profiles, 701)

			expect(total(sizing)).toBe(701)
		})

		it('sums to exactly the available width for three columns in 400', () => {
			const sizing = allocateColumnWidths(
				[profile('a', 50), profile('b', 50), profile('c', 50)],
				400,
			)

			expect(total(sizing)).toBe(400)
		})
	})

	describe('single column', () => {
		it('fills the space when unbounded', () => {
			expect(allocateColumnWidths([profile('a', 100)], 300)).toEqual({ a: 300 })
		})

		it('caps at its max, leaving trailing space', () => {
			expect(allocateColumnWidths([profile('a', 100, { max: 150 })], 300)).toEqual({ a: 150 })
		})

		it('holds at content and overflows when the space is too small', () => {
			expect(allocateColumnWidths([profile('a', 250)], 120)).toEqual({ a: 250 })
		})
	})
})
