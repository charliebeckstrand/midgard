import { downloadBlob, neutralizeFormula } from '../../../../utilities/export-output'
import type { GridColumn } from '../../types'
import { cellText, exportFields } from './accessor'

/**
 * Quotes a CSV field per RFC 4180. A field carrying the delimiter, a quote, or
 * a line break is wrapped in double quotes with its own quotes doubled. A field
 * a spreadsheet would treat as a formula is first neutralized
 * (see {@link neutralizeFormula}). Plain fields pass through untouched.
 *
 * @internal
 */
function escapeCsvField(value: string): string {
	const guarded = neutralizeFormula(value)

	return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

/**
 * Serializes rows to RFC 4180 CSV. A header row holds the labels of the data
 * columns, and one row per datum follows it. Each cell reads through the
 * column's export value. Non-data columns (selection, actions, drag handle, expander) are skipped. Rows are joined
 * with CRLF; an empty `rows` yields the header line alone.
 *
 * @typeParam T - Shape of a single row.
 * @param columns - Columns in display order; only data columns are emitted.
 * @param rows - The rows to serialize (typically the filtered/sorted set).
 * @returns The CSV document as a string (no trailing newline, no BOM).
 * @internal
 */
export function rowsToCsv<T>(columns: GridColumn<T>[], rows: T[]): string {
	const fields = exportFields(columns)

	const header = fields.map((field) => escapeCsvField(field.label)).join(',')

	const body = rows.map((row) =>
		fields.map((field) => escapeCsvField(cellText(field.accessor(row)))).join(','),
	)

	return [header, ...body].join('\r\n')
}

/**
 * Triggers a client-side download of `csv` as a file named `filename`.
 * Prepends a UTF-8 BOM so spreadsheet apps (Excel) detect the encoding.
 *
 * @param filename - Suggested download name (e.g. `grid.csv`).
 * @param csv - The CSV document, as produced by {@link rowsToCsv}.
 * @internal
 */
export function downloadCsv(filename: string, csv: string): void {
	downloadBlob(
		new Blob([String.fromCharCode(0xfeff), csv], { type: 'text/csv;charset=utf-8' }),
		filename,
	)
}
