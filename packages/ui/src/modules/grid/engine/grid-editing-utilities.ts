/** The primitive-typed inline editor the grid mounts when a column supplies no `editCell` slot. @internal */
export type EditorKind = 'text' | 'number' | 'boolean'

/**
 * Picks the inline editor for a cell from its value's primitive type: a boolean
 * drives a yes/no listbox, a number a number input, and everything else (string,
 * null, undefined) a text input. A column's {@link GridColumn.editCell} slot
 * supersedes this for richer controls. @internal
 */
export function inferEditorKind(value: unknown): EditorKind {
	if (typeof value === 'boolean') return 'boolean'

	if (typeof value === 'number') return 'number'

	return 'text'
}

/**
 * Whether a data column can be edited: it isn't `readOnly` and binds an editor —
 * a `field` to read/write, or a custom `editCell` slot. A cell in an editable row
 * renders its editor only when this holds. @internal
 */
export function isColumnEditable(col: {
	readOnly?: boolean
	field?: unknown
	editCell?: unknown
}): boolean {
	return !col.readOnly && (col.field != null || col.editCell != null)
}

/**
 * Serializes a rectangular block of cell values as TSV for the clipboard — the
 * lingua franca spreadsheets and the grid's own paste speak. `null`/`undefined`
 * serialize empty. @internal
 */
export function serializeTsv(values: unknown[][]): string {
	return values.map((row) => row.map((value) => String(value ?? '')).join('\t')).join('\n')
}

/**
 * Parses a clipboard TSV block into its cell texts. Handles the three newline
 * conventions and drops the trailing empty line most spreadsheet copies append,
 * without collapsing genuinely empty interior rows. @internal
 */
export function parseTsv(text: string): string[][] {
	const lines = text.split(/\r\n|\r|\n/)

	if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop()

	return lines.map((line) => line.split('\t'))
}

/**
 * Coerces a pasted cell text to the target cell's current primitive type, so a
 * numeric column receives a number and a boolean column a boolean rather than
 * their string spellings. An uncoercible text (a non-numeric string for a
 * number cell) returns `undefined` — the paste skips that cell rather than
 * writing a mistyped value. Strings (and untyped cells) pass through as text.
 *
 * @internal
 */
export function coercePastedValue(text: string, sample: unknown): unknown {
	if (typeof sample === 'number') {
		const parsed = Number(text.trim())

		return text.trim() !== '' && !Number.isNaN(parsed) ? parsed : undefined
	}

	if (typeof sample === 'boolean') {
		const normalized = text.trim().toLowerCase()

		if (['true', 'yes', '1'].includes(normalized)) return true

		if (['false', 'no', '0'].includes(normalized)) return false

		return undefined
	}

	return text
}
