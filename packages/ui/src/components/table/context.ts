'use client'

import { createContext } from '../../core'

interface TableContextValue {
	bleed: boolean
	dense: boolean
	grid: boolean
	striped: boolean
}

interface TableRowContextValue {
	href?: string
	target?: string
	title?: string
}

export const [TableProvider, useTableContext] = createContext<TableContextValue>('Table')

export const [TableRowProvider, useTableRowContext] =
	createContext<TableRowContextValue>('TableRow')
