'use client'

import type { GridColumn } from '../types'
import { exportFields } from './export-accessor'

/** Escapes text for safe placement inside an HTML element. @internal */
function escapeHtml(value: string): string {
	return value.replace(
		/[&<>]/g,
		(char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] as string,
	)
}

/** Stringifies a cell value for an HTML table: nullish becomes empty, everything else `String()`s. @internal */
function cellText(value: unknown): string {
	return value == null ? '' : String(value)
}

/**
 * Renders rows as an HTML `<table>`: a header row of the data columns' labels
 * followed by one row per datum, each cell read through the same export
 * accessor CSV uses. Shared by the Excel and print exporters, which each wrap
 * this in their own document shell.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function rowsToHtmlTable<T>(columns: GridColumn<T>[], rows: T[]): string {
	const fields = exportFields(columns)

	const header = fields.map((field) => `<th>${escapeHtml(field.label)}</th>`).join('')

	const body = rows
		.map(
			(row) =>
				`<tr>${fields
					.map((field) => `<td>${escapeHtml(cellText(field.accessor(row)))}</td>`)
					.join('')}</tr>`,
		)
		.join('')

	return `<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>`
}
