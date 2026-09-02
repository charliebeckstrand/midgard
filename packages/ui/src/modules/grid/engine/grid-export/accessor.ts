import { isDataColumn } from '../../../../utilities'
import type { GridColumn } from '../../types'
import { columnAccessor } from '../grid-column/accessor'
import { columnLabel } from '../grid-column/label'

/** Escapes the three characters that end a text node (`& < >`), for markup a browser or a clipboard reads. @internal */
export function escapeMarkup(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

/**
 * {@link escapeMarkup} plus the two quote entities. XML text nodes don't need
 * them, but the worksheet has always written them and a reader may hold the
 * bytes; HTML text keeps the shorter form, where `&apos;` is not a legacy
 * entity every clipboard parser resolves.
 *
 * @internal
 */
export function escapeXml(value: string): string {
	return escapeMarkup(value).replaceAll('"', '&quot;').replaceAll("'", '&apos;')
}

/** Stringifies a cell value for export: nullish becomes empty, everything else `String()`s. Shared by the CSV and HTML-table serializers. @internal */
export function cellText(value: unknown): string {
	return value == null ? '' : String(value)
}

/**
 * Data columns (selection/actions columns skipped), each resolved once to its
 * export label and {@link columnAccessor} — so a per-row export loop reads them
 * directly rather than re-branching on `value` for every cell, and exports the
 * same values sort, filter, and aggregation read.
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
