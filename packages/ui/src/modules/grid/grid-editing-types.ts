import type { ReactNode } from 'react'

/**
 * A single committed cell write: the new `value` for `columnId` on the row keyed
 * by `rowKey`. A saved row emits one per changed cell, batched into a single
 * {@link GridEditableConfig.onValueChange} call.
 */
export type CellChange = {
	rowKey: string | number
	columnId: string | number
	value: unknown
}

/**
 * Context handed to a column's {@link GridColumn.editCell} slot when its cell
 * enters edit mode. The grid owns the draft buffer and the commit/cancel
 * lifecycle; the slot decides how to render the control and when to stage or
 * commit a value.
 *
 * @typeParam T - The row type backing the cell under edit.
 */
export type GridEditCellContext<T> = {
	/** The row under edit. */
	row: T
	/** The cell's current value (`row[field]` when the column binds a `field`, else `undefined`). */
	value: unknown
	/** Stage the next value without committing — call on each keystroke or selection change. */
	onValueUpdate: (next: unknown) => void
	/**
	 * Stage `next` (when given) and, when the grid owns the edit session
	 * ({@link GridEditableConfig.trigger} `'doubleClick'`), save the row — the
	 * same one-batch commit removing it from the editable set. Under the default
	 * consumer-owned session it only stages: the row's save flushes the staged
	 * values, so there is no per-cell close.
	 */
	commit: (next?: unknown) => void
	/** Discard the edit and close the editor. */
	cancel: () => void
	/** Accessible label naming the cell under edit, e.g. `Edit Status, row 2`. */
	ariaLabel: string
	/** Whether the column is {@link GridColumn.required | required}; set `aria-required` on the control. */
	required: boolean
}

/**
 * Render function for a column's custom in-cell editor, invoked with a
 * {@link GridEditCellContext} when its cell enters edit mode. Supersedes the
 * editor the grid would otherwise infer from the cell value's primitive type
 * (string → text, number → number, boolean → checkbox).
 *
 * @typeParam T - The row type the editor reads from and writes back to.
 */
export type GridEditCell<T> = (context: GridEditCellContext<T>) => ReactNode

/**
 * Editing binding for {@link GridProps.editable}: marks which rows are in edit
 * mode and sinks their committed cell values. Setting it bakes per-row editing
 * into the grid — a row in the set puts all of its editable cells into edit mode
 * at once. Edits stage live; removing the row from the set saves its changed
 * cells as one batch through `onValueChange` (Escape reverts a cell).
 *
 * @remarks The editable-row set is a controllable `Set<key>`, mirroring
 * {@link GridSelection}: flip a row in (e.g. from a row-action pencil) to put it
 * into edit mode, out (a save action's check) to settle and commit it. Selection
 * and editing are independent — a row can be selected without being editable, and
 * vice versa.
 */
export type GridEditableConfig = {
	/** Controlled set of row keys whose cells are editable; pair with {@link GridEditableConfig.onRowsChange}. */
	rows?: Set<string | number>
	/** Initial editable row keys for the uncontrolled case. */
	defaultRows?: Set<string | number>
	/** Fires with the next editable-row set. The grid coalesces an internal clear to an empty set, so the payload is never `undefined`. */
	onRowsChange?: (rows: Set<string | number>) => void
	/**
	 * How a row enters (and leaves) edit mode from the grid itself, alongside the
	 * consumer-driven `rows` binding. `'manual'` — the default — renders no
	 * built-in trigger: the consumer flips rows in and out (a pencil / check row
	 * action). `'doubleClick'` hands the session to the grid: double-clicking an
	 * editable data cell (the grid's built-in cell double-click event, so a
	 * consumer {@link GridDataProps.onCellDoubleClick} still fires) — or, on the
	 * keyboard cursor's active cell, pressing Enter or F2 or typing a printable
	 * character (which enters edit seeded with it, replacing the value as
	 * spreadsheets do) — begins a session and focuses the entered cell's editor.
	 * Enter in an inferred text/number editor saves and moves the cursor down a
	 * row (re-entering edit under {@link GridEditableConfig.scope | scope}
	 * `'cell'`), Tab / Shift+Tab save and move through the row's editable cells
	 * (cell scope, wrapping at the edges), F2 saves in place, and Escape
	 * abandons the session's staged edits. Every entry and exit still flows
	 * through `rows`/`onRowsChange`, so a controlled binding stays the source of
	 * truth.
	 * @defaultValue 'manual'
	 */
	trigger?: 'manual' | 'doubleClick'
	/**
	 * How much of a row one edit session covers. `'row'` — the default — puts
	 * every editable cell of the row into edit mode at once and saves them
	 * together: the form-like "edit this record" model. `'cell'` narrows a
	 * session to a single cell — the entered cell alone mounts its editor, and
	 * its save is a one-change batch through the same
	 * {@link GridEditableConfig.onValueChange} sink — the spreadsheet model.
	 *
	 * @remarks Cell scope keeps one session at a time: entering a cell commits
	 * the previously active cell's staged edit (Escape still abandons instead).
	 * Sessions still flow through `rows`/`onRowsChange` — the set carries the
	 * active cell's row — so a controlled binding can decline an entry. A row
	 * put into the set by the consumer under `'cell'` (no entered cell to
	 * narrow to) seats the session at that row's first editable column.
	 * @defaultValue 'row'
	 */
	scope?: 'row' | 'cell'
	/**
	 * When a grid-owned session (`trigger: 'doubleClick'`) commits its staged
	 * edits. `'enter'` — the default — arms the commit keys: an editor's Enter,
	 * and with it Tab's and F2's commit-and-move. `'blur'` also commits a
	 * cell-scoped session when its editor loses focus to elsewhere in the grid
	 * (clicking another cell, tabbing to a row action); `'clickOutside'` commits
	 * every open session when focus leaves the grid entirely — the forgiving
	 * mode where wandering off doesn't discard work. Escape always abandons
	 * instead, an `editCell` slot's programmatic `commit` always saves, and
	 * focus landing in an open floating surface (a date picker's popover, a
	 * listbox panel) never reads as blur. No effect under the consumer-owned
	 * `'manual'` trigger, whose save is removing the row from the set.
	 * @defaultValue ['enter']
	 */
	commitOn?: ('enter' | 'blur' | 'clickOutside')[]
	/**
	 * Called when an editing row is saved (removed from the set), with one
	 * {@link CellChange} per changed cell in that row, batched into a single call.
	 * Unchanged and `validate`-failing cells are dropped. Apply each change to your
	 * own row data and feed it back as `rows`.
	 */
	onValueChange: (changes: CellChange[]) => void
}
