import type { ReactNode } from 'react'

/**
 * A single committed cell write: the new `value` for `columnId` on the row keyed
 * by `rowKey`. Cells commit when their editor closes, batched per row into a
 * single {@link GridEditableConfig.onCommit} call. A saved row therefore emits
 * one per changed cell. A cell-scoped session emits one per move, because it
 * holds one editor open — unless it narrowed a row that was already open, where
 * the editors it closes emit together.
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
	 * ({@link GridEditableConfig.trigger} `'doubleClick'`), end that session — the
	 * same one-batch commit, removing the row from the editable set. Under the
	 * default consumer-owned session it only stages: the row's save flushes the
	 * staged values, so there is no per-cell close.
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
 * cells as one batch through `onCommit` (Escape reverts a cell).
 *
 * A grid-owned session ({@link GridEditableConfig.trigger} `'doubleClick'`) can
 * narrow to the entered cell instead of its whole row through {@link
 * GridEditableConfig.scope}; the set and the batch sink stay the model either
 * way.
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
	 * consumer {@link GridDataProps.onCellDoubleClick} still fires) — or pressing
	 * Enter on the keyboard cursor's active cell — puts its row into edit mode
	 * and focuses that cell's editor; Enter in an inferred text/number editor
	 * then saves the row (the same one-batch commit), and Escape abandons the
	 * row's staged edits. Entering and leaving a row flows through
	 * `rows`/`onRowsChange`, so a controlled binding stays the source of truth for
	 * which rows edit. Under {@link GridEditableConfig.scope} `'cell'` a move
	 * between cells of one row leaves that set alone, and the grid holds the
	 * active cell itself.
	 * @defaultValue 'manual'
	 */
	trigger?: 'manual' | 'doubleClick'
	/**
	 * How much of a grid-owned session enters edit mode. `'row'` — the default —
	 * mounts an editor in every editable cell of the entered row at once. That is
	 * the shape a form-like "edit this record" grid wants. `'cell'` narrows the
	 * session to the entered cell alone. Only that cell mounts an editor, and
	 * moving to another cell commits the one it leaves, so a session that opened
	 * its own row commits one {@link CellChange} at a time — the spreadsheet
	 * shape. Narrowing a row the consumer had already opened is the exception: the
	 * editors that close with the narrowing commit together, in one batch. Escape under
	 * `'cell'` drops the active cell's draft alone, because the cells before it
	 * already committed. The setting needs a grid-owned session ({@link
	 * GridEditableConfig.trigger} `'doubleClick'`). Under `'manual'` the consumer
	 * names a row, never a cell, so the row's editors all mount as under `'row'`.
	 * A row the consumer opens through `rows` reads the same way until the grid
	 * narrows it: its editors all mount, and entering one of its cells starts the
	 * session that closes the rest. A session narrows the one row it sits on, so a
	 * row opened beside it stays whole. It also gives that row back when it moves
	 * on: a row the session found in `rows` returns to its row-shaped state, and
	 * only a row the session added to `rows` itself leaves with it.
	 * @defaultValue 'row'
	 */
	scope?: 'row' | 'cell'
	/**
	 * Called when staged cells commit, with one {@link CellChange} per changed cell
	 * of a row, batched into a single call. Cells commit when their editor closes.
	 * Saving a row — removing it from the set — closes all of them at once; a
	 * cell-scoped session usually closes one as it moves on. Read the batch rather
	 * than its first entry: a session narrowing an already-open row closes several
	 * at once. Three kinds of cell are dropped: unchanged ones, ones whose
	 * {@link GridColumn.validate} rejects the value, and ones whose column stopped
	 * being editable while the editor was open. Apply each change to your own row
	 * data and feed it back as `rows`.
	 */
	onCommit: (changes: CellChange[]) => void
}
