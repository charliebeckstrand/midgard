// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { describeRange, describeWrite } from '../../modules/grid/engine/grid-announcements'
import { RANGE_FIGURES_DEFAULT, rangeFigures } from '../../modules/grid/engine/grid-range/figures'
import {
	filledCorners,
	fillLine,
	fillPlan,
	handleFill,
	rangeFillSource,
} from '../../modules/grid/engine/grid-range/fill'
import { toHtmlTable } from '../../modules/grid/engine/grid-range/html'
import {
	coercePaste,
	pasteOverflow,
	pastePlacement,
} from '../../modules/grid/engine/grid-range/paste'
import {
	edgeScrollStep,
	inRangeRect,
	RANGE_EDGE,
	rangeCells,
	rangeRect,
} from '../../modules/grid/engine/grid-range/range'
import { parseTsv, toTsv, tsvField, unguardField } from '../../modules/grid/engine/grid-range/tsv'
import { intlEn } from '../../primitives/intl/intl-catalog'

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
		const toDataRow = (row: number) => [-1, 0, 1, -1, 2][row] ?? -1

		const cells = rangeCells({ row: 4, col: 2 }, { row: 0, col: 1 }, toDataRow)

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
			describeRange(
				intlEn,
				{ rows: 3, cols: 2 },
				{ column: 'Name', row: 2 },
				{ column: 'Role', row: 4 },
			),
		).toBe('Range of 3 rows and 2 columns, Name row 2 to Role row 4')

		expect(
			describeRange(
				intlEn,
				{ rows: 1, cols: 1 },
				{ column: 'Name', row: 1 },
				{ column: 'Name', row: 1 },
			),
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

	it('reads back an apostrophe that the user typed before a formula lead', () => {
		const block = [
			["'=1", "'@x", "''=1"],
			["'-5", "'quoted", "'"],
		]

		expect(parseTsv(toTsv(block)).map((row) => row.map(unguardField))).toEqual(block)

		// A spreadsheet takes the guard off on paste and shows the text as typed.
		expect(tsvField("'=1")).toBe("''=1")

		expect(tsvField("'quoted")).toBe("'quoted")
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

/** The row step over the data rows `shown`, in their order. */
function stepOver(shown: readonly number[]) {
	return (row: number, steps: number) => {
		const place = shown.indexOf(row)

		return place === -1 ? undefined : shown[place + steps]
	}
}

describe('pasteOverflow', () => {
	const cols = 3

	const step = stepOver([0, 1, 2])

	it('gives the lines after the last data row, each with its columns', () => {
		const block = [
			['a', '1'],
			['b', '2'],
			['c', '3'],
			['d', '4'],
		]

		expect(pasteOverflow(block, { rows: [1], cols: [1] }, cols, step)).toEqual([
			[
				{ col: 1, text: 'c' },
				{ col: 2, text: '3' },
			],
			[
				{ col: 1, text: 'd' },
				{ col: 2, text: '4' },
			],
		])
	})

	it('cuts a line off at the last column, as it cuts a row', () => {
		expect(pasteOverflow([['a'], ['b', 'x', 'y']], { rows: [2], cols: [1] }, cols, step)).toEqual([
			[
				{ col: 1, text: 'b' },
				{ col: 2, text: 'x' },
			],
		])
	})

	it('gives no line for a block that fits, or that a range takes side by side', () => {
		expect(pasteOverflow([['a'], ['b']], { rows: [0], cols: [0] }, cols, step)).toEqual([])

		// The range is a whole multiple of the block, so the block stays in it.
		expect(pasteOverflow([['a']], { rows: [1, 2], cols: [0] }, cols, step)).toEqual([])
	})
})

describe('pastePlacement', () => {
	const cols = 4

	const step = stepOver([0, 1, 2, 3, 4])

	it('writes one field into each cell of the range', () => {
		const targets = pastePlacement([['x']], { rows: [1, 2], cols: [0, 1] }, cols, step)

		expect(targets).toEqual([
			{ row: 1, col: 0, text: 'x' },
			{ row: 1, col: 1, text: 'x' },
			{ row: 2, col: 0, text: 'x' },
			{ row: 2, col: 1, text: 'x' },
		])
	})

	it('tiles a block over a range that is a whole multiple of it', () => {
		const targets = pastePlacement([['a', 'b']], { rows: [0, 1], cols: [0, 1, 2, 3] }, cols, step)

		expect(targets.map((target) => target.text)).toEqual(['a', 'b', 'a', 'b', 'a', 'b', 'a', 'b'])
	})

	it('starts a block at the top-left cell and cuts it at the edge', () => {
		const block = [
			['a', 'b', 'c'],
			['d', 'e', 'f'],
		]

		expect(pastePlacement(block, { rows: [4], cols: [2] }, cols, step)).toEqual([
			{ row: 4, col: 2, text: 'a' },
			{ row: 4, col: 3, text: 'b' },
		])
	})

	it('steps over a row that the cursor does not show', () => {
		const block = [['a'], ['b']]

		expect(pastePlacement(block, { rows: [0], cols: [0] }, cols, stepOver([0, 3, 4]))).toEqual([
			{ row: 0, col: 0, text: 'a' },
			{ row: 3, col: 0, text: 'b' },
		])
	})

	it('gives empty text for a short row of the block', () => {
		const targets = pastePlacement([['a', 'b'], ['c']], { rows: [0], cols: [0] }, cols, step)

		expect(targets.map((target) => target.text)).toEqual(['a', 'b', 'c', ''])
	})

	it('writes nothing for an empty block', () => {
		expect(pastePlacement([], { rows: [0], cols: [0] }, cols, step)).toEqual([])
	})

	it('places a block with more rows than the engine takes as call arguments', () => {
		const block = Array.from({ length: 1_000_000 }, (_, i) => [String(i)])

		expect(pastePlacement(block, { rows: [3], cols: [1] }, cols, step)).toEqual([
			{ row: 3, col: 1, text: '0' },
			{ row: 4, col: 1, text: '1' },
		])
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

	it('keeps an empty cell empty with an empty text', () => {
		expect(coercePaste('', undefined)).toEqual({ value: undefined })

		expect(coercePaste(' ', null)).toEqual({ value: null })
	})

	it('refuses a text that does not fit', () => {
		expect(coercePaste('many', 3)).toBeNull()

		expect(coercePaste('maybe', true)).toBeNull()

		expect(coercePaste('constructor', true)).toBeNull()
	})
})

describe('describeWrite', () => {
	it('adds the skipped count to the commit', () => {
		expect(describeWrite(intlEn, ['Name', 'Count'], undefined, 'pasted', 2)).toBe(
			'2 cells pasted, 2 skipped',
		)

		expect(describeWrite(intlEn, ['Name'], 'Alice', 'pasted', 0)).toBe('Name pasted for Alice')

		expect(describeWrite(intlEn, [], undefined, 'pasted', 1)).toBe('1 cell skipped')

		expect(describeWrite(intlEn, [], undefined, 'pasted', 0)).toBeNull()
	})
})

describe('fillLine', () => {
	it('continues a line of numbers with a constant step', () => {
		expect(fillLine([1, 2], 3)).toEqual([3, 4, 5])

		expect(fillLine([10, 7.5, 5], 2)).toEqual([2.5, 0])

		expect(fillLine([0.1, 0.2], 1)).toEqual([0.3])
	})

	// A series value keeps the decimal places of its source values, whatever its
	// size. A safe integer has up to 16 digits.
	it('continues a series of 16 digits exactly', () => {
		expect(fillLine([1_000_000_000_000_001, 1_000_000_000_000_002], 3)).toEqual([
			1_000_000_000_000_003, 1_000_000_000_000_004, 1_000_000_000_000_005,
		])

		expect(fillLine([1_000_000_000_000_000.5, 1_000_000_000_000_001], 3)).toEqual([
			1_000_000_000_000_001.5, 1_000_000_000_000_002, 1_000_000_000_000_002.5,
		])
	})

	it('takes off the error of a fraction across zero', () => {
		expect(fillLine([-0.3, -0.2], 4)).toEqual([-0.1, 0, 0.1, 0.2])

		expect(fillLine([0.7, 0.8], 3)).toEqual([0.9, 1, 1.1])

		expect(fillLine([1.5e-7, 2.5e-7], 2)).toEqual([3.5e-7, 4.5e-7])
	})

	it('repeats every other line', () => {
		expect(fillLine([5], 2)).toEqual([5, 5])

		expect(fillLine([1, 2, 4], 4)).toEqual([1, 2, 4, 1])

		expect(fillLine(['a', 'b'], 3)).toEqual(['a', 'b', 'a'])

		// One date, or one text with a number, repeats as one number does.
		expect(fillLine([new Date(2026, 2, 1)], 2)).toEqual([
			new Date(2026, 2, 1),
			new Date(2026, 2, 1),
		])

		expect(fillLine(['Item 1'], 2)).toEqual(['Item 1', 'Item 1'])

		expect(fillLine([1, '2'], 2)).toEqual([1, '2'])

		expect(fillLine([], 2)).toEqual([])
	})
})

describe('fillLine dates', () => {
	const day = (year: number, month: number, date: number) => new Date(year, month - 1, date)

	it('continues a step of days, and a week as 7 days', () => {
		expect(fillLine([day(2026, 3, 1), day(2026, 3, 2)], 2)).toEqual([
			day(2026, 3, 3),
			day(2026, 3, 4),
		])

		expect(fillLine([day(2026, 3, 1), day(2026, 3, 8)], 2)).toEqual([
			day(2026, 3, 15),
			day(2026, 3, 22),
		])
	})

	it('continues a step of months on the same day, or the last day of a short month', () => {
		expect(fillLine([day(2026, 1, 31), day(2026, 2, 28)], 3)).toEqual([
			day(2026, 3, 31),
			day(2026, 4, 30),
			day(2026, 5, 31),
		])

		// Two dates a month apart step by months, not by the 31 days between them.
		expect(fillLine([day(2026, 3, 1), day(2026, 4, 1)], 2)).toEqual([
			day(2026, 5, 1),
			day(2026, 6, 1),
		])
	})

	it('continues a step of years as 12 months, from a leap day to Feb 28', () => {
		expect(fillLine([day(2024, 2, 29), day(2025, 2, 28)], 3)).toEqual([
			day(2026, 2, 28),
			day(2027, 2, 28),
			day(2028, 2, 29),
		])

		expect(fillLine([day(2024, 6, 30), day(2025, 6, 30)], 1)).toEqual([day(2026, 6, 30)])
	})

	it('steps back by days', () => {
		expect(fillLine([day(2026, 3, 3), day(2026, 3, 1)], 2)).toEqual([
			day(2026, 2, 27),
			day(2026, 2, 25),
		])
	})

	// A day step counts days of the calendar, not milliseconds, so a change of
	// daylight saving time in the local zone moves no date.
	it('keeps the time of day of a step of days', () => {
		const at = (date: number) => new Date(2026, 2, date, 9, 30)

		expect(fillLine([at(6), at(7)], 3)).toEqual([at(8), at(9), at(10)])
	})

	it('continues `YYYY-MM-DD` strings as strings', () => {
		expect(fillLine(['2026-01-31', '2026-02-28'], 2)).toEqual(['2026-03-31', '2026-04-30'])

		expect(fillLine(['2026-12-30', '2026-12-31'], 2)).toEqual(['2027-01-01', '2027-01-02'])
	})

	// The `Date` constructor and `Date.UTC` read a year from 0 to 99 as 1900 to
	// 1999, so each year goes through `setFullYear`.
	it('keeps a year below 100', () => {
		expect(fillLine(['0050-01-01', '0050-01-02'], 1)).toEqual(['0050-01-03'])

		expect(fillLine(['0000-02-28', '0000-02-29'], 1)).toEqual(['0000-03-01'])

		const year50 = (date: number) => {
			const value = new Date(0)

			value.setFullYear(50, 0, date)

			value.setHours(0, 0, 0, 0)

			return value
		}

		expect(fillLine([year50(1), year50(2)], 1)).toEqual([year50(3)])
	})

	it('repeats a line of dates that is no series', () => {
		const uneven = [day(2026, 3, 1), day(2026, 3, 2), day(2026, 3, 4)]

		expect(fillLine(uneven, 1)).toEqual([day(2026, 3, 1)])

		// The times of day differ, so the line has no step of whole days.
		const times = [new Date(2026, 2, 1, 9), new Date(2026, 2, 2, 10)]

		expect(fillLine(times, 1)).toEqual([times[0]])

		expect(fillLine([day(2026, 3, 1), '2026-03-02'], 1)).toEqual([day(2026, 3, 1)])

		expect(fillLine(['2026-02-30', '2026-03-01'], 1)).toEqual(['2026-02-30'])

		// An invalid day in one month is a date, not text that ends in a number.
		expect(fillLine(['2026-02-28', '2026-02-29'], 2)).toEqual(['2026-02-28', '2026-02-29'])

		expect(fillLine(['2026-04-29', '2026-04-31'], 1)).toEqual(['2026-04-29'])
	})
})

describe('fillLine text with a number', () => {
	it('continues the number at the end of the text', () => {
		expect(fillLine(['Item 1', 'Item 2'], 2)).toEqual(['Item 3', 'Item 4'])

		expect(fillLine(['Q01', 'Q03'], 3)).toEqual(['Q05', 'Q07', 'Q09'])

		expect(fillLine(['Q09', 'Q10'], 1)).toEqual(['Q11'])

		expect(fillLine(['Item 9', 'Item 10'], 1)).toEqual(['Item 11'])
	})

	it('steps back, and repeats a series that would go below zero', () => {
		expect(fillLine(['Item 5', 'Item 4'], 2)).toEqual(['Item 3', 'Item 2'])

		expect(fillLine(['Item 2', 'Item 1'], 2)).toEqual(['Item 2', 'Item 1'])
	})

	it('repeats text with no number at the end, or with other text before it', () => {
		expect(fillLine(['Room 12B', 'Room 13B'], 1)).toEqual(['Room 12B'])

		expect(fillLine(['Item 1', 'Task 2'], 1)).toEqual(['Item 1'])

		expect(fillLine(['Item 1', 'Item 2', 'Item 4'], 1)).toEqual(['Item 1'])
	})
})

describe('fillPlan', () => {
	const read = (row: number, col: number) => row * 10 + col

	const step = stepOver([0, 1, 2, 3, 4])

	it('fills each column down, and each row right', () => {
		expect(fillPlan({ rows: [0, 1], cols: [2] }, 'down', 2, read, step)).toEqual([
			{ row: 2, col: 2, value: 22 },
			{ row: 3, col: 2, value: 32 },
		])

		expect(fillPlan({ rows: [4], cols: [0] }, 'right', 2, read, step)).toEqual([
			{ row: 4, col: 1, value: 40 },
			{ row: 4, col: 2, value: 40 },
		])
	})

	it('steps over a row that the cursor does not show, and stops at the edge', () => {
		expect(fillPlan({ rows: [0], cols: [1] }, 'down', 3, read, stepOver([0, 3, 4]))).toEqual([
			{ row: 3, col: 1, value: 1 },
			{ row: 4, col: 1, value: 1 },
		])
	})

	it('runs a series back from the far edge for a fill up or left', () => {
		expect(fillPlan({ rows: [3, 4], cols: [0] }, 'up', 2, read, step)).toEqual([
			{ row: 2, col: 0, value: 20 },
			{ row: 1, col: 0, value: 10 },
		])

		expect(fillPlan({ rows: [0], cols: [2, 3] }, 'left', 1, read, step)).toEqual([
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

	const distance = (from: number, to: number) => to - from

	it('fills along the axis of the larger travel past the source', () => {
		expect(handleFill(source, { row: 6, col: 3 }, distance)).toEqual({
			direction: 'down',
			count: 3,
		})

		expect(handleFill(source, { row: 0, col: 2 }, distance)).toEqual({ direction: 'up', count: 2 })

		expect(handleFill(source, { row: 4, col: 5 }, distance)).toEqual({
			direction: 'right',
			count: 3,
		})

		expect(handleFill(source, { row: 3, col: 0 }, distance)).toEqual({
			direction: 'left',
			count: 1,
		})
	})

	it('counts the travel over the rows that the cursor shows', () => {
		const shown = [0, 2, 3, 6]

		const over = (from: number, to: number) => shown.indexOf(to) - shown.indexOf(from)

		expect(handleFill(source, { row: 6, col: 2 }, over)).toEqual({ direction: 'down', count: 1 })
	})

	it('goes down or up on a tie, and gives no fill on the source', () => {
		expect(handleFill(source, { row: 4, col: 3 }, distance)).toEqual({
			direction: 'down',
			count: 1,
		})

		expect(handleFill(source, { row: 2, col: 2 }, distance)).toBeNull()
	})
})

describe('filledCorners', () => {
	const source = { top: 2, bottom: 3, left: 1, right: 2 }

	const step = stepOver([0, 1, 2, 3, 4, 5])

	it('anchors at the source corner away from the fill', () => {
		expect(filledCorners(source, { direction: 'down', count: 2 }, step)).toEqual({
			from: { row: 2, col: 1 },
			to: { row: 5, col: 2 },
		})

		expect(filledCorners(source, { direction: 'left', count: 1 }, step)).toEqual({
			from: { row: 3, col: 2 },
			to: { row: 2, col: 0 },
		})

		expect(filledCorners(source, null, step)).toEqual({
			from: { row: 2, col: 1 },
			to: { row: 3, col: 2 },
		})
	})
})

describe('toHtmlTable', () => {
	const td = '<td style="white-space:pre-wrap">'

	it('writes one row for each row of the block, with no header row', () => {
		expect(
			toHtmlTable([
				['a', 'b'],
				['c', 'd'],
			]),
		).toBe(
			`<table><tbody><tr>${td}a</td>${td}b</td></tr><tr>${td}c</td>${td}d</td></tr></tbody></table>`,
		)
	})

	it('escapes the markup, and guards a formula as the TSV does', () => {
		expect(toHtmlTable([['<b>&</b>', '=SUM(A1)', "'=1"]])).toBe(
			`<table><tbody><tr>${td}&lt;b&gt;&amp;&lt;/b&gt;</td>${td}'=SUM(A1)</td>${td}''=1</td></tr></tbody></table>`,
		)
	})

	it('keeps the spaces and the tabs of a cell as the cell holds them', () => {
		expect(toHtmlTable([['  a  b\tc ']])).toBe(
			`<table><tbody><tr>${td}  a  b\tc </td></tr></tbody></table>`,
		)
	})

	it('writes a line break in a cell as a <br> that Excel keeps in the cell', () => {
		const br = '<br style="mso-data-placement:same-cell">'

		expect(toHtmlTable([['one\ntwo\r\nthree']])).toBe(
			`<table><tbody><tr>${td}one${br}two${br}three</td></tr></tbody></table>`,
		)
	})
})

describe('rangeFigures', () => {
	type Line = { id: number; item: string; amount: unknown }

	const lines: Line[] = [
		{ id: 1, item: 'Pens', amount: 12 },
		{ id: 2, item: 'Paper', amount: '$1,200.50' },
		{ id: 3, item: ' ', amount: null },
		{ id: 4, item: 'Ink', amount: '15%' },
	]

	const columns = [
		{ id: 'item', title: 'Item' },
		{ id: 'amount', title: 'Amount' },
	]

	const cells = (rows: number[], cols: number[]) => ({
		rows,
		cols,
		from: { row: rows[0] ?? 0, col: cols[0] ?? 0 },
		to: { row: rows.at(-1) ?? 0, col: cols.at(-1) ?? 0 },
	})

	it('counts each cell with a value, and reads the numbers as the aggregates do', () => {
		const figures = rangeFigures(cells([0, 1, 2, 3], [0, 1]), lines, columns, [
			'count',
			'sum',
			'avg',
			'min',
			'max',
		])

		// The blank item and the null amount hold no value.
		expect(figures).toEqual([
			{ op: 'count', value: 6 },
			{ op: 'sum', value: 1227.5 },
			{ op: 'avg', value: 1227.5 / 3 },
			{ op: 'min', value: 12 },
			{ op: 'max', value: 1200.5 },
		])
	})

	it('gives the count only for a range with no number', () => {
		expect(rangeFigures(cells([0, 1], [0]), lines, columns, RANGE_FIGURES_DEFAULT)).toEqual([
			{ op: 'count', value: 2 },
		])
	})

	it('gives no figures for one cell or no range', () => {
		expect(rangeFigures(cells([0], [1]), lines, columns, RANGE_FIGURES_DEFAULT)).toEqual([])

		expect(rangeFigures(null, lines, columns, RANGE_FIGURES_DEFAULT)).toEqual([])
	})

	it('keeps the order of the figures that it is given', () => {
		const figures = rangeFigures(cells([0, 1], [1]), lines, columns, ['max', 'count'])

		expect(figures.map((figure) => figure.op)).toEqual(['max', 'count'])
	})
})
