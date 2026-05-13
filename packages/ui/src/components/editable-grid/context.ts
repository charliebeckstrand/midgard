'use client'

import { createContext } from '../../core'
import type { Coord } from './types'

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
