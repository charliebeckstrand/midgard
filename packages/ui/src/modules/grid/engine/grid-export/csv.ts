import { csvField } from '../../../../utilities/export-output'
import type { GridColumn } from '../../types'
import { cellText, exportFields } from './accessor'

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
export function rowsToCsv<T>(columns: GridColumn<T>[], rows: readonly T[]): string {
	const fields = exportFields(columns)

	const header = fields.map((field) => csvField(field.label)).join(',')

	const body = rows.map((row) =>
		fields.map((field) => csvField(cellText(field.accessor(row)))).join(','),
	)

	return [header, ...body].join('\r\n')
}
