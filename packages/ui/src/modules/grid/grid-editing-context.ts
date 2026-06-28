'use client'

import { createContext } from '../../core'

/**
 * Row-level editing state shared with the data cells. An editable grid puts a
 * whole row into edit mode at once — every editable cell in a row whose key is in
 * `editableRows` renders its editor. Each editor stages its pending value through
 * `stageDraft` (held in the grid, not re-rendering it); the staged values flush
 * as one batch when the row leaves the set. `editableRows` flips only when a row
 * is added or removed, so cells read it without churning as the user types.
 *
 * @internal
 */
export type GridRowEditing = {
	/** Row keys currently in edit mode; a cell whose row key is here renders its editor. */
	editableRows: Set<string | number>
	/** Stage a cell's pending value (held until the row's edits flush on exit). */
	stageDraft: (rowKey: string | number, columnId: string | number, value: unknown) => void
	/** Drop a cell's pending value — Escape reverts it to the row's current value. */
	unstageDraft: (rowKey: string | number, columnId: string | number) => void
}

export const [GridRowEditingContext, useGridRowEditing] =
	createContext<GridRowEditing>('GridRowEditing')
