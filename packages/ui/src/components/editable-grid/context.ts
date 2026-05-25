'use client'

import type { Dispatch, SetStateAction } from 'react'
import { createContext } from '../../core'
import type { Coord, EditableGridCommitAdvance } from './types'

export type EditableGridContextValue = {
	active: Coord | null
	anchor: Coord | null
	extraCells: Set<string>
	editing: boolean
	draft: string
	setDraft: Dispatch<SetStateAction<string>>
	setActive: (coord: Coord, extend?: boolean) => void
	addCellToSelection: (coord: Coord) => void
	beginEdit: (coord: Coord, initial?: string, original?: string) => void
	commitEdit: (advance: EditableGridCommitAdvance) => boolean
	cancelEdit: () => void
}

export const [EditableGridContext, useEditableGrid] =
	createContext<EditableGridContextValue>('EditableGrid')
