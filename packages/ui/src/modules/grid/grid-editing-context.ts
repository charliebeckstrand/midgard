'use client'

import { createContext } from '../../core'

/**
 * Row-level editing state shared with the data cells. An editable grid puts a
 * whole row into edit mode at once — every editable cell in a row whose key is in
 * `editableRows` renders its editor. Each editor stages its pending value through
 * `stageDraft` (held in the grid, not re-rendering it); the staged values flush
 * as one batch when the row leaves the set. `editableRows` flips only when a row
 * is added or removed, so cells read it without churning as the user types. A
 * cell-scoped session (`scope: 'cell'`) narrows that to `activeEdit`: the row
 * still enters the set, but only the named cell mounts an editor.
 *
 * @internal
 */
export type GridActiveEdit = {
	rowKey: string | number
	columnId: string | number
}

export type GridRowEditing = {
	/** Row keys currently in edit mode; a cell whose row key is here renders its editor. */
	editableRows: Set<string | number>
	/**
	 * The one cell a cell-scoped session edits (`scope: 'cell'`), narrowing the
	 * row's editors to it. `null` under the default row scope, where every
	 * editable cell of a set row mounts its editor.
	 */
	activeEdit: GridActiveEdit | null
	/** Stage a cell's pending value (held until the row's edits flush on exit). */
	stageDraft: (rowKey: string | number, columnId: string | number, value: unknown) => void
	/** Drop a cell's pending value — Escape reverts it to the row's current value. */
	unstageDraft: (rowKey: string | number, columnId: string | number) => void
	/**
	 * Ends a row's edit session, saving its staged changes — the grid-owned exit
	 * (an editor's Enter) under `trigger: 'doubleClick'`. Absent when the
	 * consumer owns the session, whose save is removing the row from the set.
	 */
	commitRowEdit?: (rowKey: string | number) => void
	/**
	 * Ends a row's edit session, discarding every staged draft — the grid-owned
	 * abandon (an editor's Escape) under `trigger: 'doubleClick'`. A cell-scoped
	 * session discards the active cell's draft alone, because the cells it
	 * visited before that one already committed. Absent when the consumer owns
	 * the session, where Escape reverts one cell instead.
	 */
	cancelRowEdit?: (rowKey: string | number) => void
}

export const [GridRowEditingContext, useGridRowEditing] =
	createContext<GridRowEditing>('GridRowEditing')
