// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { DashboardCell } from '../../modules/dashboard/engine/dashboard-layout'
import { projectLayout } from '../../modules/dashboard/engine/dashboard-responsive'

const cell = (id: string, x: number, y: number, w: number, h: number): DashboardCell => ({
	id,
	x,
	y,
	w,
	h,
	static: false,
})

const board = [cell('a', 0, 0, 8, 18), cell('b', 8, 0, 8, 18), cell('c', 16, 0, 8, 18)]

const demands = new Map([
	['a', { ratio: 16 / 9, minWidth: 320 }],
	['b', { ratio: 16 / 9, minWidth: 320 }],
	['c', { ratio: 16 / 9, minWidth: 320 }],
])

describe('projectLayout', () => {
	it('returns the input when each tile has its width', () => {
		// 1200 px over 24 columns is 50 px a column, so 8 columns hold 392 px.
		const projection = projectLayout(board, { width: 1200, gap: 8, columns: 24, demands })

		expect(projection.identity).toBe(true)

		expect(projection.cells).toBe(board)
	})

	it('returns the input before the first measurement', () => {
		expect(projectLayout(board, { width: 0, gap: 8, columns: 24, demands }).identity).toBe(true)
	})

	it('re-packs starved tiles onto full-width shelves in reading order', () => {
		// 800 px is 33.3 px a column; 320 px + 8 px needs 10 columns, so two fit a shelf.
		const projection = projectLayout(board, { width: 800, gap: 8, columns: 24, demands })

		expect(projection.identity).toBe(false)

		const byId = Object.fromEntries(projection.cells.map((item) => [item.id, item]))

		expect(byId.a).toMatchObject({ x: 0, y: 0, w: 12 })

		expect(byId.b).toMatchObject({ x: 12, y: 0, w: 12 })

		expect(byId.c).toMatchObject({ x: 0, y: 27, w: 24 })
	})

	it('converges on a stack in a narrow container', () => {
		const projection = projectLayout(board, { width: 400, gap: 8, columns: 24, demands })

		expect(projection.cells.map((item) => item.w)).toEqual([24, 24, 24])
	})
})
