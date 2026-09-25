// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { dragPreview, dragTravel, nearestFit } from '../../modules/dashboard/engine/dashboard-drag'
import {
	type DashboardCell,
	fits,
	ROW_SUBDIVISION,
} from '../../modules/dashboard/engine/dashboard-layout'
import { cell, origins } from '../helpers/dashboard-cells'

describe('dragPreview', () => {
	const board = [cell('a', 0, 0, 8, 10), cell('b', 8, 0, 8, 10), cell('c', 0, 10, 16, 10)]

	it('moves a tile into free cells', () => {
		const preview = dragPreview(board, 'a', 16, 0, 24)

		expect(preview?.kind).toBe('move')

		expect(origins(preview?.cells)).toEqual({ a: [16, 0], b: [8, 0], c: [0, 10] })
	})

	it('moves a tile below the lowest tile', () => {
		expect(dragPreview(board, 'a', 0, 20, 24)?.kind).toBe('move')
	})

	it('shifts against an equal tile in the same row', () => {
		const preview = dragPreview(board, 'a', 8, 0, 24)

		expect(preview).toMatchObject({ kind: 'shift', partner: 'b' })

		expect(origins(preview?.cells)).toMatchObject({ a: [8, 0], b: [0, 0] })
	})

	it('swaps with an equal tile in another row', () => {
		const rows = [cell('a', 0, 0, 8, 10), cell('b', 8, 10, 8, 10)]

		const preview = dragPreview(rows, 'a', 8, 10, 24)

		expect(preview).toMatchObject({ kind: 'swap', partner: 'b' })

		expect(origins(preview?.cells)).toEqual({ a: [8, 10], b: [0, 0] })
	})

	it('engages a reorder at exactly half coverage', () => {
		// At x = 4 the target covers half of b and half of a's own origin.
		expect(dragPreview(board, 'a', 4, 0, 24)?.kind).toBe('shift')

		expect(dragPreview(board, 'a', 3, 0, 24)).toBeNull()
	})

	it('snaps past an unequal partner to the nearest free origin', () => {
		// The target covers c, which is wider, so no reorder. Row 20 under c is free,
		// and from row 12 it is nearer than the start cell.
		const preview = dragPreview(board, 'a', 0, 12, 24)

		expect(preview?.kind).toBe('move')

		expect(origins(preview?.cells).a).toEqual([0, 20])
	})

	it('snaps past a static partner, and never moves it', () => {
		const locked = [cell('a', 0, 0, 8, 10), cell('b', 8, 0, 8, 10, true)]

		const preview = dragPreview(locked, 'a', 8, 0, 24)

		expect(origins(preview?.cells)).toEqual({ a: [8, 10], b: [8, 0] })
	})

	it('snaps home, which changes nothing, when the start cell is nearest', () => {
		expect(dragPreview(board, 'a', 0, 0, 24)).toBeNull()

		// One column over, the target overlaps b; the start cell is the nearest fit.
		expect(dragPreview(board, 'a', 1, 0, 24)).toBeNull()
	})

	it('never moves a static tile', () => {
		expect(dragPreview([cell('a', 0, 0, 8, 10, true)], 'a', 8, 0, 24)).toBeNull()
	})

	it('keeps the cells that the change does not touch by identity', () => {
		const preview = dragPreview(board, 'a', 16, 0, 24)

		expect(preview?.cells[1]).toBe(board[1])

		expect(preview?.cells[2]).toBe(board[2])
	})
})

describe('dragTravel', () => {
	it('reaches one band under the lowest other tile', () => {
		const board = [cell('a', 0, 0, 8, 10), cell('c', 0, 10, 16, 10)]

		expect(dragTravel(board, 'a', 24)).toEqual({ maxX: 16, maxY: 20 })

		expect(dragTravel(board, 'c', 24)).toEqual({ maxX: 8, maxY: 10 })
	})
})

describe('nearestFit', () => {
	it('prefers the nearest free origin, counting a column as four rows', () => {
		// Free at (8, 10) and at (16, 0): the row move of 10 is nearer than 8 columns.
		const board = [cell('a', 0, 0, 8, 10), cell('b', 8, 0, 8, 10), cell('c', 0, 10, 8, 10)]

		expect(nearestFit(board, 'a', 8, 1, 24)).toEqual({ x: 8, y: 10 })
	})

	it('always finds a place, under the lowest tile at worst', () => {
		const board = [cell('a', 0, 0, 4, 4), cell('wall', 4, 0, 20, 40)]

		expect(nearestFit(board, 'a', 20, 0, 24)).toEqual({ x: 20, y: 40 })
	})

	it('snaps home at once when one entry lies far under the board', { timeout: 1_000 }, () => {
		// The search stops at the distance of the start cell, not at the lowest tile.
		const board = [cell('a', 0, 0, 8, 10), cell('b', 8, 0, 8, 10), cell('far', 0, 1e6, 8, 10)]

		// Column 1 overlaps b, and the start cell is the nearest free origin.
		expect(nearestFit(board, 'a', 1, 0, 24)).toBeNull()
	})

	it('gives a tie to the upper row, also from a farther row', () => {
		// Columns 9 and 11 of row 10, and column 10 of rows 6 and 14, are each 16 away.
		const board = [cell('a', 0, 20, 1, 1), cell('wall', 10, 7, 1, 7)]

		expect(nearestFit(board, 'a', 10, 10, 24)).toEqual({ x: 10, y: 6 })
	})

	it('gives the answer of a sort of each origin, for each target', () => {
		const boards = [
			[cell('a', 0, 0, 8, 10), cell('b', 8, 0, 8, 10), cell('c', 0, 10, 16, 10)],
			[cell('a', 0, 0, 4, 4), cell('wall', 4, 0, 20, 40)],
			[
				cell('a', 0, 0, 6, 8),
				cell('b', 6, 0, 6, 12),
				cell('c', 12, 0, 12, 6),
				cell('d', 0, 8, 6, 6),
				cell('e', 12, 6, 4, 10),
				cell('f', 16, 6, 8, 4, true),
				cell('g', 6, 16, 10, 5),
			],
		]

		for (const board of boards) {
			for (const tile of board) {
				const { maxX, maxY } = dragTravel(board, tile.id, 24)

				for (let y = 0; y <= maxY; y++) {
					for (let x = 0; x <= maxX; x++) {
						expect(nearestFit(board, tile.id, x, y, 24)).toEqual(sortedFit(board, tile.id, x, y))
					}
				}
			}
		}
	})
})

/**
 * The reference search: it sorts each origin in the travel range by distance, and
 * takes the first that fits. The sort is stable, so a tie goes to the upper row,
 * then to the left column. The start cell wins a tie at its distance.
 */
function sortedFit(
	board: readonly DashboardCell[],
	id: string,
	x: number,
	y: number,
): { x: number; y: number } | null {
	const origin = board.find((item) => item.id === id)

	if (origin === undefined) return null

	const { maxX, maxY } = dragTravel(board, id, 24)

	const candidates: { x: number; y: number; distance: number }[] = []

	for (let cy = 0; cy <= maxY; cy++) {
		for (let cx = 0; cx <= maxX; cx++) {
			const home = cx === origin.x && cy === origin.y ? -0.5 : 0

			candidates.push({
				x: cx,
				y: cy,
				distance: ((cx - x) * ROW_SUBDIVISION) ** 2 + (cy - y) ** 2 + home,
			})
		}
	}

	candidates.sort((a, b) => a.distance - b.distance)

	const hit = candidates.find((item) => fits(board, { ...origin, x: item.x, y: item.y }, 24))

	if (hit === undefined || (hit.x === origin.x && hit.y === origin.y)) return null

	return { x: hit.x, y: hit.y }
}
