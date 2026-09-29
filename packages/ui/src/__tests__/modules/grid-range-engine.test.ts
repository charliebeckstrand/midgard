// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { describeRange, describeWrite } from '../../modules/grid/engine/grid-announcements'
import {
	filledCorners,
	fillLine,
	fillPlan,
	handleFill,
	rangeFillSource,
} from '../../modules/grid/engine/grid-range/fill'
import { coercePaste, pastePlacement } from '../../modules/grid/engine/grid-range/paste'
import {
	edgeScrollStep,
	inRangeRect,
	RANGE_EDGE,
	rangeCells,
	rangeRect,
} from '../../modules/grid/engine/grid-range/range'
import { parseTsv, toTsv, tsvField, unguardField } from '../../modules/grid/engine/grid-range/tsv'

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

describe('parseTsv', () => {
	it('splits fields at tabs and rows at each kind of line break', () => {
		expect(parseTsv('a\tb\r\nc\td\re\tf')).toEqual([
			['a', 'b'],
			['c', 'd'],
			['e', 'f'],
		])
	})

	it('drops one line break at the end, and keeps an empty field', () => {
		expect(parseTsv('a\t\n')).toEqual([['a', '']])

		expect(parseTsv('a\n\n')).toEqual([['a'], ['']])

		expect(parseTsv('')).toEqual([])
	})

	it('reads a quoted field with a tab, a line break, and a doubled quote', () => {
		expect(parseTsv('"a\tb"\t"two\nlines"\n"say ""hi"""')).toEqual([
			['a\tb', 'two\nlines'],
			['say "hi"'],
		])
	})

	it('reads back what toTsv writes', () => {
		const block = [
			['=1+1', 'two\tparts'],
			['say "hi"', 'plain'],
		]

		expect(parseTsv(toTsv(block)).map((row) => row.map(unguardField))).toEqual(block)
	})

	it('runs a quote with no end to the end of the text', () => {
		expect(parseTsv('"open\tfield')).toEqual([['open\tfield']])
	})
})

describe('unguardField', () => {
	it('takes off only the apostrophe that the guard adds', () => {
		expect(unguardField("'=SUM(A1)")).toBe('=SUM(A1)')

		expect(unguardField("'-x")).toBe('-x')

		expect(unguardField("'quoted")).toBe("'quoted")

		expect(unguardField("'-5")).toBe("'-5")
	})
})

describe('pastePlacement', () => {
	const size = { rows: 5, cols: 4 }

	it('writes one field into each cell of the range', () => {
		const targets = pastePlacement([['x']], { rows: [1, 2], cols: [0, 1] }, size)

		expect(targets).toEqual([
			{ row: 1, col: 0, text: 'x' },
			{ row: 1, col: 1, text: 'x' },
			{ row: 2, col: 0, text: 'x' },
			{ row: 2, col: 1, text: 'x' },
		])
	})

	it('tiles a block over a range that is a whole multiple of it', () => {
		const targets = pastePlacement([['a', 'b']], { rows: [0, 1], cols: [0, 1, 2, 3] }, size)

		expect(targets.map((target) => target.text)).toEqual(['a', 'b', 'a', 'b', 'a', 'b', 'a', 'b'])
	})

	it('starts a block at the top-left cell and cuts it at the edge', () => {
		const block = [
			['a', 'b', 'c'],
			['d', 'e', 'f'],
		]

		expect(pastePlacement(block, { rows: [4], cols: [2] }, size)).toEqual([
			{ row: 4, col: 2, text: 'a' },
			{ row: 4, col: 3, text: 'b' },
		])
	})

	it('gives empty text for a short row of the block', () => {
		const targets = pastePlacement([['a', 'b'], ['c']], { rows: [0], cols: [0] }, size)

		expect(targets.map((target) => target.text)).toEqual(['a', 'b', 'c', ''])
	})

	it('writes nothing for an empty block', () => {
		expect(pastePlacement([], { rows: [0], cols: [0] }, size)).toEqual([])
	})
})

describe('coercePaste', () => {
	it('reads the text as the kind of the current value', () => {
		expect(coercePaste(' 1,200.5 ', 3)).toEqual({ value: 1200.5 })

		expect(coercePaste('YES', false)).toEqual({ value: true })

		expect(coercePaste('0', true)).toEqual({ value: false })

		expect(coercePaste(' as is ', 'text')).toEqual({ value: ' as is ' })

		expect(coercePaste('text', null)).toEqual({ value: 'text' })
	})

	it('clears a number cell and a yes/no cell with an empty text', () => {
		expect(coercePaste('', 3)).toEqual({ value: undefined })

		expect(coercePaste(' ', true)).toEqual({ value: undefined })
	})

	it('refuses a text that does not fit', () => {
		expect(coercePaste('many', 3)).toBeNull()

		expect(coercePaste('maybe', true)).toBeNull()

		expect(coercePaste('constructor', true)).toBeNull()
	})
})

describe('describeWrite', () => {
	it('adds the skipped count to the commit', () => {
		expect(describeWrite(['Name', 'Count'], undefined, 'pasted', 2)).toBe(
			'2 cells pasted, 2 skipped',
		)

		expect(describeWrite(['Name'], 'Alice', 'pasted', 0)).toBe('Name pasted for Alice')

		expect(describeWrite([], undefined, 'pasted', 1)).toBe('1 cell skipped')

		expect(describeWrite([], undefined, 'pasted', 0)).toBeNull()
	})
})

describe('fillLine', () => {
	it('continues a line of numbers with a constant step', () => {
		expect(fillLine([1, 2], 3)).toEqual([3, 4, 5])

		expect(fillLine([10, 7.5, 5], 2)).toEqual([2.5, 0])

		expect(fillLine([0.1, 0.2], 1)).toEqual([0.3])
	})

	it('repeats every other line', () => {
		expect(fillLine([5], 2)).toEqual([5, 5])

		expect(fillLine([1, 2, 4], 4)).toEqual([1, 2, 4, 1])

		expect(fillLine(['a', 'b'], 3)).toEqual(['a', 'b', 'a'])

		expect(fillLine([1, '2'], 2)).toEqual([1, '2'])

		expect(fillLine([], 2)).toEqual([])
	})
})

describe('fillPlan', () => {
	const read = (row: number, col: number) => row * 10 + col

	it('fills each column down, and each row right', () => {
		expect(fillPlan({ rows: [0, 1], cols: [2] }, 'down', 2, read)).toEqual([
			{ row: 2, col: 2, value: 22 },
			{ row: 3, col: 2, value: 32 },
		])

		expect(fillPlan({ rows: [4], cols: [0] }, 'right', 2, read)).toEqual([
			{ row: 4, col: 1, value: 40 },
			{ row: 4, col: 2, value: 40 },
		])
	})

	it('runs a series back from the far edge for a fill up or left', () => {
		expect(fillPlan({ rows: [3, 4], cols: [0] }, 'up', 2, read)).toEqual([
			{ row: 2, col: 0, value: 20 },
			{ row: 1, col: 0, value: 10 },
		])

		expect(fillPlan({ rows: [0], cols: [2, 3] }, 'left', 1, read)).toEqual([
			{ row: 0, col: 1, value: 1 },
		])
	})
})

describe('rangeFillSource', () => {
	const cells = { rows: [0, 1, 2], cols: [1, 2] }

	it('takes the top row for a fill down and the first column for a fill right', () => {
		expect(rangeFillSource(cells, 'down')).toEqual({
			source: { rows: [0], cols: [1, 2] },
			count: 2,
		})

		expect(rangeFillSource(cells, 'right')).toEqual({
			source: { rows: [0, 1, 2], cols: [1] },
			count: 1,
		})
	})

	it('gives no fill for a range one cell deep', () => {
		expect(rangeFillSource({ rows: [0], cols: [1, 2] }, 'down')).toBeNull()
	})
})

describe('handleFill', () => {
	const source = { top: 2, bottom: 3, left: 1, right: 2 }

	it('fills along the axis of the larger travel past the source', () => {
		expect(handleFill(source, { row: 6, col: 3 })).toEqual({ direction: 'down', count: 3 })

		expect(handleFill(source, { row: 0, col: 2 })).toEqual({ direction: 'up', count: 2 })

		expect(handleFill(source, { row: 4, col: 5 })).toEqual({ direction: 'right', count: 3 })

		expect(handleFill(source, { row: 3, col: 0 })).toEqual({ direction: 'left', count: 1 })
	})

	it('goes down or up on a tie, and gives no fill on the source', () => {
		expect(handleFill(source, { row: 4, col: 3 })).toEqual({ direction: 'down', count: 1 })

		expect(handleFill(source, { row: 2, col: 2 })).toBeNull()
	})
})

describe('filledCorners', () => {
	const source = { top: 2, bottom: 3, left: 1, right: 2 }

	it('anchors at the source corner away from the fill', () => {
		expect(filledCorners(source, { direction: 'down', count: 2 })).toEqual({
			from: { row: 2, col: 1 },
			to: { row: 5, col: 2 },
		})

		expect(filledCorners(source, { direction: 'left', count: 1 })).toEqual({
			from: { row: 3, col: 2 },
			to: { row: 2, col: 0 },
		})

		expect(filledCorners(source, null)).toEqual({
			from: { row: 2, col: 1 },
			to: { row: 3, col: 2 },
		})
	})
})
