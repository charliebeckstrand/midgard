'use client'

import { isDataColumn } from '../../utilities'
import { columnLabel, type GridColumn } from './types'

/**
 * Quotes a CSV field per RFC 4180: a field carrying the delimiter, a quote, or a
 * line break is wrapped in double quotes with its own quotes doubled. Plain
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
 * The raw value a column contributes to an export row: its {@link GridColumn.value}
 * accessor when set (the same value sort and filter read), else the row field
 * named by the column id. A column whose cell is purely rendered (no `value`, no
 * matching field) contributes an empty field.
 *
 * @internal
 */
function exportValue<T>(column: GridColumn<T>, row: T): unknown {
	if (column.value) return column.value(row)

	return (row as Record<string | number, unknown>)[column.id]
}

/**
 * Serializes rows to RFC 4180 CSV: a header row of the data columns' labels
 * followed by one row per datum, each cell read through the column's export
 * value. Non-data columns (selection, actions) are skipped. Rows are joined with
 * CRLF; an empty `rows` yields the header line alone.
 *
 * @typeParam T - Shape of a single row.
 * @param columns - Columns in display order; only data columns are emitted.
 * @param rows - The rows to serialize (typically the filtered/sorted set).
 * @returns The CSV document as a string (no trailing newline, no BOM).
 * @internal
 */
export function rowsToCsv<T>(columns: GridColumn<T>[], rows: T[]): string {
	const dataColumns = columns.filter(isDataColumn)

	const header = dataColumns.map((column) => escapeCsvField(columnLabel(column))).join(',')

	const body = rows.map((row) =>
		dataColumns.map((column) => escapeCsvField(csvCellText(exportValue(column, row)))).join(','),
	)

	return [header, ...body].join('\r\n')
}

/**
 * Triggers a client-side download of `csv` as a file named `filename`. Prepends a
 * UTF-8 BOM so spreadsheet apps (Excel) detect the encoding, wraps the text in a
 * `Blob`, and clicks a transient object-URL anchor, revoking it afterward.
 *
 * @param filename - Suggested download name (e.g. `grid.csv`).
 * @param csv - The CSV document, as produced by {@link rowsToCsv}.
 * @internal
 */
export function downloadCsv(filename: string, csv: string): void {
	const blob = new Blob([String.fromCharCode(0xfeff), csv], { type: 'text/csv;charset=utf-8' })

	const url = URL.createObjectURL(blob)

	const anchor = document.createElement('a')

	anchor.href = url

	anchor.download = filename

	document.body.append(anchor)

	anchor.click()

	anchor.remove()

	URL.revokeObjectURL(url)
}
