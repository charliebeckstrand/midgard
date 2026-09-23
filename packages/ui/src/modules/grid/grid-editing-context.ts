'use client'

import { createContext } from '../../core'
import type { GridActiveEdit } from './engine/grid-editing-utilities'

/**
 * An external store over the one cell a cell-scoped session edits. Each data
 * cell subscribes to its own flag through `useSyncExternalStore`, the way
 * `GridNavCell` reads the cursor. A session move therefore re-renders the cell
 * it leaves and the cell it enters, not the whole mounted window.
 *
 * @internal
 */
export type GridActiveEditStore = {
	subscribe: (listener: () => void) => () => void
	/**
	 * The one cell a cell-scoped session edits (`scope: 'cell'`), narrowing the
	 * row's editors to it. `null` under the default row scope, where every
	 * editable cell of a set row mounts its editor.
	 */
	get: () => GridActiveEdit | null
}

/**
 * The settle controls beside an open editor. `'both'` is the save and discard
 * pair, `'discard'` is the discard control alone, and `'none'` shows no
 * control. @internal
 */
export type GridSettleControls = 'none' | 'discard' | 'both'

/**
 * The editing session shared with the data cells. A row in `editableRows` puts
 * every editable cell of that row into edit mode at once. A cell-scoped session
 * (`scope: 'cell'`) narrows that to the cell in `activeEditStore`. The row still
 * enters the set, but only the named cell mounts an editor. Each editor
 * stages its pending value through `stageDraft`, held in the grid rather than
 * re-rendering it, and the staged values commit when their editor closes. The
 * set flips only on a session transition, so cells read it without churning as
 * the user types. The cell rides a store, so a move along a row leaves this
 * context unchanged.
 *
 * @internal
 */
export type GridEditingSession = {
	/** Row keys currently in edit mode; a cell whose row key is here renders its editor. */
	editableRows: Set<string | number>
	/** The cell a cell-scoped session edits, as a store each data cell subscribes to. */
	activeEditStore: GridActiveEditStore
	/** Stage a cell's pending value (held until its editor closes and the value commits). */
	stageDraft: (rowKey: string | number, columnId: string | number, value: unknown) => void
	/** Drop a cell's pending value — Escape reverts it to the row's current value. */
	unstageDraft: (rowKey: string | number, columnId: string | number) => void
	/**
	 * Ends the grid-owned session on a row under `session: 'managed'` —
	 * `'save'` on an editor's Enter, `'discard'` on Escape. A discard drops the
	 * staged values the session owns. Under cell scope that is the active cell
	 * alone, because the cells it visited before that one already committed.
	 * A save is removing the row from the set, which is also the consumer's own
	 * save. A discard has no consumer-driven equivalent, and is what
	 * {@link GridRowActionsContext.discard} hands them.
	 */
	endSession: (rowKey: string | number, outcome: 'save' | 'discard') => void
	/**
	 * The value a type-to-edit entry opens this cell's editor with, or
	 * `undefined` for an entry that seeds nothing. The editor reads it once, as it
	 * mounts, and stages it as the cell's draft.
	 */
	entrySeed: (rowKey: string | number, columnId: string | number) => string | number | undefined
	/**
	 * Whether this cell's editor takes focus now. An editor asks as it mounts,
	 * and as the session comes to hold it. It is `true` once, for the cell an
	 * entry named, while the session holds that cell open.
	 */
	claimFocus: (rowKey: string | number, columnId: string | number) => boolean
	/**
	 * The settle controls that this cell's editor shows. The hook decides the
	 * policy, and the cell only renders it. The cell that a cell-scoped session
	 * holds shows them, and every other cell shows none. Under `commitOn:
	 * 'leaveEditor'` a move away saves, so that cell shows discard alone. The
	 * answer reads {@link GridActiveEditStore}, so a cell reads it in the same
	 * pass as its flag.
	 */
	settleControls: (rowKey: string | number, columnId: string | number) => GridSettleControls
	/** Whether the grid owns entry and the session keys (`session: 'managed'`). */
	managed: boolean
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
