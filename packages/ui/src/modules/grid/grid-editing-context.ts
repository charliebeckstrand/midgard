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
	 * A save is removing the row from the set, which is also the consumer's own
	 * save; a discard has no consumer-driven equivalent, and is what
	 * {@link GridRowActionsContext.discard} hands them.
	 */
	endSession: (rowKey: string | number, outcome: 'save' | 'discard') => void
	/** Whether the grid owns entry and the session keys (`trigger: 'doubleClick'`). */
	sessionOwned: boolean
}

const [GridEditingSessionContext, useSession] = createContext<GridEditingSession | null>(
	'GridEditingSession',
	{ default: null },
)

export { GridEditingSessionContext }

/** The editing session. Throws outside an editable grid, where there is none. @internal */
export function useGridEditingSession(): GridEditingSession {
	const session = useSession()

	if (session === null)
		throw new Error('useGridEditingSession must be used within an editable Grid')

	return session
}

/**
 * The editing session, or `null` when the grid is not editable. For the surfaces
 * every grid renders — the row actions column — which must ask rather than
 * assume. @internal
 */
export const useGridEditingSessionOrNull = useSession
