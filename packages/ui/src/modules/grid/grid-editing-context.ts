'use client'

import { createContext } from '../../core'
import type { Coord } from './use-grid-navigation'

/**
 * Where a grid-owned commit moves the session next — spreadsheet muscle memory:
 * an editor's Enter moves `'down'` (re-entering edit under `scope: 'cell'`),
 * Tab / Shift+Tab move `'right'` / `'left'` through the row's editable cells.
 *
 * @internal
 */
export type SessionMove = 'down' | 'right' | 'left'

/**
 * What a data cell renders: its display content, its editor (the cell is in an
 * edit session), or its display content in a pending shroud (an async commit
 * covering it hasn't settled — `aria-busy` plus a subtle shimmer).
 *
 * @internal
 */
export type GridCellMode = 'display' | 'editor' | 'pending'

/**
 * External-store interface over the editing session, built in `useGridEditing`:
 * each data cell subscribes to its own mode without re-rendering on every
 * session transition — the same pattern the cursor store uses
 * (`GridNavStore`), applied to the editor mount test. A session enter, exit,
 * within-row move, or async-commit settle re-renders only the cells whose mode
 * flipped, never the grid.
 *
 * @internal
 */
export type GridEditingStore = {
	subscribe: (listener: () => void) => () => void
	/**
	 * The cell's render mode. `'editor'` while its row is in the editable set
	 * and — under a cell-scoped session (`scope: 'cell'`) — it is the session's
	 * active cell (row scope keeps the whole-row test); `'pending'` while an
	 * unsettled async commit covers it; `'display'` otherwise.
	 */
	cellMode: (rowKey: string | number, columnId: string | number) => GridCellMode
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
	 * mounted, and a non-null return means this cell is the one the entry
	 * targeted — take focus, and apply the `seed` (a typed-to-enter character
	 * that replaces the value, as spreadsheets do) when one rode along.
	 * Mount-time resolution (rather than the grid locating the editor from
	 * outside) holds across however many render passes the session store and a
	 * controlled binding take to actually mount the editor.
	 */
	claimPendingFocus: (
		rowKey: string | number,
		columnId: string | number,
	) => { seed?: string } | null
	/**
	 * The cell's staged draft, if any — read at editor mount so a re-mounting
	 * editor (a rejected async commit re-entering edit, a virtualized row
	 * scrolling back into the window) resumes from the staged value rather than
	 * the row's. `null` when nothing is staged (a staged value may itself be
	 * `undefined`, hence the wrapper).
	 */
	readDraft: (rowKey: string | number, columnId: string | number) => { value: unknown } | null
	/**
	 * A rejected async commit's per-cell error, surfaced on the editor exactly
	 * like a `validate` failure until the value changes. `null` when the cell
	 * has none.
	 */
	readServerError: (rowKey: string | number, columnId: string | number) => string | null
	/** Drops a cell's rejection error — the editor calls it when the user edits the value. */
	clearServerError: (rowKey: string | number, columnId: string | number) => void
	/**
	 * Ends a row's edit session, saving its staged changes — the grid-owned exit
	 * (an editor's Enter) under `trigger: 'doubleClick'`. A `move` carries the
	 * commit-and-move keys: the cursor rides to the neighboring cell resolved
	 * from `from` (the committing cell's display coord), re-entering edit there
	 * under `scope: 'cell'`. Absent when the consumer owns the session, whose
	 * save is removing the row from the set.
	 */
	commitRowEdit?: (rowKey: string | number, options?: { move?: SessionMove; from?: Coord }) => void
	/**
	 * Ends a row's edit session, discarding every staged draft — the grid-owned
	 * abandon (an editor's Escape) under `trigger: 'doubleClick'`. Absent when
	 * the consumer owns the session, where Escape reverts one cell instead.
	 */
	cancelRowEdit?: (rowKey: string | number) => void
	/**
	 * Whether the commit keys are armed — `commitOn` includes `'enter'` (the
	 * default). The editors' Enter stands down otherwise; an `editCell` slot's
	 * programmatic `commit` saves regardless, being a deliberate affordance
	 * rather than a key policy.
	 */
	commitOnEnter: boolean
}

export const [GridRowEditingContext, useGridRowEditing] =
	createContext<GridRowEditing>('GridRowEditing')
