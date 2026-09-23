// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { dragPreview, dragTravel } from '../../modules/dashboard/engine/dashboard-drag'
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

	it('blocks an unequal partner, a static partner, and no change', () => {
		expect(dragPreview(board, 'a', 0, 10, 24)).toBeNull()

		const locked = [cell('a', 0, 0, 8, 10), cell('b', 8, 0, 8, 10, true)]

		expect(dragPreview(locked, 'a', 8, 0, 24)).toBeNull()

		expect(dragPreview(board, 'a', 0, 0, 24)).toBeNull()
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
