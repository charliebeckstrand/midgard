// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { DashboardCell } from '../../modules/dashboard/engine/dashboard-layout'
import {
	drivesHeight,
	drivesWidth,
	resizePreview,
} from '../../modules/dashboard/engine/dashboard-resize'

const cell = (
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	fixed = false,
): DashboardCell => ({
	id,
	x,
	y,
	w,
	h,
	static: fixed,
})

const find = (cells: readonly DashboardCell[] | null, id: string) =>
	cells?.find((item) => item.id === id)

describe('resizePreview', () => {
	const board = [cell('a', 0, 0, 8, 10), cell('b', 12, 0, 8, 10), cell('c', 0, 20, 24, 10)]

	it('grows until it meets a neighbour', () => {
		const next = resizePreview(board, 'a', 20, 10, { columns: 24, minW: 1 })

		expect(find(next, 'a')).toMatchObject({ w: 12, h: 10 })
	})

	it('grows the height of a free-form tile until it meets a neighbour', () => {
		const next = resizePreview(board, 'a', 8, 40, { columns: 24, minW: 1 })

		expect(find(next, 'a')).toMatchObject({ w: 8, h: 20 })
	})

	it('never shrinks under the minimum span', () => {
		const next = resizePreview(board, 'a', 2, 10, { columns: 24, minW: 6 })

		expect(find(next, 'a')).toMatchObject({ w: 6 })
	})

	it('derives the height of a ratio tile, and backs off when the height collides', () => {
		const tiles = [cell('a', 0, 0, 8, 18), cell('c', 0, 24, 24, 10)]

		// 12 columns at 16:9 is 27 rows, which meets c at row 24. 10 columns is 23 rows.
		const next = resizePreview(tiles, 'a', 12, 0, { columns: 24, minW: 1, ratio: 16 / 9 })

		expect(find(next, 'a')).toMatchObject({ w: 10, h: 23 })
	})

	it('returns null for no change and for a static tile', () => {
		expect(resizePreview(board, 'a', 8, 10, { columns: 24, minW: 1 })).toBeNull()

		const locked = [cell('a', 0, 0, 8, 10, true)]

		expect(resizePreview(locked, 'a', 12, 10, { columns: 24, minW: 1 })).toBeNull()
	})
})

describe('edges', () => {
	it('maps each edge to the axes that it drives', () => {
		expect([drivesWidth('e'), drivesWidth('s'), drivesWidth('se')]).toEqual([true, false, true])

		expect(drivesHeight('se', undefined)).toBe(true)

		expect(drivesHeight('se', 16 / 9)).toBe(false)

		expect(drivesHeight('e', undefined)).toBe(false)
	})
})

describe('resizePreview with grid-unit limits', () => {
	const board = [cell('a', 0, 0, 8, 10), cell('b', 20, 0, 4, 10)]

	it('stops a width at maxW, before the neighbour', () => {
		const next = resizePreview(board, 'a', 20, 10, { columns: 24, minW: 1, maxW: 10 })

		expect(find(next, 'a')).toMatchObject({ w: 10 })
	})

	it('holds a width at minW, the larger of the two floors', () => {
		expect(resizePreview(board, 'a', 2, 10, { columns: 24, minW: 6 })).toMatchObject([
			{ id: 'a', w: 6 },
			{ id: 'b' },
		])
	})

	it('clamps the height of a free-form tile into minH and maxH', () => {
		const limits = { columns: 24, minW: 1, minH: 6, maxH: 14 }

		expect(find(resizePreview(board, 'a', 8, 40, limits), 'a')).toMatchObject({ h: 14 })

		expect(find(resizePreview(board, 'a', 8, 2, limits), 'a')).toMatchObject({ h: 6 })
	})

	it('ignores the height limits of a tile with a fixed ratio', () => {
		const next = resizePreview([cell('a', 0, 0, 8, 18)], 'a', 12, 0, {
			columns: 24,
			minW: 1,
			minH: 30,
			maxH: 20,
			ratio: 16 / 9,
		})

		expect(find(next, 'a')).toMatchObject({ w: 12, h: 27 })
	})

	it('lets a minimum win over a smaller maximum', () => {
		const next = resizePreview(board, 'a', 20, 10, { columns: 24, minW: 9, maxW: 4 })

		expect(find(next, 'a')).toMatchObject({ w: 9 })
	})

	it('snaps a saved span over the maximum back to it on the first step', () => {
		const next = resizePreview([cell('a', 0, 0, 16, 10)], 'a', 17, 10, {
			columns: 24,
			minW: 1,
			maxW: 12,
		})

		expect(find(next, 'a')).toMatchObject({ w: 12 })
	})

	it('keeps the right edge over a larger minimum', () => {
		const next = resizePreview([cell('a', 20, 0, 2, 10)], 'a', 3, 10, {
			columns: 24,
			minW: 8,
		})

		expect(find(next, 'a')).toMatchObject({ x: 20, w: 4 })
	})
})
