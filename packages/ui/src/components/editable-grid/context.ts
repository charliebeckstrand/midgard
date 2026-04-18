'use client'

import { createContext } from '../../core'

export type Coord = { row: number; col: number }

export type CellChange = {
	rowKey: string | number
	columnId: string | number
	value: unknown
}

export type EditableGridContextValue = {
	active: Coord | null
	editing: boolean
	draft: string
	setDraft: (value: string) => void
	setActive: (coord: Coord) => void
	beginEdit: (coord: Coord, initial?: string) => void
	commitEdit: (advance: 'down' | 'right' | 'left' | 'none') => void
	cancelEdit: () => void
}

export const [EditableGridProvider, useEditableGrid] =
	createContext<EditableGridContextValue>('EditableGrid')
