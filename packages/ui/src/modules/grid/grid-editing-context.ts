'use client'

import { createContext } from '../../core'
import type { GridActiveEdit } from './engine/grid-editing-utilities'

/**
 * The editing session shared with the data cells. A row in `editableRows` puts
 * every editable cell of that row into edit mode at once; a cell-scoped session
 * (`scope: 'cell'`) narrows that to `activeEdit`, where the row still enters the
 * set but only the named cell mounts an editor. Each editor stages its pending
 * value through `stageDraft`, held in the grid rather than re-rendering it, and
 * the staged values commit when their editor closes. Both fields flip only on a
 * session transition, so cells read them without churning as the user types.
 *
 * @internal
 */
export type GridEditingSession = {
	/** Row keys currently in edit mode; a cell whose row key is here renders its editor. */
	editableRows: Set<string | number>
	/**
	 * The one cell a cell-scoped session edits (`scope: 'cell'`), narrowing the
	 * row's editors to it. `null` under the default row scope, where every
	 * editable cell of a set row mounts its editor.
	 */
	activeEdit: GridActiveEdit | null
	/** Stage a cell's pending value (held until its editor closes and the value commits). */
	stageDraft: (rowKey: string | number, columnId: string | number, value: unknown) => void
	/** Drop a cell's pending value — Escape reverts it to the row's current value. */
	unstageDraft: (rowKey: string | number, columnId: string | number) => void
	/**
	 * Ends the grid-owned session on a row under `trigger: 'doubleClick'` —
	 * `'save'` on an editor's Enter, `'discard'` on Escape. A discard drops the
	 * staged values the session owns: under cell scope that is the active cell
	 * alone, because the cells it visited before that one already committed.
	 * Absent when the consumer owns the session, whose save is removing the row
	 * from the set and whose Escape reverts one cell.
	 */
	endSession?: (rowKey: string | number, outcome: 'save' | 'discard') => void
}

export const [GridEditingSessionContext, useGridEditingSession] =
	createContext<GridEditingSession>('GridEditingSession')
