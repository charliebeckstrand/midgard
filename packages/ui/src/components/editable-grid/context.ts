'use client'

import type { ReactNode } from 'react'
import { createContext } from '../../core'

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

export type EditableGridContextValue = {
	active: Coord | null
	anchor: Coord | null
	extraCells: Set<string>
	editing: boolean
	draft: string
	setDraft: (value: string) => void
	setActive: (coord: Coord, extend?: boolean) => void
	addCellToSelection: (coord: Coord) => void
	beginEdit: (coord: Coord, initial?: string, original?: string) => void
	commitEdit: (advance: 'down' | 'right' | 'left' | 'none') => boolean
	cancelEdit: () => void
}

export const [EditableGridProvider, useEditableGrid] =
	createContext<EditableGridContextValue>('EditableGrid')
