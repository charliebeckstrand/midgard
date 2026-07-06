'use client'

import type { GridColumn } from '../types'
import { cellText, exportFields } from './export-accessor'
import { downloadBlob } from './export-download'

/** A leading character a spreadsheet unconditionally reads as a formula/command start. @internal */
const FORMULA_LEAD = /^[=@\t\r]/

/** A leading sign — a formula start unless the whole field is a plain number. @internal */
const SIGNED_LEAD = /^[+-]/

/** A well-formed signed decimal (optional exponent) — legitimate data, not a formula. @internal */
const PLAIN_NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/

/**
 * Neutralizes spreadsheet formula injection: a field a spreadsheet would
 * evaluate on open — one led by `=`, `@`, a tab, or a carriage return, or by
 * `+`/`-` when the field isn't a plain number — is prefixed with a single quote
 * so the app imports it as literal text. Signed numbers (`-5`, `+1.2e3`) pass
 * through untouched so numeric columns still parse.
 *
 * @internal
 */
function neutralizeFormula(value: string): string {
	if (FORMULA_LEAD.test(value)) return `'${value}`

	if (SIGNED_LEAD.test(value) && !PLAIN_NUMBER.test(value)) return `'${value}`

	return value
}

/**
 * Quotes a CSV field per RFC 4180: a field carrying the delimiter, a quote, or
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
	downloadBlob(filename, [String.fromCharCode(0xfeff), csv], 'text/csv;charset=utf-8')
}
