// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { GridSortState } from '../../modules/grid/context'
import { nextSort, sameSorts } from '../../modules/grid/engine/grid-sort/state'

describe('nextSort', () => {
	describe('plain click (non-additive)', () => {
		it('cycles a lone sorted column ascending → descending → unsorted', () => {
			const asc = nextSort([], 'a', false)

			expect(asc).toEqual([{ column: 'a', direction: 'asc' }])

			const desc = nextSort(asc, 'a', false)

			expect(desc).toEqual([{ column: 'a', direction: 'desc' }])

			expect(nextSort(desc, 'a', false)).toEqual([])
		})

		it('collapses a multi-column sort to the clicked column ascending', () => {
			const multi: GridSortState[] = [
				{ column: 'a', direction: 'asc' },
				{ column: 'b', direction: 'desc' },
			]

			expect(nextSort(multi, 'b', false)).toEqual([{ column: 'b', direction: 'asc' }])
		})
	})

	describe("plain click under cycle: 'toggle'", () => {
		it('flips a lone sorted column ascending ↔ descending without ever clearing', () => {
			const asc = nextSort([], 'a', false, 'toggle')

			expect(asc).toEqual([{ column: 'a', direction: 'asc' }])

			const desc = nextSort(asc, 'a', false, 'toggle')

			expect(desc).toEqual([{ column: 'a', direction: 'desc' }])

			// The tri-state third click clears; toggle wraps back to ascending.
			expect(nextSort(desc, 'a', false, 'toggle')).toEqual([{ column: 'a', direction: 'asc' }])
		})

		it('still collapses a multi-column sort to the clicked column ascending', () => {
			const multi: GridSortState[] = [
				{ column: 'a', direction: 'asc' },
				{ column: 'b', direction: 'desc' },
			]

			expect(nextSort(multi, 'b', false, 'toggle')).toEqual([{ column: 'b', direction: 'asc' }])
		})

		it("explicit 'tri-state' matches the default and clears on the third click", () => {
			const desc: GridSortState[] = [{ column: 'a', direction: 'desc' }]

			expect(nextSort(desc, 'a', false, 'tri-state')).toEqual([])
			expect(nextSort(desc, 'a', false)).toEqual([])
		})
	})

	describe('shift click (additive)', () => {
		it('appends a new column ascending, keeping the others in priority order', () => {
			const base: GridSortState[] = [{ column: 'a', direction: 'asc' }]

			expect(nextSort(base, 'b', true)).toEqual([
				{ column: 'a', direction: 'asc' },
				{ column: 'b', direction: 'asc' },
			])
		})

		it('flips an existing additive column ascending → descending in place', () => {
			const base: GridSortState[] = [
				{ column: 'a', direction: 'asc' },
				{ column: 'b', direction: 'asc' },
			]

			expect(nextSort(base, 'b', true)).toEqual([
				{ column: 'a', direction: 'asc' },
				{ column: 'b', direction: 'desc' },
			])
		})

		it('drops a descending additive column on the third shift-click', () => {
			const base: GridSortState[] = [
				{ column: 'a', direction: 'asc' },
				{ column: 'b', direction: 'desc' },
			]

			expect(nextSort(base, 'b', true)).toEqual([{ column: 'a', direction: 'asc' }])
		})

		it("keeps additive semantics — including the drop — under cycle: 'toggle'", () => {
			const base: GridSortState[] = [{ column: 'a', direction: 'asc' }]

			expect(nextSort(base, 'b', true, 'toggle')).toEqual([
				{ column: 'a', direction: 'asc' },
				{ column: 'b', direction: 'asc' },
			])

			const desc: GridSortState[] = [
				{ column: 'a', direction: 'asc' },
				{ column: 'b', direction: 'desc' },
			]

			expect(nextSort(desc, 'b', true, 'toggle')).toEqual([{ column: 'a', direction: 'asc' }])
		})
	})
})

describe('sameSorts', () => {
	it('treats two distinct empty lists as equal', () => {
		// The clear case: a cleared sort resolves to a fresh `[]` that is value-equal
		// to the unsorted state the shown rows reflect, though never the same object.
		expect(sameSorts([], [])).toBe(true)
	})

	it('matches lists with the same columns and directions in the same order', () => {
		const a: GridSortState[] = [
			{ column: 'a', direction: 'asc' },
			{ column: 'b', direction: 'desc' },
		]

		const b: GridSortState[] = [
			{ column: 'a', direction: 'asc' },
			{ column: 'b', direction: 'desc' },
		]

		expect(sameSorts(a, b)).toBe(true)
	})

	it('distinguishes a differing direction', () => {
		expect(
			sameSorts([{ column: 'a', direction: 'asc' }], [{ column: 'a', direction: 'desc' }]),
		).toBe(false)
	})

	it('distinguishes priority order', () => {
		const a: GridSortState[] = [
			{ column: 'a', direction: 'asc' },
			{ column: 'b', direction: 'asc' },
		]

		const b: GridSortState[] = [
			{ column: 'b', direction: 'asc' },
			{ column: 'a', direction: 'asc' },
		]

		expect(sameSorts(a, b)).toBe(false)
	})

	it('distinguishes lists of differing length', () => {
		expect(sameSorts([{ column: 'a', direction: 'asc' }], [])).toBe(false)
	})
})
