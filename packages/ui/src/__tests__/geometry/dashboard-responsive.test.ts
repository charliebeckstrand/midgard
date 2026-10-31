// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { resolveLayout } from '../../modules/dashboard/engine/dashboard-layout'
import { projectionSteps, projectLayout } from '../../modules/dashboard/engine/dashboard-responsive'
import { createDashboardStore } from '../../modules/dashboard/engine/dashboard-store'
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

		// Each shelf is one grid row of auto height, so the next shelf is the next index.
		expect(byId.c).toMatchObject({ x: 0, y: 1, w: 24 })
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

describe('projectionSteps', () => {
	// The tiles of the docs playground: three stats on one row, two charts under them.
	const layout = [
		{ id: 'revenue', x: 0, y: 0, w: 8, h: 20 },
		{ id: 'units', x: 8, y: 0, w: 8, h: 20 },
		{ id: 'sold', x: 16, y: 0, w: 8, h: 20 },
		{ id: 'regions', x: 0, y: 20, w: 12, h: 10 },
		{ id: 'mix', x: 12, y: 20, w: 12, h: 10 },
	]

	const playground = new Map([
		['revenue', { minWidth: 200 }],
		['units', { minWidth: 200 }],
		['sold', { minWidth: 160 }],
		['regions', { ratio: 16 / 9, minWidth: 320 }],
		['mix', { ratio: 16 / 9, minWidth: 320 }],
	])

	const cells = resolveLayout(layout, playground, 24)

	/** The cells that a store paints after its first measurement at `width`. */
	function measuredPaint(width: number) {
		const store = createDashboardStore({
			columns: 24,
			gap: 12,
			editing: false,
			layout,
			demands: playground,
			declared: new Set(),
			width,
			gesture: null,
			filter: undefined,
			selections: [],
		})

		return cells.map((item) => store.getView().cells.get(item.id))
	}

	/** The cells that the steps paint at `width`: the narrowest step that covers it. */
	function stepPaint(width: number) {
		const steps = projectionSteps(cells, { gap: 12, columns: 24, demands: playground })

		return steps.findLast((step) => width < step.below)?.cells ?? cells
	}

	it('paints what the first measurement paints, at each width', () => {
		for (let width = 120; width <= 1400; width += 1) {
			expect(stepPaint(width), `${width} px`).toEqual(measuredPaint(width))
		}
	})

	it('ends in a stack, and starts at the width where a tile starves', () => {
		const steps = projectionSteps(cells, { gap: 12, columns: 24, demands: playground })

		// The charts need 320 px plus a gutter at 12 of 24 columns: 664 px.
		expect(steps[0]?.below).toBe(664)

		expect(steps.at(-1)?.cells.map((item) => item.w)).toEqual([24, 24, 24, 24, 24])
	})

	it('returns no step when no tile can starve', () => {
		const free = new Map(cells.map((item) => [item.id, {}]))

		expect(projectionSteps(cells, { gap: 12, columns: 24, demands: free })).toEqual([])
	})
})
