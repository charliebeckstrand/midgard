import { isDataColumn } from '../../../../utilities'
import type { GridColumn } from '../../types'
import { columnAccessor } from '../grid-column/accessor'
import { columnLabel } from '../grid-column/label'

/** Escapes the three characters that end a text node (`& < >`), for markup that the print frame reads. @internal */
export function escapeMarkup(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

/**
 * {@link escapeMarkup} plus the two quote entities. XML text nodes don't need
 * them, but the worksheet has always written them and a reader can hold the
 * bytes. HTML text keeps the shorter form, where `&apos;` is not a legacy
 * entity every clipboard parser resolves.
 *
 * @internal
 */
export function escapeXml(value: string): string {
	return escapeMarkup(value).replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

/** True for an array, or for an object whose prototype is `Object.prototype` or `null`. */
function isPlainData(value: object): boolean {
	if (Array.isArray(value)) return true

	const prototype = Object.getPrototypeOf(value)

	return prototype === Object.prototype || prototype === null
}

/** The JSON text of a value, else its `String()` text when JSON cannot hold it (a cycle or a `bigint`). */
function jsonText(value: object): string {
	try {
		return JSON.stringify(value)
	} catch {
		return String(value)
	}
}

/**
 * Stringifies a cell value for export. The CSV, Excel, and HTML-table
 * serializers and the Copy actions use it.
 *
 * - A nullish value becomes empty.
 * - A `Date` becomes ISO 8601 text in UTC, and an invalid `Date` becomes empty.
 * - A plain object or an array becomes JSON.
 * - Each other value goes through `String()`.
 *
 * @internal
 */
export function cellText(value: unknown): string {
	if (value == null) return ''

	if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString()

	if (typeof value === 'object' && isPlainData(value)) return jsonText(value)

	return String(value)
}

/**
 * Data columns, with the non-data columns (selection, actions, drag handle,
 * expander) skipped. Each resolves once to its export label and
 * {@link columnAccessor}. A per-row export loop therefore reads
 * them directly rather than re-branching on `value` for every cell. It exports
 * the same values sort, filter, and aggregation read.
 *
 * @internal
 */
export function exportFields<T>(
	columns: GridColumn<T>[],
): { label: string; accessor: (row: T) => unknown }[] {
	return columns
		.filter(isDataColumn)
		.map((column) => ({ label: columnLabel(column), accessor: columnAccessor(column) }))
}
