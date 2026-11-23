import { reduceNumbers } from '../../../../utilities/aggregate'
import { parseNumeric } from '../../../../utilities/parse-numeric'
import { inferEditorKind } from '../grid-edit/utilities'
import type { GridRowStep } from './range'

/**
 * One cell that a paste writes: a data row index, a data column index, and the
 * text of the clipboard field. @internal
 */
export type GridPasteTarget = { row: number; col: number; text: string }

/**
 * The cells that a block of clipboard fields writes into a range. The range
 * gives its data row indexes and its data column indexes, each in order.
 * `cols` gives the count of data columns in the grid, and `step` gives the
 * data rows below the range, over the rows that the cursor shows.
 *
 * - A block of one field goes into each cell of the range.
 * - A range that is a whole multiple of the block on both axes takes copies
 *   of the block, side by side.
 * - Else the block starts at the top-left cell of the range and keeps its own
 *   size. The part of the block after the last data row or the last data
 *   column is cut off. {@link pasteOverflow} gives the lines after the last
 *   data row.
 *
 * A row of the block that is shorter than the widest row gives empty text for
 * the fields that it does not have. @internal
 */
export function pastePlacement(
	block: readonly (readonly string[])[],
	area: { rows: readonly number[]; cols: readonly number[] },
	cols: number,
	step: GridRowStep,
): GridPasteTarget[] {
	const shape = blockShape(block, area)

	if (!shape) return []

	const { height, width, top, left, field } = shape

	if (shape.fits) {
		return area.rows.flatMap((row, i) =>
			area.cols.map((col, j) => ({ row, col, text: field(i, j) })),
		)
	}

	const targets: GridPasteTarget[] = []

	for (let i = 0; i < height; i++) {
		const row = step(top, i)

		if (row === undefined) break

		for (let j = 0; j < width && left + j < cols; j++) {
			targets.push({ row, col: left + j, text: field(i, j) })
		}
	}

	return targets
}

/**
 * The lines of a block that {@link pastePlacement} cuts off after the last
 * data row, each as its fields with their data column indexes. The part of a
 * line after the last data column is cut off, as it is for a row. A block that
 * a range takes side by side has no such line. A grid that shows the new-row
 * slot adds each line as a row. @internal
 */
export function pasteOverflow(
	block: readonly (readonly string[])[],
	area: { rows: readonly number[]; cols: readonly number[] },
	cols: number,
	step: GridRowStep,
): { col: number; text: string }[][] {
	const shape = blockShape(block, area)

	if (!shape || shape.fits) return []

	const { height, width, top, left, field } = shape

	const lines: { col: number; text: string }[][] = []

	for (let i = 0; i < height; i++) {
		if (step(top, i) !== undefined) continue

		const line: { col: number; text: string }[] = []

		for (let j = 0; j < width && left + j < cols; j++)
			line.push({ col: left + j, text: field(i, j) })

		lines.push(line)
	}

	return lines
}

/**
 * The size of a block and where it starts in a range, or `null` for an empty
 * block or range. `fits` is whether the range is a whole multiple of the block
 * on both axes. `field` gives a field of the block, and repeats the block past
 * its edge. A row of the block that is shorter than the widest row gives empty
 * text for the fields that it does not have.
 */
function blockShape(
	block: readonly (readonly string[])[],
	area: { rows: readonly number[]; cols: readonly number[] },
) {
	const height = block.length

	// The reduce does not spread the rows as call arguments, so a paste of
	// many rows does not overflow the stack.
	const lengths = block.map((fields) => fields.length)

	const width = height === 0 ? 0 : reduceNumbers(lengths, 'max')

	const top = area.rows[0]

	const left = area.cols[0]

	if (height === 0 || width === 0 || top === undefined || left === undefined) return null

	const field = (i: number, j: number) => block[i % height]?.[j % width] ?? ''

	const fits = area.rows.length % height === 0 && area.cols.length % width === 0

	return { height, width, top, left, field, fits }
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
 * when it is empty. An empty text keeps an empty cell (`null` or
 * `undefined`) as it is. Such a cell has no kind to read, and a clear of it
 * must not write `''` and make it a text cell. @internal
 */
export function coercePaste(text: string, current: unknown): { value: unknown } | null {
	if (current == null && text.trim() === '') return { value: current }

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
