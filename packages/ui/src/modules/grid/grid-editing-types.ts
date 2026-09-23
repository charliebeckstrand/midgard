import type { ReactNode } from 'react'

/**
 * Names one data cell by the key of its row and the id of its column. The
 * active-cell binding of a cell-scoped session reads and reports this shape.
 */
export type GridCellRef = {
	/** The key of the row, from {@link GridDataProps.getKey}. */
	rowKey: string | number
	/** The id of the column. */
	columnId: string | number
}

/**
 * A single committed cell write: the new `value` for `columnId` on the row keyed
 * by `rowKey`. Cells commit when their editor closes, batched per row into a
 * single {@link GridEditableConfig.onCommit} call. A saved row therefore emits
 * one per changed cell. A cell-scoped session emits one per move, because it
 * holds one editor open. A session that narrowed a row already open is the
 * exception: the editors it closes emit together.
 */
export type GridCellChange = {
	rowKey: string | number
	columnId: string | number
	value: unknown
}

/**
 * Context handed to a column's {@link GridColumn.editCell} slot when its cell
 * enters edit mode. The grid owns the draft buffer and the commit/cancel
 * lifecycle. The slot decides how to render the control, and when to stage or
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
	 * ({@link GridEditableConfig.session} `'managed'`), end that session. That
	 * is the same one-batch commit, removing the row from the editable set. Under the
	 * default consumer-owned session it only stages: the row's save flushes the
	 * staged values, so there is no per-cell close.
	 */
	commit: (next?: unknown) => void
	/** Revert the cell to the row's current value. The editor stays open. */
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
 * (string → text, number → number, boolean → yes/no listbox).
 *
 * @typeParam T - The row type the editor reads from and writes back to.
 */
export type GridEditCell<T> = (context: GridEditCellContext<T>) => ReactNode

/**
 * What a row's {@link GridColumn.actions} slot is told about editing, and what it
 * can do about it. Every grid passes one. A grid with no `editable` binding
 * reports `editing: false` and its callbacks do nothing, so an actions column
 * needs no guard of its own.
 *
 * @remarks `discard` is the one transition a consumer cannot drive through
 * `rows`. Removing a row from the set is a save, because that is what flushes
 * its staged cells. Closing a row and dropping its edits therefore has to come
 * from here.
 */
export type GridRowActionsContext = {
	/** Whether this row is in edit mode. */
	editing: boolean
	/** Close the row, committing its changed cells through `onCommit`. */
	save: () => void
	/** Close the row, dropping its staged cells. Nothing reaches `onCommit`. */
	discard: () => void
}

/**
 * Editing binding for {@link GridProps.editable}: marks which rows are in edit
 * mode and sinks their committed cell values. Setting it bakes per-row editing
 * into the grid — a row in the set puts all of its editable cells into edit mode
 * at once. Edits stage live; removing the row from the set saves its changed
 * cells as one batch through `onCommit` (Escape reverts a cell).
 *
 * A grid-owned session ({@link GridEditableConfig.session} `'managed'`) can
 * narrow to the entered cell instead of its whole row through {@link
 * GridEditableConfig.scope}. The set and the batch sink stay the model either
 * way. A cell-scoped session adds one binding for its cell, {@link
 * GridEditableConfig.activeCell}.
 *
 * @remarks The editable-row set is a controllable `Set<key>`, mirroring
 * {@link GridSelection}. Flip a row in (e.g. from a row-action pencil) to put
 * it into edit mode. Flip it out (a save action's check) to settle and commit
 * it. Selection
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
	 * Who owns the edit session. `'manual'` — the default — leaves it to the
	 * consumer, and the grid renders no built-in entry. The consumer flips rows in
	 * and out through `rows`, for example with a pencil / check row action.
	 * `'managed'` hands the session to the grid. A double-click on an editable
	 * data cell puts its row into edit mode, and focuses that cell's editor. That
	 * is the grid's built-in cell double-click event, so a consumer
	 * {@link GridDataProps.onCellDoubleClick} still fires. Entering and leaving a row flows through `rows`/`onRowsChange`,
	 * so a controlled binding stays the source of truth for which rows edit. Under
	 * {@link GridEditableConfig.scope} `'cell'` a move between cells of one row
	 * leaves that set alone. The cell itself flows through
	 * {@link GridEditableConfig.activeCell} and `onActiveCellChange`.
	 *
	 * `'managed'` also turns on the spreadsheet keys. On the keyboard cursor's
	 * active cell, Enter and F2 enter edit mode. A printable character enters it
	 * too, with that character in place of the value. From an open editor, the
	 * keys work as follows:
	 *
	 * - Enter commits and moves the cursor down one row. Under `scope: 'cell'` it
	 *   enters the cell below. On the last row the cursor stays.
	 * - Tab and Shift+Tab move along the row's editable cells, and wrap at the
	 *   edges. Under `scope: 'cell'` the cell left behind commits. Under `'row'`
	 *   the row commits when it closes.
	 * - F2 commits and leaves the cursor on the cell.
	 * - Escape abandons the session's staged edits.
	 *
	 * @remarks The keys live on the grid's own key surface, so an `editCell` slot
	 * inherits them. Enter on a button, a link, or a text area stays with that
	 * element. So does a key with Ctrl, Cmd, or Alt, and a key that an input
	 * method composes. An open floating surface keeps its keys, and the next press
	 * reaches the session. A character seeds only an editor the grid infers: a
	 * text editor takes any character, and a number editor takes a digit. An
	 * `editCell` slot and the yes/no editor open with F2 or Enter instead.
	 * @defaultValue 'manual'
	 */
	session?: 'manual' | 'managed'
	/**
	 * How much of a grid-owned session enters edit mode. `'row'` — the default —
	 * mounts an editor in every editable cell of the entered row at once. That is
	 * the shape a form-like "edit this record" grid wants. `'cell'` narrows the
	 * session to the entered cell alone. Only that cell mounts an editor, and
	 * moving to another cell commits the one it leaves. A session that opened its
	 * own row therefore commits one {@link GridCellChange} at a time: the spreadsheet
	 * shape. Narrowing a row the consumer had already opened is the exception: the
	 * editors that close with the narrowing commit together, in one batch. Escape under
	 * `'cell'` drops the active cell's draft alone, because the cells before it
	 * already committed. The setting needs a grid-owned session ({@link
	 * GridEditableConfig.session} `'managed'`). Under `'manual'` the consumer
	 * names a row, never a cell, so the row's editors all mount as under `'row'`.
	 * A row the consumer opens through `rows` reads the same way until the grid
	 * narrows it. Its editors all mount, and entering one of its cells starts the
	 * session that closes the rest. A session narrows the one row it sits on, so a
	 * row opened beside it stays whole. It also gives that row back when it moves
	 * on. A row the session found in `rows` returns to its row-shaped state. Only
	 * a row the session added to `rows` itself leaves with it. The held cell
	 * carries a save and a discard control beside its editor. The grid owns this
	 * session, and nothing else on screen ends it. The pair is for a pointer and
	 * sits outside the tab order, because Tab commits and moves. Row scope shows
	 * none: its settle control is the consumer's own row action, at the
	 * granularity that matches. The session's cell is a binding of its own,
	 * {@link GridEditableConfig.activeCell}, beside `rows`.
	 * @defaultValue 'row'
	 */
	scope?: 'row' | 'cell'
	/**
	 * The controlled active cell of a cell-scoped session: the one cell with an
	 * open editor. Pair it with {@link GridEditableConfig.onActiveCellChange}.
	 * `null` keeps the binding controlled with no open cell.
	 *
	 * A move that the grid asks for takes effect only when you apply it. If you
	 * do not apply it, the held cell stays open and does not commit. Set a new
	 * cell to enter it. The grid commits the held cell, and opens the new row
	 * through `onRowsChange` if necessary. Set `null` to end the session. The
	 * held cell then commits, as a save through `rows` does.
	 *
	 * @remarks The binding needs {@link GridEditableConfig.session} `'managed'`
	 * and {@link GridEditableConfig.scope} `'cell'`. Anywhere else it has no
	 * effect, and it warns in development. This is the cell of the edit session,
	 * not the cell of the keyboard cursor, which {@link GridDataProps.onActiveCellChange}
	 * reports. A cell that is not editable reads as `null`, and it warns once in
	 * development. That is a cell of an unknown row, or of a `readOnly` or
	 * display-only column. The cell also reads as `null` while its row is out
	 * of `rows`. Focus moves into the new editor only when focus is already in
	 * the grid (WCAG 3.2.1). Apply a move in the same event that reports it. A
	 * later value reads as a set from outside.
	 */
	activeCell?: GridCellRef | null
	/**
	 * The initial active cell for the uncontrolled case. The grid opens its row
	 * and its editor on mount, and reports neither. The editor does not take
	 * focus. A controlled `rows` without the row keeps the cell closed.
	 */
	defaultActiveCell?: GridCellRef | null
	/**
	 * Fires with the next active cell of a cell-scoped session, or with `null`
	 * when the session ends.
	 *
	 * The grid reports each cell that it enters, in controlled and in
	 * uncontrolled mode. A move along one row reports only the cell. A move into
	 * a row that is not open reports the cell first, and then
	 * {@link GridEditableConfig.onRowsChange} opens the row. An exit reports
	 * `null` first, and then `onRowsChange` closes the row. Enter is an exit and
	 * an entry, so it reports `null` and then the cell below.
	 *
	 * @remarks The grid does not report a change that comes from you. A cell that
	 * you set, and a cell that reads as `null` because your `rows` closed its
	 * row, report nothing. A `rows` binding that declines the row of an entry
	 * also strands the cell without a report. Under a controlled
	 * {@link GridEditableConfig.activeCell}, the rows write waits until you
	 * apply the cell.
	 */
	onActiveCellChange?: (cell: GridCellRef | null) => void
	/**
	 * Called when staged cells commit, with one {@link GridCellChange} per changed cell
	 * of a row, batched into a single call. Cells commit when their editor closes.
	 * Saving a row — removing it from the set — closes all of them at once; a
	 * cell-scoped session usually closes one as it moves on. Read the batch rather
	 * than its first entry: a session narrowing an already-open row closes several
	 * at once. Three kinds of cell are dropped: unchanged ones, and ones whose
	 * {@link GridColumn.validate} rejects the value. So are ones whose column
	 * stopped being editable while the editor was open. Apply each change to your
	 * own row data and feed it back as `rows`.
	 */
	onCommit: (changes: GridCellChange[]) => void
	/**
	 * Fires with the cells that {@link GridColumn.validate} refused, one batch per
	 * row, beside the {@link GridEditableConfig.onCommit} batch of the same flush.
	 *
	 * A refused cell leaves the staging map with every other closed cell, so the
	 * value the user typed is gone and nothing says so. `onCommit` cannot report
	 * it: a row whose every cell was refused produces no commit batch and reaches
	 * no sink. Use this callback to keep the typed value, to mark the row, or to
	 * explain the refusal. Cells dropped for other reasons stay out: an unchanged
	 * cell is no refusal, and a column that stopped being editable refused nothing.
	 */
	onReject?: (refused: GridCellChange[]) => void
}
