// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { describeTidy } from '../../modules/dashboard/engine/dashboard-announcements'
import { collides, type DashboardCell } from '../../modules/dashboard/engine/dashboard-layout'
import { tidyCells } from '../../modules/dashboard/engine/dashboard-tidy'

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

/** The origin of each cell by id. */
function origins(cells: readonly DashboardCell[]): Record<string, [number, number]> {
	return Object.fromEntries(cells.map((item) => [item.id, [item.x, item.y]]))
}

describe('tidyCells', () => {
	it('moves each tile straight up to the top edge or the tile above it', () => {
		const board = [cell('a', 0, 4, 12, 10), cell('b', 12, 20, 12, 10), cell('c', 0, 30, 12, 10)]

		expect(origins(tidyCells(board))).toEqual({ a: [0, 0], b: [12, 0], c: [0, 10] })
	})

	it('keeps the column and the span of each tile', () => {
		const board = [cell('a', 3, 8, 7, 5), cell('b', 11, 12, 9, 6)]

		const tidy = tidyCells(board)

		expect(tidy.map(({ x, w, h }) => [x, w, h])).toEqual([
			[3, 7, 5],
			[11, 9, 6],
		])
	})

	it('stops a tile under the lowest tile above it in any of its columns', () => {
		// b spans the columns of both a and c, so the taller a sets its floor.
		const board = [cell('a', 0, 0, 8, 12), cell('c', 16, 0, 8, 4), cell('b', 4, 20, 16, 6)]

		expect(origins(tidyCells(board)).b).toEqual([4, 12])
	})

	it('never moves a static tile, and stops each tile under it', () => {
		const board = [
			cell('s', 0, 6, 12, 4, true),
			cell('a', 0, 20, 12, 10),
			cell('b', 12, 20, 12, 10),
		]

		const tidy = tidyCells(board)

		expect(origins(tidy)).toEqual({ s: [0, 6], a: [0, 10], b: [12, 0] })

		expect(tidy[0]).toBe(board[0])
	})

	it('lets a tile rise past a static tile lower down in its columns', () => {
		const board = [cell('a', 0, 4, 12, 4), cell('s', 0, 20, 12, 4, true)]

		expect(origins(tidyCells(board))).toEqual({ a: [0, 0], s: [0, 20] })
	})

	it('keeps the order of the tiles in a column', () => {
		const board = [cell('low', 0, 40, 8, 5), cell('high', 0, 10, 8, 5), cell('mid', 0, 25, 8, 5)]

		expect(origins(tidyCells(board))).toEqual({ high: [0, 0], mid: [0, 5], low: [0, 10] })
	})

	it('gives a layout with no overlap a result with no overlap', () => {
		const board = [
			cell('a', 0, 3, 10, 7),
			cell('b', 10, 9, 14, 5),
			cell('c', 2, 14, 12, 9),
			cell('d', 14, 20, 10, 3),
			cell('s', 18, 30, 6, 4, true),
			cell('e', 16, 40, 8, 6),
		]

		const tidy = tidyCells(board)

		for (const a of tidy) for (const b of tidy) expect(collides(a, b)).toBe(false)
	})

	it('holds a tile that already overlaps a placed tile where it is', () => {
		const board = [cell('a', 0, 0, 12, 10), cell('b', 6, 5, 12, 10)]

		expect(origins(tidyCells(board)).b).toEqual([6, 5])
	})

	it('returns the input when no tile moves, and keeps each cell that stays', () => {
		const tidyBoard = [cell('a', 0, 0, 12, 10), cell('b', 12, 0, 12, 4), cell('c', 12, 4, 12, 6)]

		expect(tidyCells(tidyBoard)).toBe(tidyBoard)

		const board = [cell('a', 0, 0, 12, 10), cell('b', 12, 6, 12, 4)]

		const tidy = tidyCells(board)

		expect(tidy[0]).toBe(board[0])

		expect(tidy[1]).not.toBe(board[1])
	})
})

describe('describeTidy', () => {
	it('counts the tiles that moved, or says that the board is already tidy', () => {
		expect(describeTidy(0)).toBe('The board is already tidy.')

		expect(describeTidy(1)).toBe('Tidied the board. Moved 1 tile up.')

		expect(describeTidy(3)).toBe('Tidied the board. Moved 3 tiles up.')
	})
})
