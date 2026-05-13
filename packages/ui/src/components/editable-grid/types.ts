import type { ReactNode } from 'react'

export type Coord = { row: number; col: number }

export type CellChange = {
	rowKey: string | number
	columnId: string | number
	value: unknown
}

export type EditableGridColumn<T> = {
	id: string | number
	title?: ReactNode
	/** Read/write field on the row. */
	field?: keyof T
	/** Format a cell value for display. Defaults to `String(row[field] ?? '')`. */
	format?: (row: T) => string
	/** Parse the raw editor string. Defaults to the raw string. */
	parse?: (raw: string, row: T) => unknown
	/** Cells in this column can't be edited. Nav still visits them. */
	readOnly?: boolean
	align?: 'left' | 'center' | 'right'
	sortable?: boolean
	selectable?: boolean
	actions?: (row: T) => ReactNode
	width?: string
	className?: string
	headerClassName?: string
}
