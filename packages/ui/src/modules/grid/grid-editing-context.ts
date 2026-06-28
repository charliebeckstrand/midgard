'use client'

import { createContext } from '../../core'
import type { Coord } from './use-grid-navigation'

/**
 * The cell currently in edit mode, or `null` when no edit is open. Changes only
 * when an edit begins or ends (not per keystroke), so every editable data cell
 * reads it to learn whether it is the one being edited without re-rendering as
 * the draft changes. @internal
 */
export const [GridEditingCoordContext, useGridEditingCoord] = createContext<Coord | null>(
	'GridEditingCoord',
)

/**
 * The edit session for the single mounted editor. The grid keeps no per-keystroke
 * state — the editor owns its live display value and reports each change through
 * `onValueUpdate` (which the grid records in a commit-read ref). So typing
 * re-renders only the editor, never the grid. @internal
 */
export type GridEditSession = {
	/** The seed value when the editor mounts (the cell's current value, or a typed character). The editor owns the live value thereafter. */
	initialDraft: unknown
	/** Validation message for the open edit, or `null` when valid; a rejected commit keeps the editor open and sets this. */
	error: string | null
	/** Record the next value for the pending commit (does not re-render the grid). */
	onValueUpdate: (next: unknown) => void
	/** Commit the recorded value and close the editor. */
	commit: () => void
	/** Discard the edit and close the editor. */
	cancel: () => void
}

export const [GridEditSessionContext, useGridEditSession] =
	createContext<GridEditSession>('GridEditSession')
