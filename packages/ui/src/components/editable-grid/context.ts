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

// Internal split. The cell SHELL reads only the state slice, which is stable
// while a cell is being edited (it changes on navigation/selection/edit-toggle,
// not per keystroke). The edit-session slice (draft + commit/cancel) changes on
// every keystroke and is read only by the mounted editor — so typing re-renders
// just the active cell's editor, not every cell in the grid.
export type EditableGridStateValue = Pick<
	EditableGridContextValue,
	'active' | 'anchor' | 'extraCells' | 'editing' | 'setActive' | 'addCellToSelection' | 'beginEdit'
>

export type EditableGridEditValue = Pick<
	EditableGridContextValue,
	'draft' | 'setDraft' | 'commitEdit' | 'cancelEdit'
>

export const [EditableGridStateContext, useEditableGridState] =
	createContext<EditableGridStateValue>('EditableGridState')

export const [EditableGridEditContext, useEditableGridEdit] =
	createContext<EditableGridEditValue>('EditableGridEdit')

/**
 * Combined state + edit-session view. Re-renders on any change, including every
 * keystroke — prefer `useEditableGridState` (cell shell) or `useEditableGridEdit`
 * (editor) internally; this is the stable public surface for external consumers.
 */
export function useEditableGrid(): EditableGridContextValue {
	return { ...useEditableGridState(), ...useEditableGridEdit() }
}
