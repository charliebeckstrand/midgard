import { describe, expect, it } from 'vitest'
import type { SortState } from '../../modules/grid/context'
import { nextSort, sortsEqual } from '../../modules/grid/engine/grid-sort/state'

describe('nextSort', () => {
	describe('plain click (non-additive)', () => {
		it('sorts a fresh column ascending', () => {
			expect(nextSort([], 'a', false)).toEqual([{ column: 'a', direction: 'asc' }])
		})

		it('cycles a lone sorted column ascending → descending → unsorted', () => {
			const asc = nextSort([], 'a', false)

			expect(asc).toEqual([{ column: 'a', direction: 'asc' }])

			const desc = nextSort(asc, 'a', false)

			expect(desc).toEqual([{ column: 'a', direction: 'desc' }])

			expect(nextSort(desc, 'a', false)).toEqual([])
		})

		it('collapses a multi-column sort to the clicked column ascending', () => {
			const multi: SortState[] = [
				{ column: 'a', direction: 'asc' },
				{ column: 'b', direction: 'desc' },
			]

			expect(nextSort(multi, 'b', false)).toEqual([{ column: 'b', direction: 'asc' }])
		})
	})

	describe('shift click (additive)', () => {
		it('appends a new column ascending, keeping the others in priority order', () => {
			const base: SortState[] = [{ column: 'a', direction: 'asc' }]

			expect(nextSort(base, 'b', true)).toEqual([
				{ column: 'a', direction: 'asc' },
				{ column: 'b', direction: 'asc' },
			])
		})

		it('flips an existing additive column ascending → descending in place', () => {
			const base: SortState[] = [
				{ column: 'a', direction: 'asc' },
				{ column: 'b', direction: 'asc' },
			]

			expect(nextSort(base, 'b', true)).toEqual([
				{ column: 'a', direction: 'asc' },
				{ column: 'b', direction: 'desc' },
			])
		})

		it('drops a descending additive column on the third shift-click', () => {
			const base: SortState[] = [
				{ column: 'a', direction: 'asc' },
				{ column: 'b', direction: 'desc' },
			]

			expect(nextSort(base, 'b', true)).toEqual([{ column: 'a', direction: 'asc' }])
		})
	})
})

describe('sortsEqual', () => {
	it('treats two distinct empty lists as equal', () => {
		// The clear case: a cleared sort resolves to a fresh `[]` that is value-equal
		// to the unsorted state the shown rows reflect, though never the same object.
		expect(sortsEqual([], [])).toBe(true)
	})

	it('matches lists with the same columns and directions in the same order', () => {
		const a: SortState[] = [
			{ column: 'a', direction: 'asc' },
			{ column: 'b', direction: 'desc' },
		]

		const b: SortState[] = [
			{ column: 'a', direction: 'asc' },
			{ column: 'b', direction: 'desc' },
		]

		expect(sortsEqual(a, b)).toBe(true)
	})

	it('distinguishes a differing direction', () => {
		expect(
			sortsEqual([{ column: 'a', direction: 'asc' }], [{ column: 'a', direction: 'desc' }]),
		).toBe(false)
	})

	it('distinguishes priority order', () => {
		const a: SortState[] = [
			{ column: 'a', direction: 'asc' },
			{ column: 'b', direction: 'asc' },
		]

		const b: SortState[] = [
			{ column: 'b', direction: 'asc' },
			{ column: 'a', direction: 'asc' },
		]

		expect(sortsEqual(a, b)).toBe(false)
	})

	it('distinguishes lists of differing length', () => {
		expect(sortsEqual([{ column: 'a', direction: 'asc' }], [])).toBe(false)
	})
})
