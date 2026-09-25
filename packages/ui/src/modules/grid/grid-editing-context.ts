'use client'

import { createContext } from '../../core'
import type {
	EditorKind,
	GridActiveEdit,
	GridDraft,
	GridDraftKey,
} from './engine/grid-editing-utilities'

/**
 * An external store over the rows in edit mode, and the one cell a cell-scoped
 * session edits. Each data cell subscribes to its own flag through
 * `useSyncExternalStore`, the way `GridNavCell` reads the cursor. A session
 * move therefore re-renders the cell it leaves and the cell it enters, not the
 * whole mounted window. A row that opens or closes re-renders only the cells of
 * that row. The store also notifies when a draft changes status, as a commit
 * goes pending or settles. Each cell then reads its own status again.
 *
 * @internal
 */
export type GridActiveEditStore = {
	subscribe: (listener: () => void) => () => void
	/** Row keys currently in edit mode; a cell whose row key is here renders its editor. */
	rows: () => ReadonlySet<string | number>
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
 * The editing session shared with the data cells. A row in the set of
 * {@link GridActiveEditStore.rows} puts every editable cell of that row into
 * edit mode at once. A cell-scoped session (`scope: 'cell'`) narrows that to
 * the cell in `activeEditStore`. The row still enters the set, but only the
 * named cell mounts an editor. Each editor
 * stages its pending value through `stageDraft`, held in the grid rather than
 * re-rendering it. The staged values belong to the session, not to the
 * editors, and commit when the session closes their cell. An editor that
 * unmounts while its cell is open keeps its draft, and shows it when it mounts
 * again. The set and the cell ride a store, so a session transition leaves
 * this context unchanged.
 *
 * @internal
 */
export type GridEditingSession = {
	/** The rows in edit mode and the cell a cell-scoped session edits, as a store each data cell subscribes to. */
	activeEditStore: GridActiveEditStore
	/**
	 * Stage a cell's pending value, against the row object the editor shows.
	 * The session holds it until it closes the cell and the value commits. The
	 * first write keeps `row` as the snapshot that a commit reads when the row
	 * is no longer in `rows`. A write to a closed cell is ignored.
	 */
	stageDraft: (
		rowKey: GridDraftKey,
		columnId: string | number,
		value: unknown,
		row: unknown,
	) => void
	/** Drop a cell's pending value — Escape reverts it to the row's current value. */
	unstageDraft: (rowKey: GridDraftKey, columnId: string | number) => void
	/**
	 * The cell's staged draft, or `undefined` when it has none. An editor reads
	 * it once, as it mounts, so an editor that mounts again shows the value
	 * that will commit.
	 */
	readDraft: (rowKey: GridDraftKey, columnId: string | number) => GridDraft | undefined
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
	/**
	 * Moves a cell-scoped session onto a refused cell that the refusal opened
	 * beside it, as focus moves into that cell's editor. Focus is already
	 * there, so the move claims no focus. The cell the session leaves commits.
	 */
	resumeCell: (rowKey: string | number, columnId: string | number) => void
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

/**
 * The new-row slot of an editable grid ({@link GridEditableConfig.newRow}), as
 * the slot's cells read it. It rides a context of its own, so a change to the
 * slot renders the slot and no data cell.
 *
 * @internal
 */
export type GridNewRowSession = {
	/** Where the slot sits, at the top or the bottom of the body. */
	position: 'top' | 'bottom'
	/**
	 * A counter that the editors of the slot are keyed by. An add, an Escape,
	 * and a typed entry raise it, so each editor mounts again and reads the
	 * draft store.
	 */
	generation: number
	/** Whether an add that `onRowAdd` returned as a promise is in flight. */
	inFlight: boolean
	/** The draft store of the session, which the slot writes under its reserved key. */
	stageDraft: GridEditingSession['stageDraft']
	unstageDraft: GridEditingSession['unstageDraft']
	readDraft: GridEditingSession['readDraft']
	/**
	 * Whether the editor of this column takes focus now. It is `true` once, for
	 * the cell that an add, or a typed entry, names.
	 */
	claimFocus: (columnId: string | number) => boolean
	/** Adds the row: validates the drafted cells and calls `onRowAdd`. */
	addRow: () => void
	/** The editor that the grid infers for a column of the slot, which holds no value of its own. */
	editorKind: (column: { id: string | number; field?: PropertyKey }) => EditorKind
	/** The cursor's per-cell id deriver, for the `aria-activedescendant` of a slot cell. */
	cellId: (row: number, col: number) => string
	/** Moves the keyboard cursor, for a press on a cell of the slot. */
	moveTo: (coord: { row: number; col: number }) => void
}

const [GridNewRowContext, useNewRow] = createContext<GridNewRowSession | null>('GridNewRow', {
	default: null,
})

export { GridNewRowContext }

/** The new-row slot, or `null` when the grid shows none. @internal */
export const useGridNewRowSession = useNewRow
