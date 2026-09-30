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

	it('gives a tile the rows that hold the height of its content', () => {
		const cells = [cell('list', 0, 0, 12, 44)]

		const starved = new Map([['list', { minWidth: 240 }]])

		// 384 px over 24 columns and 4 rows a column is 4 px a row. The content and
		// the 12 px gutter need 412 px, which is 103 rows.
		const heights = new Map([['list', 400]])

		const projection = projectLayout(cells, {
			width: 384,
			gap: 12,
			columns: 24,
			demands: starved,
			heights,
		})

		expect(projection.cells[0]).toMatchObject({ w: 24, h: 103 })

		// The saved layout ignores the height.
		const saved = projectLayout(cells, {
			width: 1200,
			gap: 12,
			columns: 24,
			demands: starved,
			heights,
		})

		expect(saved.cells[0]).toMatchObject({ w: 12, h: 44 })
	})

	it('stretches a tile that takes the height of its content to the height of its shelf', () => {
		// 384 px is 16 px a column, so tile a starves at 8 columns, and the two
		// tiles still share one shelf.
		const cells = [cell('a', 0, 0, 8, 20), cell('b', 8, 0, 8, 20)]

		const starved = new Map([
			['a', { minWidth: 150 }],
			['b', { minWidth: 0 }],
		])

		// A row is 4 px. Tile a needs 112 px, which is 28 rows, and tile b needs
		// 212 px, which is 53 rows.
		const heights = new Map([
			['a', 100],
			['b', 200],
		])

		const projection = projectLayout(cells, {
			width: 384,
			gap: 12,
			columns: 24,
			demands: starved,
			heights,
		})

		expect(projection.cells.map((item) => [item.y, item.h])).toEqual([
			[0, 53],
			[0, 53],
		])
	})
})
