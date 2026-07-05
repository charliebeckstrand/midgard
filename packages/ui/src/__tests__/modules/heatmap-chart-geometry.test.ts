import { describe, expect, it } from 'vitest'
import { bandScale } from '../../modules/chart/chart-scale'
import { cellAt, heatmapCells } from '../../modules/chart/heatmap-chart/heatmap-chart-geometry'

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
		expect(cell?.width).toBeCloseTo(3, 5)

		expect(cell?.x).toBeCloseTo(0, 5)
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
