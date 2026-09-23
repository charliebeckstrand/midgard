// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { dragPreview, dragTravel, nearestFit } from '../../modules/dashboard/engine/dashboard-drag'
import type { DashboardCell } from '../../modules/dashboard/engine/dashboard-layout'

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

const position = (cells: readonly DashboardCell[] | undefined) =>
	Object.fromEntries((cells ?? []).map((item) => [item.id, [item.x, item.y]]))

describe('dragPreview', () => {
	const board = [cell('a', 0, 0, 8, 10), cell('b', 8, 0, 8, 10), cell('c', 0, 10, 16, 10)]

	it('moves a tile into free cells', () => {
		const preview = dragPreview(board, 'a', 16, 0, 24)

		expect(preview?.kind).toBe('move')

		expect(position(preview?.cells)).toEqual({ a: [16, 0], b: [8, 0], c: [0, 10] })
	})

	it('moves a tile below the lowest tile', () => {
		expect(dragPreview(board, 'a', 0, 20, 24)?.kind).toBe('move')
	})

	it('shifts against an equal tile in the same row', () => {
		const preview = dragPreview(board, 'a', 8, 0, 24)

		expect(preview).toMatchObject({ kind: 'shift', partner: 'b' })

		expect(position(preview?.cells)).toMatchObject({ a: [8, 0], b: [0, 0] })
	})

	it('swaps with an equal tile in another row', () => {
		const rows = [cell('a', 0, 0, 8, 10), cell('b', 8, 10, 8, 10)]

		const preview = dragPreview(rows, 'a', 8, 10, 24)

		expect(preview).toMatchObject({ kind: 'swap', partner: 'b' })

		expect(position(preview?.cells)).toEqual({ a: [8, 10], b: [0, 0] })
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

		expect(position(preview?.cells).a).toEqual([0, 20])
	})

	it('snaps past a static partner, and never moves it', () => {
		const locked = [cell('a', 0, 0, 8, 10), cell('b', 8, 0, 8, 10, true)]

		const preview = dragPreview(locked, 'a', 8, 0, 24)

		expect(position(preview?.cells)).toEqual({ a: [8, 10], b: [8, 0] })
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
})
