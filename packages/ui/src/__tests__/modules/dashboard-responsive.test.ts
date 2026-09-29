// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { projectLayout } from '../../modules/dashboard/engine/dashboard-responsive'
import { cell } from '../helpers/dashboard-cells'

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

	it('keeps the shape of a free-form tile as it widens', () => {
		const cells = [cell('stat', 0, 0, 6, 16), cell('spark', 6, 0, 3, 14)]

		const free = new Map([
			['stat', { minWidth: 160 }],
			['spark', { minWidth: 0 }],
		])

		// 360 px over 24 columns is 15 px a column, so the stat starves at 6 columns.
		const projection = projectLayout(cells, { width: 360, gap: 12, columns: 24, demands: free })

		const byId = Object.fromEntries(projection.cells.map((item) => [item.id, item]))

		// Each tile keeps its saved ratio of columns to rows: 6 to 16, and 3 to 14.
		expect(byId.stat?.h).toBe(Math.round((16 * (byId.stat?.w ?? 0)) / 6))

		expect(byId.spark?.h).toBe(Math.round((14 * (byId.spark?.w ?? 0)) / 3))

		expect(byId.stat?.w).toBeGreaterThan(6)
	})
})
