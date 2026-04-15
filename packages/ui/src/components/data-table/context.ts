'use client'

import { createContext } from '../../core'

export type SortState = {
	column: string | number
	direction: 'asc' | 'desc'
}

export type DataTableContextValue = {
	selection: Set<string | number>
	toggleRow: (key: string | number) => void
	toggleAll: () => void
	allSelected: boolean
	someSelected: boolean
	rowCount: number
	sort: SortState | undefined
	toggleSort: (column: string | number) => void
	stickyHeader: boolean
}

export const [DataTableProvider, useDataTable] = createContext<DataTableContextValue>('DataTable')

export type DataTableRowContextValue<T = unknown> = {
	row: T
	rowKey: string | number
	selected: boolean
	loading: boolean
}

export const [DataTableRowProvider, useDataTableRow] =
	createContext<DataTableRowContextValue>('DataTableRow')
