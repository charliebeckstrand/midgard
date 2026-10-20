'use client'

import {
	type FocusEvent as ReactFocusEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type RefObject,
	useCallback,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react'
import { useControllable, useMediaQuery } from '../../hooks'
import { useStableEvent } from '../../hooks/use-stable-event'
import { PHONE_QUERY } from '../../utilities/media-query'
import { createActiveEditStore } from './engine/grid-active-edit-store'
import { EMPTY_SET } from './engine/grid-constants'
import type { GridFillCell, GridPasteCell } from './engine/grid-edit-commit'
import { firstEditorCell } from './engine/grid-edit-focus'
import type { GridHistoryStep } from './engine/grid-edit-history'
import {
	type CellRequest,
	type CrossRowEntry,
	crossRowEntry,
	initialSessionRow,
	moveSessionRow,
	readInitialCell,
} from './engine/grid-edit-transition'
import {
	createDraftStore,
	type EditorKind,
	type GridActiveEdit,
	type GridDraftKey,
	isCellEditing,
	isSameCell,
	NEW_ROW_KEY,
	sameCell,
} from './engine/grid-editing-utilities'
import { resolveNewRow } from './engine/grid-new-row'
import type { GridEditSource } from './grid-data-types'
import type {
	GridEditingSession,
	GridNewRowSession,
	GridSettleControls,
} from './grid-editing-context'
import type { GridCellChange, GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'
import { useActiveCell, useGridCellBinding } from './use-grid-cell-binding'
import { useGridEditFocus } from './use-grid-edit-focus'
import { useGridEditHistory } from './use-grid-edit-history'
import { useGridEditKeys } from './use-grid-edit-keys'
import { useGridEditLeave } from './use-grid-edit-leave'
import { useGridEditSweep } from './use-grid-edit-sweep'
import { useGridEditWrites } from './use-grid-edit-writes'
import { useCommitOn, useGridEditingWarnings } from './use-grid-editing-warnings'
import type { Coord, GridNewRowPosition } from './use-grid-navigation'
import { useGridNewRow } from './use-grid-new-row'

/** The editing layer's surface, consumed by {@link useGridCursor}. @internal */
export type GridEditingApi = {
	session: GridEditingSession
	/**
	 * Opens the named cell for editing and focuses its editor once that mounts —
	 * the grid-owned entry behind `session: 'managed'`. Under row scope the
	 * cell names the row to open. An entry on a cell whose editor is already open
	 * only moves focus into that editor, and a `seed` replaces its draft. Under
	 * `scope: 'cell'` it re-points the session: the cell it leaves
	 * commits, and a previous row leaves the set. A transition that changes which
	 * rows edit goes through the controllable set, so `onRowsChange` reports it. A
	 * move between cells of one row leaves that set alone. A `seed` opens the
	 * editor with that value in place of the cell's own (type-to-edit). Under a
	 * controlled `cell` the entry only asks. The move and its rows write
	 * wait until the consumer applies the cell.
	 */
	enterEdit: (rowKey: string | number, columnId: string | number, seed?: string | number) => void
	/**
	 * The session's keys, layered onto the grid `<table>`'s key handler by
	 * {@link useGridCursor}. Escape abandons the session. From an open editor,
	 * Enter commits and moves down, and F2 commits and stays. Tab and Shift+Tab
	 * move between the controls of one cell first, and past the last control
	 * they commit and move along the row. Every editor (inferred input, listbox,
	 * `editCell` slot) therefore inherits the keys without wiring of its own.
	 * `undefined` unless the grid owns the session (`session: 'managed'`).
	 */
	sessionKeys: ((event: ReactKeyboardEvent<HTMLTableElement>) => void) | undefined
	/**
	 * The undo and redo keys, layered onto the grid `<table>`'s key handler by
	 * {@link useGridCursor} under either session. They act on the tab stop only,
	 * so an open editor keeps its own text undo. `undefined` unless
	 * {@link GridEditableConfig.history} is on.
	 */
	historyKeys: ((event: ReactKeyboardEvent<HTMLTableElement>) => void) | undefined
	/**
	 * One step through the history, for the grid's `ref` handle
	 * ({@link GridHandle}). It returns whether it wrote a cell, and it leaves
	 * the cursor where it is. With the history off, it does nothing.
	 */
	stepHistory: (step: GridHistoryStep) => boolean
	/**
	 * Writes the text of a paste into its cells, as one save, for the paste
	 * handler of {@link useGridCursor}. Present under
	 * `editable.session: 'managed'` only.
	 */
	pasteCells: ((cells: readonly GridPasteCell[]) => void) | undefined
	/**
	 * Writes the values of a fill into their cells, as one save, for the fill
	 * of {@link useGridCursor}. Present under `editable.session: 'managed'` only.
	 */
	fillCells: ((cells: readonly GridFillCell[]) => void) | undefined
	/**
	 * The session's commit on leave, layered onto the grid `<table>`'s focus
	 * handlers by {@link useGridCursor}. `blur` reads each focus move out of an
	 * editor, or out of the grid, against `commitOn`. When the move leaves what
	 * that policy watches, it commits the session. `focus` tells a surface that
	 * the grid renders from an unrelated element, through the React tree.
	 * `undefined` unless the grid owns the session and `commitOn` is not
	 * `'explicit'`.
	 */
	sessionLeave:
		| {
				blur: (event: ReactFocusEvent<HTMLTableElement>) => void
				focus: (event: ReactFocusEvent<HTMLTableElement>) => void
		  }
		| undefined
	/** The new-row slot ({@link GridEditableConfig.newRow}). */
	newRow: {
		/** Where the slot shows, or `null` when the grid shows none. */
		position: GridNewRowPosition
		/** The slot as its cells read it, or `null` when the grid shows none. */
		session: GridNewRowSession | null
		/** Opens a cell of the slot from the keyboard cursor, with an optional typed seed. */
		enter: (columnId: string | number, seed?: string | number) => void
		/** The editor that the grid infers for a column of the slot. */
		editorKind: (column: { id: string | number; field?: PropertyKey }) => EditorKind
	}
}

/**
 * Gives a function that forces one render of the component. The callbacks
 * that call it list it as a dependency. The React Compiler does not read the
 * dispatch of a `useReducer` as stable when the destructure leaves out the
 * state, so an unlisted dispatch makes the compiler skip the hook.
 *
 * @internal
 */
function useForceRender(): () => void {
	const [, force] = useReducer((count: number) => count + 1, 0)

	return force
}

/**
 * Owns per-row inline editing: the editable rows (a controllable `Set<key>`,
 * consumer-driven by default) and the staged drafts of cells in those rows. A
 * row in the set renders all its editable cells as editors at once. Each edit
 * stages into the {@link GridDraftStore} of the session, with no grid render
 * for each keystroke. A row leaves the
 * set on the consumer's save action, or on a grid-owned session exit under
 * `session: 'managed'` (Enter in an editor saves, Escape abandons). Its
 * drafts then flush as a single {@link GridCellChange} batch through `onCommit`,
 * dropping unchanged and invalid cells. Inert when `enabled` is false, so a
 * read-only grid pays nothing.
 *
 * A grid-owned session under `scope: 'cell'` narrows to one cell. The row still
 * enters the set, but only the active cell mounts an editor. Entering another
 * cell re-points the session and flushes the cell it leaves, so each batch
 * carries one change. Both scopes read one predicate for what is open,
 * {@link isCellEditing}; the flush sweep commits whatever it stops holding for.
 *
 * The drafts belong to the session, in one {@link GridDraftStore} keyed by
 * cell. A draft lives while its cell is open. An editor that unmounts, for
 * virtualization, a page change, a hidden column, or grouping, neither commits
 * nor drops it. An editor that mounts again shows it. A row that left the
 * grid's data when its session closes commits against the row snapshot that
 * each draft keeps. A write to a cell that the session closed is ignored.
 * An async `onCommit` holds its batch's drafts in the same store as pending
 * until the promise settles. A refused draft is staged again, with its error.
 *
 * The active cell is a controllable of its own (`cell`). Uncontrolled, the
 * grid writes it at event time, as before. Controlled, the grid only asks for
 * each move. A layout effect acts on each new value, from the grid or from the
 * consumer. It writes the rows that the value needs.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridEditing<T>({
	enabled,
	config,
	editSource,
	editSourceRef,
	rowKeysRef,
	dataColumnsRef,
	tableRef,
	cellId,
	moveTo,
}: {
	enabled: boolean
	config: GridEditableConfig | undefined
	/**
	 * The grid's own rows and columns in this render. The render reads this
	 * value, and the event and effect paths read {@link editSourceRef}.
	 */
	editSource: GridEditSource<T>
	/** The grid's own rows and columns, which the commit path resolves against. */
	editSourceRef: RefObject<GridEditSource<T>>
	rowKeysRef: RefObject<(string | number)[]>
	/** Visible data columns in display order. */
	dataColumnsRef: RefObject<GridColumn<T>[]>
	/** The grid `<table>`, the tab stop that a session exit reseats focus on. */
	tableRef: RefObject<HTMLTableElement | null>
	/** The cursor's per-cell id deriver; locates the entered cell's editor to focus it. */
	cellId: (row: number, col: number) => string
	/** The cursor's clamped move, which the commit-and-move keys ride. */
	moveTo: (coord: Coord) => void
}): GridEditingApi {
	// Grid-owned session lifecycle (enter on double-click / cursor Enter, exit on
	// an editor's Enter/Escape); the default 'manual' mode leaves it entirely to
	// the consumer.
	const managed = enabled && config?.session === 'managed'

	// Cell scope narrows a grid-owned session to the entered cell. It needs that
	// session: under 'manual' the consumer names a row and never a cell, so there
	// is no cell to narrow to and the row's editors all mount.
	const scopeRequested = enabled && config?.scope === 'cell'

	const cellScoped = managed && scopeRequested

	// A setting that the config makes inert fails silently. The warnings tell
	// the developer.
	useGridEditingWarnings({ enabled, config, managed, scopeRequested, cellScoped })

	const commitOn = useCommitOn(enabled ? config?.commitOn : undefined, managed)

	// A phone edits in an overlay, at the rule of the DatePicker sheet. The
	// overlay commits only on its Save, so no commit on leave runs while it
	// shows.
	const phone = useMediaQuery(PHONE_QUERY)

	const overlayKind = config?.overlay ?? 'drawer'

	const overlay = enabled && phone && overlayKind !== false ? overlayKind : null

	// The new-row slot, where the config can show it. Its cells always take a
	// write, so the draft store reads this at write time.
	const newRowPosition = resolveNewRow(config, managed)

	const newRowOpen = newRowPosition !== null

	const newRowOpenRef = useRef(newRowOpen)

	// A consumer's `cell` decides each move of the session's cell. The
	// binding applies only where that cell exists.
	const controlled = cellScoped && config?.cell !== undefined

	// The cell the session opens with, from the binding's first value. Read once:
	// it seeds the uncontrolled state, and the row it needs seeds `defaultRows`.
	const [initial] = useState(() => readInitialCell(config, cellScoped, editSource))

	// The editable-row set is consumer-driven by default — the grid renders no
	// built-in entry and only reads the binding (a row-action button flips a
	// key). Under `session: 'managed'` the grid also writes it, through the
	// session callbacks below, so every entry/exit still emits `onRowsChange`.
	// An initial active cell opens its row with the default, so the mount reports
	// nothing. A controlled `rows` gets no such seed, and without the row the cell
	// stays closed.
	const [editableRowsRaw, setEditableRows] = useControllable<Set<string | number>>({
		value: config?.rows,
		defaultValue: () => {
			const base = config?.defaultRows ?? EMPTY_SET

			const cell = initial.cell

			return cell === null || base.has(cell.rowKey) ? base : new Set(base).add(cell.rowKey)
		},
		onValueChange: (next) => config?.onRowsChange?.(next ?? EMPTY_SET),
	})

	const editableRows = enabled ? (editableRowsRaw ?? EMPTY_SET) : EMPTY_SET

	// The last uncontrolled cross-row entry, until the transition effect sees
	// whether the rows binding applied it. State, because the render reads it:
	// the entry sets it with the cell and the rows, in one render.
	const [entry, setEntry] = useState<CrossRowEntry | null>(null)

	const {
		raw,
		setValue: setActiveCellValue,
		settled,
		setSettled,
		activeEdit,
	} = useActiveCell({
		config,
		cellScoped,
		controlled,
		initialCell: initial.cell,
		editableRows,
		editSource,
		entry,
	})

	// The cell a cell-scoped session edits; null under row scope. The hook's own
	// effects read `activeEdit`: the commit sweep and the transition. The cells
	// read the store, each subscribed to its own flag, so a move along a row
	// renders two cells rather than the whole window.
	const [activeEditStore] = useState(createActiveEditStore)

	// Seat the resolved coord and rows for the cells that render in this pass.
	// The other cells hear of them in the layout effect below. An uncontrolled
	// write of the coord reached the store at event time already, so both are
	// no-ops for it.
	activeEditStore.seat(activeEdit, editableRows)

	useLayoutEffect(() => {
		activeEditStore.setRows(editableRows)

		activeEditStore.set(activeEdit)
	}, [activeEdit, editableRows, activeEditStore])

	// Read by the [] -stable session callbacks at event time.
	const editableRowsRef = useRef(editableRows)

	const activeEditRef = useRef(activeEdit)

	// Synced before paint, not during render. Every reader runs after the commit:
	// key, click, and focus events, an editor's blur, the passive effects of the
	// cells, a promise of a save, and the transition effect below, which this
	// effect comes before. React fires no event handler during a commit. Run on
	// every commit, not keyed on the values: an event writes `editableRowsRef`
	// and `activeEditRef` ahead of its render, and a render that keeps the values
	// must still restore them.
	useLayoutEffect(() => {
		newRowOpenRef.current = newRowOpen

		editableRowsRef.current = editableRows

		activeEditRef.current = activeEdit
	})

	// The sinks, read as stable events, so a new callback does not run the sweep
	// again. Whether `onCommit` is present stays in the deps: a sink that went
	// with its binding commits nothing, and nothing is announced.
	const hasCommit = config?.onCommit !== undefined

	const sendCommit = useStableEvent((changes: GridCellChange[]) => config?.onCommit(changes))

	const sendReject = useStableEvent((refused: GridCellChange[]) => config?.onReject?.(refused))

	// The undo history, when the config turns it on.
	const history = useGridEditHistory(enabled, config?.history, config?.onHistoryChange)

	// The open state that the last commit sweep saw. A cell that it saw open
	// has not committed yet, so a write to it still counts.
	const sweptRef = useRef<{ rows: Set<string | number>; cell: GridActiveEdit | null }>({
		rows: EMPTY_SET,
		cell: null,
	})

	// The session's drafts, keyed by cell. The session owns them, not the
	// editors: a draft lives while its cell is open, mounted or not. The store
	// has no subscribers, so staging never re-renders the grid. It takes a
	// write only for a cell that is open now, or that the last sweep saw open.
	// A later write, such as a blur after a save, is too late to commit.
	//
	// The store calls the predicate only when a value stages: from an editor
	// event, a blur, or the effect of a typed entry. It never stages during
	// render, so the predicate is a stable event.
	const accepts = useStableEvent((rowKey: GridDraftKey, columnId: string | number) =>
		rowKey === NEW_ROW_KEY
			? newRowOpenRef.current
			: isCellEditing({
					rowKey,
					columnId,
					editableRows: editableRowsRef.current,
					activeEdit: activeEditRef.current,
				}) ||
				isCellEditing({
					rowKey,
					columnId,
					editableRows: sweptRef.current.rows,
					activeEdit: sweptRef.current.cell,
				}),
	)

	const [drafts] = useState(() => createDraftStore(accepts))

	const stageDraft = drafts.stage

	const unstageDraft = drafts.unstage

	const readDraft = drafts.read

	// Whether the cell's commit is in flight. Such a cell cannot open.
	const isPending = useCallback(
		(rowKey: string | number, columnId: string | number) =>
			drafts.read(rowKey, columnId)?.status === 'pending',
		[drafts],
	)

	// The focus intents of an entry, the reseat on a session exit, and where
	// focus returns as the session on a row ends.
	const {
		pendingFocusRef,
		pendingSeedRef,
		awaitRowRef,
		reseatingRef,
		originsRef,
		placeOrigin,
		entrySeed,
		dropIntents,
		claimFocus,
		reseat,
		focusTarget,
		returnFocus,
		settleFocus,
		focusOpenEditor,
	} = useGridEditFocus({
		editableRows,
		activeEdit,
		editableRowsRef,
		activeEditRef,
		tableRef,
		rowKeysRef,
		dataColumnsRef,
		cellId,
		moveTo,
	})

	const newRow = useGridNewRow<T>({
		config,
		managed,
		position: newRowPosition,
		drafts,
		editSource,
		editSourceRef,
		dataColumnsRef,
		tableRef,
		reseat,
		cellId,
		moveTo,
	})

	// The row the grid-owned session holds, with how it came by it. Row scope
	// keeps no coord, and Escape has to reach the session from anywhere in the
	// grid under both scopes, so the row is recorded here rather than read off
	// `activeEdit`. Provenance rides the row because the row is its subject: read
	// off the cell it would be recomputed on every move, and a move within an
	// acquired row would find that row already in the set and forget the session
	// had put it there. An initial cell's row counts as acquired only when the
	// grid seeded it into an uncontrolled set that `defaultRows` lacked. A
	// controlled `rows` gets no seed, so the consumer opens that row, and it
	// stays open when the session leaves it.
	const sessionRowRef = useRef(initialSessionRow(initial.cell, config))

	// The move a controlled binding has yet to apply. `bump` forces the render
	// that tells an applied move from a declined one.
	const requestRef = useRef<CellRequest | null>(null)

	const bump = useForceRender()

	// The rows that the grid itself closed since the last sweep: a session exit,
	// or an acquired row that the session leaves. The sweep reads any other row
	// that left the set as closed by the consumer.
	const gridClosedRef = useRef(new Set<string | number>())

	// Asks a controlled binding for a move: it reports the cell, and records what
	// the move needs once the consumer applies it. `exit` names the row that an
	// exit on the way closes. The counter forces the render that settles it.
	const requestCell = useCallback(
		(
			next: GridActiveEdit | null,
			exit?: { rowKey: string | number; discard: boolean; reseat: boolean },
		) => {
			const prev = activeEditRef.current

			const request = requestRef.current ?? {
				to: prev,
				endRows: new Set(),
				discard: null,
				blur: false,
			}

			request.to = next

			// An exit reseats focus, as `endSession` does at event time uncontrolled.
			// A commit on leave does not, because focus already went elsewhere.
			if (exit) request.endRows.add(exit.rowKey)

			if (exit?.reseat) request.blur = true

			if (exit?.discard) request.discard = prev

			requestRef.current = request

			activeEditRef.current = next

			setActiveCellValue(next)

			bump()
		},
		[setActiveCellValue, bump],
	)

	// Writes the session's cell for a move the grid makes. Uncontrolled, the move
	// lands now: the state, the store, and the report, ahead of any rows write.
	// Controlled, the grid only asks, and the transition effect acts on the move
	// once the consumer applies it.
	const writeActiveCell = useCallback(
		(next: GridActiveEdit | null) => {
			if (sameCell(activeEditRef.current, next)) return

			if (controlled) {
				requestCell(next)

				return
			}

			activeEditRef.current = next

			setActiveCellValue(next)

			activeEditStore.set(next)
		},
		[controlled, requestCell, setActiveCellValue, activeEditStore],
	)

	const enterEdit = useCallback(
		(rowKey: string | number, columnId: string | number, seed?: string | number) => {
			const active = activeEditRef.current

			const editableRows = editableRowsRef.current

			// A cell-scoped session names one cell and holds one row; row scope names
			// no cell and leaves the rows the consumer put in the set alone.
			const entering = cellScoped ? { rowKey, columnId } : null

			// Entering changes nothing when the session already sits where it points:
			// this cell under cell scope, this row under row scope, where the whole
			// row opens at once. `isCellEditing` cannot answer this, because it is the
			// mount question: it holds for every cell of a row the consumer opened,
			// so it would refuse to narrow one. A session that has not started is not
			// a reason to decline starting it.
			const here = entering ? isSameCell(active, entering) : editableRows.has(rowKey)

			// A cell whose commit is in flight cannot open, so no second batch for
			// it can start before the first settles.
			if (isPending(rowKey, columnId)) return

			pendingFocusRef.current = { rowKey, columnId }

			pendingSeedRef.current = { rowKey, columnId, value: seed }

			originsRef.current.set(rowKey, { cell: { rowKey, columnId } })

			// The editor of the cell is open, so the entry only moves focus into it.
			// The editor claims the intents as it takes the focus, with a typed
			// character in place of its draft.
			if (here) {
				focusOpenEditor(rowKey, columnId)

				return
			}

			// A controlled binding decides the move. The rows it needs follow once
			// the consumer applies the cell, so a declined move writes nothing.
			if (controlled) {
				writeActiveCell(entering)

				return
			}

			const move = moveSessionRow(sessionRowRef.current, rowKey, editableRows)

			// Row scope names no cell, so it leaves no row behind.
			const leaving = entering ? move.leaving : null

			// A controlled `rows` can decline the row that this entry opens. Record
			// where the session was, so that a decline puts it back there.
			setEntry(crossRowEntry(entering, active, editableRows, sessionRowRef.current))

			sessionRowRef.current = move.row

			// The cell goes first, then the rows: `onCellChange` reports ahead of
			// the `onRowsChange` that opens its row.
			writeActiveCell(entering)

			// The set is unchanged when the session moves along one row, or moves off a
			// borrowed row onto one already in the set. Writing it anyway would
			// announce a transition that never happened, because a new `Set` is a new
			// value to the controllable, equal or not.
			if (leaving === null && editableRows.has(rowKey)) return

			// A controlled `rows` that declines this write renders nothing, and the
			// focus intent drops only after a render. This one goes in the same batch
			// as an accepted write.
			bump()

			setEditableRows((prev) => {
				const next = new Set(prev ?? EMPTY_SET)

				// The row a cell-scoped session leaves exits the set, and the flush
				// sweep commits what it staged there.
				if (leaving !== null) {
					gridClosedRef.current.add(leaving)

					next.delete(leaving)
				}

				return next.add(rowKey)
			})
		},
		[
			bump,
			cellScoped,
			controlled,
			focusOpenEditor,
			isPending,
			setEditableRows,
			writeActiveCell,
			pendingFocusRef,
			pendingSeedRef,
			originsRef,
		],
	)

	// Drops the drafts that a discard abandons. A cell-scoped session abandons
	// the cell it sits on. The cells it visited before that one committed as it
	// left them, so their values are not the session's to discard. Row scope
	// drops the whole row's drafts. Neither asks which editors are mounted.
	const discardDrafts = useCallback(
		(rowKey: string | number, cell: GridActiveEdit | null) => {
			if (cell) drafts.unstage(rowKey, cell.columnId)
			else drafts.unstageRow(rowKey)
		},
		[drafts],
	)

	/**
	 * Ends a grid-owned session on `rowKey`. It reseats focus on the grid's tab
	 * stop and drops the row from the set. The flush sweep then commits the
	 * editors that closed with it. `'discard'` drops the session's staged values
	 * ahead of the sweep, so it finds nothing left to emit. Under a controlled
	 * `cell`, an exit from the held cell waits for the consumer to apply
	 * `null`; the transition effect then does all of this. A commit on leave
	 * passes `reseatFocus: false`, because focus already went where the user
	 * sent it.
	 */
	const exitSession = useCallback(
		(rowKey: string | number, outcome: 'save' | 'discard', reseatFocus: boolean) => {
			if (!editableRowsRef.current.has(rowKey)) return

			// The active cell only concerns this call when it sits on this row.
			const cell = activeEditRef.current?.rowKey === rowKey ? activeEditRef.current : null

			if (cell && controlled) {
				requestCell(null, { rowKey, discard: outcome === 'discard', reseat: reseatFocus })

				return
			}

			// Reseat focus ahead of the discard, not after. An editor blurred on the
			// way out can stage one last value; `NumberInput` commits its typed text
			// there. That write must not outlive the values being dropped.
			if (reseatFocus) returnFocus(rowKey)

			if (outcome === 'discard') discardDrafts(rowKey, cell)

			if (sessionRowRef.current?.rowKey === rowKey) sessionRowRef.current = null

			gridClosedRef.current.add(rowKey)

			// Two things end a session, and each clears the coord its own way. This
			// exit is one. The other is a consumer withdrawing the row from under it,
			// which the derivation above catches: a coord off the set reads as no
			// session at all. The cell reports first, then the rows.
			if (cell) writeActiveCell(null)

			setEditableRows((prev) => {
				const next = new Set(prev ?? EMPTY_SET)

				next.delete(rowKey)

				return next
			})
		},
		[controlled, requestCell, discardDrafts, setEditableRows, writeActiveCell, returnFocus],
	)

	// The session's own exit, from its keys, its settle controls, and a slot's
	// `commit`. Each reseats focus on the tab stop.
	const endSession = useCallback(
		(rowKey: string | number, outcome: 'save' | 'discard') => exitSession(rowKey, outcome, true),
		[exitSession],
	)

	// The commit sweep, its async batches, and the saves of the overlay that
	// wait for them.
	const { saveSession, settleDeclinedSaves, trackBatch } = useGridEditSweep({
		cellScoped,
		editableRows,
		activeEdit,
		drafts,
		activeEditStore,
		editableRowsRef,
		activeEditRef,
		sweptRef,
		gridClosedRef,
		requestRef,
		editSourceRef,
		setEditableRows,
		exitSession,
		bump,
		recordEntry: history.record,
		restoreStep: history.restore,
		hasCommit,
		sendCommit,
		sendReject,
	})

	// The binding of the session's cell settles after each commit. It comes
	// after the sweep's settle of a declined save, which it relies on.
	useGridCellBinding({
		controlled,
		raw,
		settled,
		setSettled,
		activeEdit,
		initialUneditable: initial.uneditable,
		entry,
		setEntry,
		setActiveCellValue,
		setEditableRows,
		editableRowsRef,
		activeEditRef,
		sessionRowRef,
		requestRef,
		gridClosedRef,
		awaitRowRef,
		editSourceRef,
		bump,
		settleFocus,
		unstageDraft,
		dropIntents,
		settleDeclinedSaves,
	})

	const { sessionKeys, sessionTarget } = useGridEditKeys({
		cellScoped,
		controlled,
		tableRef,
		rowKeysRef,
		dataColumnsRef,
		editableRowsRef,
		activeEditRef,
		sessionRowRef,
		requestRef,
		cellId,
		moveTo,
		reseat,
		isPending,
		enterEdit,
		endSession,
		newRowKeys: newRow.keys,
	})

	const sessionLeave = useGridEditLeave({
		commitOn,
		reseatingRef,
		editableRowsRef,
		sessionRowRef,
		sessionTarget,
		exitSession,
	})

	// The settle controls a cell shows, decided here rather than in the cell. The
	// cell a cell-scoped session holds shows them. Under `'leaveEditor'` a move
	// away saves, so a save control is redundant and only discard shows.
	const settleControls = useCallback(
		(rowKey: string | number, columnId: string | number): GridSettleControls => {
			if (!cellScoped || !isSameCell(activeEditStore.get(), { rowKey, columnId })) return 'none'

			return commitOn === 'leaveEditor' ? 'discard' : 'both'
		},
		[cellScoped, commitOn, activeEditStore],
	)

	// Moves a cell-scoped session onto a refused cell that the refusal opened
	// beside it, as focus moves into its editor. Focus is already there, so the
	// entry leaves no focus intent.
	const resumeCell = useCallback(
		(rowKey: string | number, columnId: string | number) => {
			if (!cellScoped) return

			enterEdit(rowKey, columnId)

			dropIntents()
		},
		[cellScoped, enterEdit, dropIntents],
	)

	// Opens a row from a control in it, such as a pencil, as an entry on the
	// first editable cell of the row does. Focus goes into that cell's editor.
	// As the session on the row ends, focus returns to the control, not to the
	// cell. A row with no editable column has nothing to open.
	const editRow = useCallback(
		(rowKey: string | number) => {
			const cell = firstEditorCell(rowKey, dataColumnsRef.current)

			if (!cell) return

			enterEdit(cell.rowKey, cell.columnId)

			placeOrigin(rowKey)
		},
		[dataColumnsRef, enterEdit, placeOrigin],
	)

	const { pasteCells, fillCells, stepHistory, historyKeys } = useGridEditWrites({
		drafts,
		editSourceRef,
		rowKeysRef,
		dataColumnsRef,
		moveTo,
		history,
		hasCommit,
		sendCommit,
		sendReject,
		trackBatch,
	})

	const session = useMemo<GridEditingSession>(
		() => ({
			activeEditStore,
			stageDraft,
			unstageDraft,
			readDraft,
			endSession,
			editRow,
			entrySeed,
			claimFocus,
			settleControls,
			resumeCell,
			managed,
			overlay,
			saveSession,
			showOverlay: activeEditStore.setShown,
			focusTarget,
		}),
		[
			activeEditStore,
			stageDraft,
			unstageDraft,
			readDraft,
			managed,
			endSession,
			editRow,
			entrySeed,
			claimFocus,
			settleControls,
			resumeCell,
			overlay,
			saveSession,
			focusTarget,
		],
	)

	return {
		session,
		enterEdit,
		sessionKeys: managed ? sessionKeys : undefined,
		historyKeys,
		stepHistory,
		pasteCells: managed ? pasteCells : undefined,
		fillCells: managed ? fillCells : undefined,
		sessionLeave: commitOn === 'explicit' || overlay !== null ? undefined : sessionLeave,
		newRow: {
			position: newRowPosition,
			session: newRow.session,
			enter: newRow.enter,
			editorKind: newRow.editorKind,
		},
	}
}
