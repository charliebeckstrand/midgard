import { parseNumeric } from '../../../../utilities'
import { inferEditorKind } from '../grid-editing-utilities'

/**
 * One cell that a paste writes: a data row index, a data column index, and the
 * text of the clipboard field. @internal
 */
export type GridPasteTarget = { row: number; col: number; text: string }

/**
 * The cells that a block of clipboard fields writes into a range. The range
 * gives its data row indexes and its data column indexes, each in order.
 * `size` gives the count of data rows and data columns in the grid.
 *
 * - A block of one field goes into each cell of the range.
 * - A range that is a whole multiple of the block on both axes takes copies
 *   of the block, side by side.
 * - Else the block starts at the top-left cell of the range and keeps its own
 *   size. The part of the block after the last data row or the last data
 *   column is cut off.
 *
 * A row of the block that is shorter than the widest row gives empty text for
 * the fields that it does not have. @internal
 */
export function pastePlacement(
	block: readonly (readonly string[])[],
	area: { rows: readonly number[]; cols: readonly number[] },
	size: { rows: number; cols: number },
): GridPasteTarget[] {
	const height = block.length

	const width = Math.max(0, ...block.map((fields) => fields.length))

	const top = area.rows[0]

	const left = area.cols[0]

	if (height === 0 || width === 0 || top === undefined || left === undefined) return []

	const field = (i: number, j: number) => block[i % height]?.[j % width] ?? ''

	const fits = area.rows.length % height === 0 && area.cols.length % width === 0

	const targets: GridPasteTarget[] = []

	if (fits) {
		area.rows.forEach((row, i) => {
			area.cols.forEach((col, j) => {
				targets.push({ row, col, text: field(i, j) })
			})
		})

		return targets
	}

	for (let i = 0; i < height && top + i < size.rows; i++) {
		for (let j = 0; j < width && left + j < size.cols; j++) {
			targets.push({ row: top + i, col: left + j, text: field(i, j) })
		}
	}

	return targets
}

/** The texts that paste as `true` and as `false` into a yes/no cell, in lowercase. */
const BOOLEAN_TEXT = new Map([
	['true', true],
	['yes', true],
	['1', true],
	['false', false],
	['no', false],
	['0', false],
])

/**
 * The value of a pasted text in a cell whose value is `current`, or `null`
 * when the text does not fit the kind of that value. A number cell reads a
 * number as sort and filter read it. A yes/no cell reads `true`, `false`,
 * `yes`, `no`, `1`, or `0`, in any case. A text cell takes the text as it is.
 * An empty text clears a number cell or a yes/no cell, as its editor does
 * when it is empty. @internal
 */
export function coercePaste(text: string, current: unknown): { value: unknown } | null {
	const kind = inferEditorKind(current)

	if (kind === 'text') return { value: text }

	const trimmed = text.trim()

	if (trimmed === '') return { value: undefined }

	if (kind === 'number') {
		const value = parseNumeric(trimmed)

		return value === null ? null : { value }
	}

	const value = BOOLEAN_TEXT.get(trimmed.toLowerCase())

	return value === undefined ? null : { value }
}
