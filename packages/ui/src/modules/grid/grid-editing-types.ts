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
 * by `rowKey`. Cells commit when the edit session closes them, batched per row
 * into a single {@link GridEditableConfig.onCommit} call. A saved row therefore
 * emits one per changed cell. A cell-scoped session emits one per move, because
 * it holds one cell open. A session that narrowed a row already open is the
 * exception: the editors it closes emit together.
 */
export type GridCellChange = {
	rowKey: string | number
	columnId: string | number
	value: unknown
}

/**
 * One cell whose commit the consumer refused, as an async
 * {@link GridEditableConfig.onCommit} reports it. `error` is the message that
 * the cell shows. Without one, the cell shows a generic message.
 *
 * @remarks The grid keeps the refused value as an edit while the cell can
 * open again. It drops the value when the row cannot open again. See
 * {@link GridEditableConfig.onCommit} for the cases.
 */
export type GridCellRefusal = GridCellRef & {
	/** The message that explains the refusal, shown under the cell's editor. */
	error?: string
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
	/**
	 * The value the editor shows. That is the cell's staged draft when it has
	 * one, else `row[field]` when the column binds a `field`, else `undefined`.
	 * An editor that mounts again while its cell is open shows its draft.
	 */
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
 * GridEditableConfig.cell}.
 *
 * @remarks The editable-row set is a controllable `Set<key>`, mirroring
 * {@link GridSelection}. Flip a row in (e.g. from a row-action pencil) to put
 * it into edit mode. Flip it out (a save action's check) to settle and commit
 * it. Selection
 * and editing are independent — a row can be selected without being editable, and
 * vice versa.
 */
export type GridEditableConfig = {
	/**
	 * Controlled set of row keys whose cells are editable; pair with {@link GridEditableConfig.onRowsChange}.
	 *
	 * @remarks A row's staged edits belong to the session, not to its editors.
	 * They commit when the row leaves this set. While the row stays in the set,
	 * an editor that unmounts keeps its edit. A page change, a virtualized
	 * scroll, and a hidden column all unmount editors. The row's editors show the
	 * edits again when they mount.
	 *
	 * A row can be absent from the grid's `rows` when it leaves this set. Under
	 * server-side pagination it is on another page, and it can also be a row you
	 * deleted. The grid cannot tell the two apart, and it never drops a user
	 * edit by default. The edits commit against the row object that each was
	 * first staged against, with the row's key. Ignore a change for a row that
	 * you deleted. A row whose key changed during the session is the same case:
	 * its edits commit under the old key.
	 */
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
	 * {@link GridEditableConfig.cell} and `onCellChange`.
	 *
	 * `'managed'` also turns on the spreadsheet keys. On the keyboard cursor's
	 * active cell, Enter and F2 enter edit mode. A printable character enters it
	 * too, with that character in place of the value. From an open editor, the
	 * keys work as follows:
	 *
	 * - Enter commits and moves the cursor down one row. Under `scope: 'cell'` it
	 *   enters the cell below. On the last row the cursor stays.
	 * - Tab and Shift+Tab move to the next control in the same cell when there
	 *   is one, as in an `editCell` slot with several controls. Tab from the
	 *   last control, or Shift+Tab from the first, moves along the row's
	 *   editable cells, and wraps at the edges. Under `scope: 'cell'` the cell
	 *   left behind commits. Under `'row'` the row commits when it closes.
	 * - F2 commits and leaves the cursor on the cell.
	 * - Escape abandons the session's staged edits.
	 *
	 * Beside the keys, a move to another cell and the settle pair commit. By
	 * default nothing else does. {@link GridEditableConfig.commitOn} also
	 * commits the session when focus leaves its editors or the grid.
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
	 * shape. The held cell commits when the session leaves it, not when its
	 * editor unmounts. A page change, a scroll, or a hidden column keeps the
	 * draft, and the editor shows it when it mounts again. Narrowing a row the consumer had already opened is the exception: the
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
	 * sits outside the tab order, so Tab from the editor still commits and moves.
	 * Under {@link GridEditableConfig.commitOn} `'leaveEditor'` the held cell
	 * shows discard alone, because a move away saves. Under that setting, focus
	 * that leaves the held cell commits it. Under row scope, focus that leaves
	 * the open editors of the row commits the row. Row scope shows
	 * none: its settle control is the consumer's own row action, at the
	 * granularity that matches. The session's cell is a binding of its own,
	 * {@link GridEditableConfig.cell}, beside `rows`.
	 * @defaultValue 'row'
	 */
	scope?: 'row' | 'cell'
	/**
	 * What else commits a grid-owned session, beside the keys. The options nest,
	 * because focus that leaves the grid also leaves the editor.
	 *
	 * - `'explicit'`, the default, commits only on Enter, Tab, F2, a move to
	 *   another cell, the settle pair, or your own `rows` or `cell` write.
	 * - `'leaveGrid'` also commits the session when focus leaves the grid, by
	 *   pointer or by keyboard. Focus in a grid nested in a detail row is
	 *   outside this grid.
	 * - `'leaveEditor'` also commits the session when focus leaves its editors,
	 *   for a place inside or outside the grid. Under `scope: 'cell'` that is
	 *   the held cell. Under `scope: 'row'` it is the open editors of the row,
	 *   so Tab between them does not commit.
	 *
	 * A commit on leave is the commit of Enter. It ends the session, and a cell
	 * that {@link GridColumn.validate} refuses goes to
	 * {@link GridEditableConfig.onReject}, not to `onCommit`. It does not move
	 * the cursor, and focus stays where the user sent it.
	 *
	 * @remarks Three kinds of focus move do not leave. The first is a move into
	 * a floating surface that an editor opens, such as a listbox panel or a
	 * date picker's calendar. The second is a move to the settle controls of the
	 * session, so a press on discard discards. The third is a window blur, such
	 * as a switch to another tab or app. Only a focus move inside the document
	 * leaves. Under `'leaveEditor'` the held cell shows only its discard control,
	 * because a move away saves. The setting needs {@link
	 * GridEditableConfig.session} `'managed'`. Anywhere else it has no effect,
	 * and it warns in development.
	 * @defaultValue 'explicit'
	 */
	commitOn?: 'explicit' | 'leaveEditor' | 'leaveGrid'
	/**
	 * The controlled active cell of a cell-scoped session: the one cell with an
	 * open editor. Pair it with {@link GridEditableConfig.onCellChange}.
	 * `null` keeps the binding controlled with no open cell.
	 *
	 * A move that the grid asks for takes effect only when you apply it. If you
	 * do not apply it, the held cell stays open and does not commit. Enter is
	 * the exception: it reports `null` and then the cell below. Apply the `null`,
	 * and the held cell commits even when you, or your `rows`, decline the cell
	 * below (see {@link GridEditableConfig.onCellChange}). Set a new
	 * cell to enter it. The grid commits the held cell, and opens the new row
	 * through `onRowsChange` if necessary. Set `null` to end the session. The
	 * held cell then commits, as a save through `rows` does. It commits even
	 * when its editor is not mounted, because the draft belongs to the session.
	 *
	 * @remarks The binding needs {@link GridEditableConfig.session} `'managed'`
	 * and {@link GridEditableConfig.scope} `'cell'`. Anywhere else it has no
	 * effect, and it warns in development. This is the cell of the edit session,
	 * not the cell of the keyboard cursor, which {@link GridDataProps.onActiveCellChange}
	 * reports. A cell that is not editable reads as `null`, and it warns once in
	 * development. That is a cell of an unknown row, or of a `readOnly` or
	 * display-only column. The cell also reads as `null` while its row is out
	 * of `rows`. A cell whose row a controlled `rows` declines to open is the
	 * exception. The session then stays on the cell that it held, and your cell
	 * waits until its row opens. Focus moves into the new editor only when focus
	 * is already in the grid (WCAG 3.2.1). Focus in a grid nested in a detail row
	 * is not in this grid. Apply a move in the same event that
	 * reports it. A later value reads as a set from outside.
	 */
	cell?: GridCellRef | null
	/**
	 * The initial active cell for the uncontrolled case. The grid opens its row
	 * and its editor on mount, and reports neither. The editor does not take
	 * focus. A controlled `rows` without the row keeps the cell closed.
	 */
	defaultCell?: GridCellRef | null
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
	 * also strands the cell without a report. An entry from a held cell is the
	 * exception. The session goes back to the held cell and reports it, so the
	 * declined move changes nothing. Under a controlled
	 * {@link GridEditableConfig.cell}, the rows write waits until you
	 * apply the cell.
	 *
	 * Enter is the other exception. It means "commit, then move", so a declined
	 * move keeps the commit, in controlled and in uncontrolled mode. The exit and
	 * the entry are two rows writes. A `rows` binding that declines the row below
	 * declines only the entry. The held cell commits, the cursor lands on the
	 * declined cell, and focus goes to the grid's tab stop.
	 */
	onCellChange?: (cell: GridCellRef | null) => void
	/**
	 * Called when staged cells commit, with one {@link GridCellChange} per changed cell
	 * of a row, batched into a single call. Cells commit when the session closes
	 * them, not when their editors unmount. Saving a row — removing it from the
	 * set — closes all of them at once; a cell-scoped session usually closes one
	 * as it moves on. A row or a column out of view still commits. Read the
	 * batch rather than its first entry: a session narrowing an already-open row
	 * closes several at once. Three kinds of cell are dropped: unchanged ones, and
	 * ones whose {@link GridColumn.validate} rejects the value. So are ones whose
	 * column stopped being editable while the editor was open. A row that is no
	 * longer in the grid's `rows` still commits. The grid compares and
	 * validates against the row object that the edit was first staged against
	 * (see {@link GridEditableConfig.rows}). Apply each change to your own row
	 * data and feed it back as `rows`. Ignore a change for a row that you
	 * deleted.
	 *
	 * Return a promise to commit asynchronously, for example to save to a
	 * server. The cells of the batch are then pending until the promise
	 * settles. Each shows the committed value with `aria-busy`, and cannot
	 * enter edit mode. The other cells stay editable, and other batches can
	 * commit at the same time.
	 *
	 * - Resolve with nothing, or with an empty array, to accept the batch. Apply
	 *   the changes to `rows` before the promise resolves, or at once for an
	 *   optimistic update. The cells then show the row's value.
	 * - Resolve with a {@link GridCellRefusal} for each cell that you refuse,
	 *   to accept the rest of the batch.
	 * - Reject to refuse the whole batch. A non-empty `message` of the rejection
	 *   reason is the error of each cell.
	 *
	 * A refused cell gets its value back as a staged edit. It shows the error
	 * where a `validate` error shows. Under row scope its row opens again
	 * through {@link GridEditableConfig.onRowsChange}. Under `scope: 'cell'` its
	 * editor opens beside the session, and focus into it moves the session there.
	 * Focus does not move. The next edit clears the error. A discard drops the
	 * edit and the error. The grid announces each settled batch politely.
	 *
	 * The grid drops a refused edit, and announces the count, in three cases.
	 * A controlled `rows` declines to open the row again. Apply the write in
	 * the same event that reports it, or the grid reads it as a decline. You
	 * close the row of a held cell under `scope: 'cell'`. You delete the row of
	 * a held cell; the next session transition drops it. Under server-side
	 * pagination a held cell on another page drops too.
	 *
	 * @remarks A synchronous return keeps the synchronous behaviour: the cells
	 * commit, and the grid announces them, in the same pass. A promise that
	 * settles after the grid unmounts changes nothing.
	 */
	// biome-ignore lint/suspicious/noConfusingVoidType: `void` lets an `async` function with no `return` pass as the sink; `undefined` would refuse its `Promise<void>`.
	onCommit: (changes: GridCellChange[]) => void | Promise<void | GridCellRefusal[]>
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
	 *
	 * @remarks Only a `validate` refusal calls this. A refusal from an async
	 * `onCommit` does not, because the grid keeps that value as a staged edit
	 * and shows the error itself.
	 */
	onReject?: (refused: GridCellChange[]) => void
	/**
	 * Adds a blank editor row, pinned at the top or the bottom of the body, for
	 * the entry of a new record. Its editable cells are always editors. Fill
	 * them, then press Enter in the row, or its Add control, to call
	 * {@link GridEditableConfig.onRowAdd}. Escape clears the row, and F2 keeps
	 * its values. Both put focus back on the grid, with the keyboard cursor on
	 * the cell. The row also shows over an empty grid.
	 *
	 * The row is not a data row. Sort, filter, grouping, pagination, and
	 * aggregation do not apply to it, and selection and export do not include
	 * it. It stays in view while the body scrolls, and a virtualized body keeps
	 * it outside its window. It is the first or the last row of the keyboard
	 * cursor, so the arrow keys reach it from the data row next to it.
	 *
	 * @remarks An add is always explicit. Focus that leaves the row does not
	 * add it, whatever {@link GridEditableConfig.commitOn} says, because a
	 * half-filled row must not create a record. Its values stay until an add
	 * or an Escape clears them. Tab and Shift+Tab move between the controls of
	 * the row in the tab order. They do not wrap, so Tab from the last control
	 * leaves the row.
	 *
	 * The row counts in `aria-rowcount` where the grid sets it. At the top it
	 * takes the first index after the header rows, and the data rows move down
	 * one. At the bottom it takes the index after the last data row, before a
	 * grand-total row. Its name is "New row".
	 *
	 * The row needs {@link GridEditableConfig.session} `'managed'` and
	 * {@link GridEditableConfig.onRowAdd}. Without either, the grid renders no
	 * row, and it warns in development.
	 */
	newRow?: 'top' | 'bottom'
	/**
	 * Called when the user adds the row that {@link GridEditableConfig.newRow}
	 * shows. `values` maps the `field` of each editable column to the value
	 * that the user entered, or the column id for a column with no `field`.
	 * It holds only the cells with a value. An empty text, `null`, and no entry
	 * are no value, and a row with no value adds nothing. A yes/no editor shows
	 * no choice until the user picks Yes or No, so it adds only a choice that
	 * the user made. Add the record to
	 * your data, and feed it back through the grid's `rows`.
	 *
	 * Each {@link GridColumn.validate} of a cell with a value reads the value
	 * and `values` as the row. A refusal blocks the add, and the error shows on
	 * the cell. A synchronous return accepts the add. The row then clears, and
	 * focus goes to its first editable cell.
	 *
	 * Return a promise to add asynchronously. The row is then pending until the
	 * promise settles, and a second add waits for it.
	 *
	 * - Resolve with nothing, or with an empty array, to accept the add.
	 * - Resolve with a {@link GridCellRefusal} for each cell that you refuse.
	 *   The grid ignores its `rowKey`.
	 * - Reject to refuse each cell with a value. A non-empty `message` of the
	 *   reason is the error.
	 *
	 * A refusal refuses the whole add. The values come back with the errors,
	 * and focus does not move. An accepted async add moves focus to the first
	 * editable cell only when focus is still in the grid. The grid announces
	 * "Row added", or the refusal, politely.
	 *
	 * @remarks This is a sibling of {@link GridEditableConfig.onCommit}, not
	 * part of it, because a new record has no row key yet. {@link
	 * GridEditableConfig.onReject} does not report the new row.
	 */
	// biome-ignore lint/suspicious/noConfusingVoidType: `void` lets an `async` function with no `return` pass as the callback; `undefined` would refuse its `Promise<void>`.
	onRowAdd?: (values: Record<string, unknown>) => void | Promise<void | GridCellRefusal[]>
}
