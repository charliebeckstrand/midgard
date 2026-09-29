// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { describeRange } from '../../modules/grid/engine/grid-announcements'
import {
	edgeScrollStep,
	inRangeRect,
	RANGE_EDGE,
	rangeCells,
	rangeRect,
} from '../../modules/grid/engine/grid-range/range'
import { toTsv, tsvField } from '../../modules/grid/engine/grid-range/tsv'

describe('rangeRect', () => {
	it('spans two corners in either order', () => {
		const rect = { top: 1, bottom: 3, left: 0, right: 2 }

		expect(rangeRect({ row: 1, col: 0 }, { row: 3, col: 2 })).toEqual(rect)

		expect(rangeRect({ row: 3, col: 2 }, { row: 1, col: 0 })).toEqual(rect)

		expect(inRangeRect(rect, 2, 1)).toBe(true)

		expect(inRangeRect(rect, 0, 1)).toBe(false)

		expect(inRangeRect(rect, 2, 3)).toBe(false)
	})
})

describe('rangeCells', () => {
	it('steps over the places that hold no data row', () => {
		// Place 0 is a group header, and places 1 to 4 hold data rows 0 to 3,
		// except place 3, which is a group total.
		const dataRowOf = (row: number) => [-1, 0, 1, -1, 2][row] ?? -1

		const cells = rangeCells({ row: 4, col: 2 }, { row: 0, col: 1 }, dataRowOf)

		expect(cells.rows).toEqual([0, 1, 2])

		expect(cells.cols).toEqual([1, 2])

		expect(cells.from).toEqual({ row: 2, col: 2 })

		expect(cells.to).toEqual({ row: -1, col: 1 })
	})
})

describe('tsv', () => {
	it('joins cells with tabs and rows with line breaks', () => {
		expect(
			toTsv([
				['a', 'b'],
				['c', 'd'],
			]),
		).toBe('a\tb\nc\td')
	})

	it('quotes a field that holds a tab, a line break, or a quote', () => {
		expect(tsvField('a\tb')).toBe('"a\tb"')

		expect(tsvField('two\nlines')).toBe('"two\nlines"')

		expect(tsvField('say "hi"')).toBe('"say ""hi"""')

		expect(tsvField('plain')).toBe('plain')
	})

	it('guards a field that a spreadsheet can run as a formula', () => {
		expect(tsvField('=SUM(A1)')).toBe("'=SUM(A1)")

		expect(tsvField('-5')).toBe('-5')
	})
})

describe('edgeScrollStep', () => {
	const rect = { left: 0, top: 0, right: 400, bottom: 300 }

	it('scrolls nothing in the middle of the region', () => {
		expect(edgeScrollStep({ x: 200, y: 150 }, rect)).toEqual({ x: 0, y: 0 })
	})

	it('scrolls toward an edge that the pointer is near or past', () => {
		expect(edgeScrollStep({ x: 200, y: 300 - RANGE_EDGE / 2 }, rect).y).toBeGreaterThan(0)

		expect(edgeScrollStep({ x: 200, y: -50 }, rect).y).toBeLessThan(0)

		expect(edgeScrollStep({ x: 420, y: 150 }, rect).x).toBeGreaterThan(0)
	})

	it('scrolls faster further from the band, up to a limit', () => {
		const near = edgeScrollStep({ x: 200, y: 300 - RANGE_EDGE + 4 }, rect).y

		const far = edgeScrollStep({ x: 200, y: 360 }, rect).y

		expect(far).toBeGreaterThan(near)

		expect(edgeScrollStep({ x: 200, y: 5000 }, rect).y).toBe(far)
	})
})

describe('describeRange', () => {
	it('gives the size and the two corners', () => {
		expect(
			describeRange({ rows: 3, cols: 2 }, { column: 'Name', row: 2 }, { column: 'Role', row: 4 }),
		).toBe('Range of 3 rows and 2 columns, Name row 2 to Role row 4')

		expect(
			describeRange({ rows: 1, cols: 1 }, { column: 'Name', row: 1 }, { column: 'Name', row: 1 }),
		).toBe('Range of 1 row and 1 column, Name row 1 to Name row 1')
	})
})
