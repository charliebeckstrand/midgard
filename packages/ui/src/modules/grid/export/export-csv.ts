'use client'

import type { GridColumn } from '../types'
import { exportFields } from './export-accessor'
import { downloadBlob } from './export-download'

/**
 * Quotes a CSV field per RFC 4180: a field carrying the delimiter, a quote, or
 * a line break is wrapped in double quotes with its own quotes doubled. Plain
 * fields pass through untouched.
 *
 * @internal
 */
function escapeCsvField(value: string): string {
	return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Stringifies a cell value for CSV: nullish becomes empty, everything else `String()`s. @internal */
function csvCellText(value: unknown): string {
	return value == null ? '' : String(value)
}

/**
 * Serializes rows to RFC 4180 CSV: a header row of the data columns' labels
 * followed by one row per datum, each cell read through the column's export
 * value. Non-data columns (selection, actions) are skipped. Rows are joined
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
		fields.map((field) => escapeCsvField(csvCellText(field.accessor(row)))).join(','),
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
	downloadBlob(filename, [String.fromCharCode(0xfeff), csv], 'text/csv;charset=utf-8')
}
