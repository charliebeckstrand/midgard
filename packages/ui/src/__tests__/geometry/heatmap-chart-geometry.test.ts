// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { MARK_GAP } from '../../modules/chart/engine/chart-constants'
import {
	CELL_RING_WIDTH,
	cellAt,
	cellIndex,
	cellRing,
	type HeatmapCell,
	heatmapCells,
} from '../../modules/chart/engine/chart-geometry/heatmap'
import { bandScale } from '../../modules/chart/engine/chart-scale'

/**
 * A band scale divides the plot range, so a cell edge carries float noise below
 * this bound in frame units.
 */
const CELL_TOLERANCE = 5e-6

// A 2×3 grid over a 300×200 plot, zero band padding so slots tile the range.
const X = bandScale({ count: 3, range: [0, 300], padding: 0 })
const Y = bandScale({ count: 2, range: [0, 200], padding: 0 })

const MATRIX = [
	[1, 2, 3],
	[4, null, 6],
]

describe('heatmapCells', () => {
	it('emits one cell per matrix entry, row-major with stable keys', () => {
		const cells = heatmapCells(MATRIX, X, Y)

		expect(cells).toHaveLength(6)

		expect(cells.map((cell) => cell.key)).toEqual(['0:0', '0:1', '0:2', '1:0', '1:1', '1:2'])

		// Row/col track the matrix indices; the null entry still holds its slot.
		expect(cells[4]).toMatchObject({ row: 1, col: 1, value: null })
	})

	it('insets each cell for the surface gap and clamps the corner radius', () => {
		const [first] = heatmapCells(MATRIX, X, Y)

		// Slot 100×100, inset by half the 4px gap on every side → 96×96 at (2, 2).
		expect(first).toMatchObject({ x: 2, y: 2, width: 96, height: 96 })

		expect(first?.radius).toBe(2)
	})

	it('drops the inset on a cell too small to hold it', () => {
		const tight = bandScale({ count: 100, range: [0, 300], padding: 0 })

		const [cell] = heatmapCells([[1]], tight, Y)

		// A 3px-wide slot keeps its full width rather than inverting to negative.
		expect(cell?.width).toBeNear(3, CELL_TOLERANCE)

		expect(cell?.x).toBeNear(0, CELL_TOLERANCE)
	})
})

describe('cellAt', () => {
	it('resolves a pointer to its row and column', () => {
		expect(cellAt(150, 50, X, Y, 3, 2)).toEqual({ row: 0, col: 1 })

		expect(cellAt(250, 150, X, Y, 3, 2)).toEqual({ row: 1, col: 2 })
	})

	it('reads null outside the grid', () => {
		expect(cellAt(-1, 50, X, Y, 3, 2)).toBeNull()

		expect(cellAt(150, 250, X, Y, 3, 2)).toBeNull()

		expect(cellAt(150, 50, X, Y, 0, 2)).toBeNull()
	})
})

describe('cellRing', () => {
	const cell: HeatmapCell = {
		x: 10,
		y: 20,
		width: 40,
		height: 30,
		radius: 2,
		row: 0,
		col: 0,
		value: 1,
		key: '0:0',
	}

	it('moves the ring out of the cell and the halo onto it, each by half the stroke', () => {
		const half = CELL_RING_WIDTH / 2

		expect(cellRing(cell, 'outer')).toEqual({
			x: 10 - half,
			y: 20 - half,
			width: 40 + CELL_RING_WIDTH,
			height: 30 + CELL_RING_WIDTH,
			radius: 2 + half,
		})

		expect(cellRing(cell, 'inner')).toEqual({
			x: 10 + half,
			y: 20 + half,
			width: 40 - CELL_RING_WIDTH,
			height: 30 - CELL_RING_WIDTH,
			radius: 2 - half,
		})
	})

	it('keeps the ring inside the half of the gap that the cell owns', () => {
		expect(CELL_RING_WIDTH).toBe(MARK_GAP / 2)
	})

	it('takes a halo of zero size on a cell too small for it', () => {
		const halo = cellRing({ ...cell, width: 1, height: 1, radius: 0.5 }, 'inner')

		expect([halo.width, halo.height, halo.radius]).toEqual([0, 0, 0])
	})
})

describe('cellIndex', () => {
	const columns = ['9', '10', '11']

	const rows = ['Mon', 'Tue']

	it('finds the row-major index of a pair of band labels', () => {
		expect(cellIndex(columns, rows, { x: '9', y: 'Mon' })).toBe(0)

		expect(cellIndex(columns, rows, { x: '11', y: 'Tue' })).toBe(5)
	})

	it('finds nothing for a label off the grid, or for no pair', () => {
		expect(cellIndex(columns, rows, { x: '12', y: 'Mon' })).toBeNull()

		expect(cellIndex(columns, rows, { x: '9', y: 'Sun' })).toBeNull()

		expect(cellIndex(columns, rows, null)).toBeNull()

		expect(cellIndex(columns, rows, undefined)).toBeNull()
	})
})
