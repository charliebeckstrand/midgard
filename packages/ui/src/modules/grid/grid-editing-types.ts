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
	/** Commit the staged value (or `next` when given) and close the editor, advancing focus back to the cell. */
	commit: (next?: unknown) => void
	/** Discard the edit and close the editor. */
	cancel: () => void
	/** Accessible label naming the cell under edit, e.g. `Edit Status, row 2`. */
	ariaLabel: string
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
	 * Called when an editing row is saved (removed from the set), with one
	 * {@link CellChange} per changed cell in that row, batched into a single call.
	 * Unchanged and `validate`-failing cells are dropped. Apply each change to your
	 * own row data and feed it back as `rows`.
	 */
	onValueChange: (changes: CellChange[]) => void
}
