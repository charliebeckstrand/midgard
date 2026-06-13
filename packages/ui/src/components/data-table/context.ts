'use client'

import { createContext } from '../../core'

/** Active sort: the sorted column's id and its direction. */
export type SortState = {
	column: string | number
	direction: 'asc' | 'desc'
}

/** Table-wide state shared with head and rows: selection, sort, and sticky-header flag. */
export type DataTableContextValue = {
	selection: Set<string | number>
	toggleRow: (key: string | number) => void
	toggleAll: () => void
	allSelected: boolean
	someSelected: boolean
	sort: SortState | undefined
	toggleSort: (column: string | number) => void
	stickyHeader: boolean
}

/**
 * Reads the enclosing {@link DataTable}'s shared selection and sort state.
 *
 * @returns The current {@link DataTableContextValue}.
 * @throws If called outside a `<DataTable>`.
 */
export const [DataTableContext, useDataTable] = createContext<DataTableContextValue>('DataTable')

/** Per-row state shared with a row's cells: the row datum, its key, and selected/loading flags. */
export type DataTableRowContextValue<T = unknown> = {
	row: T
	rowKey: string | number
	selected: boolean
	loading: boolean
}

/**
 * Reads the enclosing row's datum, key, and selected/loading flags. Use from a
 * column's `cell` or `actions` renderer to reach the row context.
 *
 * @returns The current {@link DataTableRowContextValue}.
 * @throws If called outside a `<DataTable>` row.
 */
export const [DataTableRowContext, useDataTableRow] =
	createContext<DataTableRowContextValue>('DataTableRow')
