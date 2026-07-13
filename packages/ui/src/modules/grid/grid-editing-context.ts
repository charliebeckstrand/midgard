'use client'

import { createContext } from '../../core'

/**
 * External-store interface over the editing session, built in `useGridEditing`:
 * each data cell subscribes to whether it is in edit mode without re-rendering
 * on every session transition — the same pattern the cursor store uses
 * (`GridNavStore`), applied to the editor mount test. A session enter, exit, or
 * within-row move re-renders only the cells whose flag flipped, never the grid.
 *
 * @internal
 */
export type GridEditingStore = {
	subscribe: (listener: () => void) => () => void
	/**
	 * Whether the cell at (`rowKey`, `columnId`) is in edit mode: its row is in
	 * the editable set and — under a cell-scoped session (`scope: 'cell'`) — it
	 * is the session's active cell. Row scope keeps the whole-row test.
	 */
	isCellEditing: (rowKey: string | number, columnId: string | number) => boolean
}

/**
 * Editing state shared with the data cells. A cell whose `isCellEditing` flag
 * is set renders its editor — every editable cell of the row under `scope:
 * 'row'`, the single active cell under `scope: 'cell'`. Each editor stages its
 * pending value through `stageDraft` (held in the grid, not re-rendering it);
 * the staged values flush as one batch when their session ends. The session
 * state lives behind the subscribable `store`, so the context value itself is
 * stable and cells don't churn as sessions move.
 *
 * @internal
 */
export type GridRowEditing = {
	/** Subscribable editing-session store; a cell mounts its editor while its flag is set. */
	store: GridEditingStore
	/** Stage a cell's pending value (held until the cell's session flushes on exit). */
	stageDraft: (rowKey: string | number, columnId: string | number, value: unknown) => void
	/** Drop a cell's pending value — Escape reverts it to the row's current value. */
	unstageDraft: (rowKey: string | number, columnId: string | number) => void
	/**
	 * Resolves a grid-owned entry's focus handshake: an editor calls this once
	 * mounted, and a `true` return means this cell is the one the entry targeted
	 * — take focus. Mount-time resolution (rather than the grid locating the
	 * editor from outside) holds across however many render passes the session
	 * store and a controlled binding take to actually mount the editor.
	 */
	claimPendingFocus: (rowKey: string | number, columnId: string | number) => boolean
	/**
	 * Ends a row's edit session, saving its staged changes — the grid-owned exit
	 * (an editor's Enter) under `trigger: 'doubleClick'`. Absent when the
	 * consumer owns the session, whose save is removing the row from the set.
	 */
	commitRowEdit?: (rowKey: string | number) => void
	/**
	 * Ends a row's edit session, discarding every staged draft — the grid-owned
	 * abandon (an editor's Escape) under `trigger: 'doubleClick'`. Absent when
	 * the consumer owns the session, where Escape reverts one cell instead.
	 */
	cancelRowEdit?: (rowKey: string | number) => void
}

export const [GridRowEditingContext, useGridRowEditing] =
	createContext<GridRowEditing>('GridRowEditing')
