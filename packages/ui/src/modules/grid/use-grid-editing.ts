'use client'

import {
	type FocusEvent as ReactFocusEvent,
	type KeyboardEvent as ReactKeyboardEvent,
	type RefObject,
	useCallback,
	useEffect,
	useEffectEvent,
	useLayoutEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react'
import { announce } from '../../core'
import { useControllable } from '../../hooks'
import { useMountedRef } from '../../hooks/use-mounted-ref'
import { useStableEvent } from '../../hooks/use-stable-event'
import { focusWithoutReveal } from '../../hooks/use-truncation'
import { createActiveEditStore } from './engine/grid-active-edit-store'
import {
	describeCommit,
	describeDiscard,
	describeHistoryMiss,
	describeSettle,
	describeWrite,
	type GridSaveOutcome,
} from './engine/grid-announcements'
import { EMPTY_SET, FLOATING_PORTAL } from './engine/grid-constants'
import {
	dropStrandedHolds,
	flushClosedCells,
	type GridFillCell,
	type GridPasteCell,
	historyOutcome,
	type InFlightBatch,
	pasteChange,
	readHistoryCell,
	rowLookup,
	sendCells,
	settleDrafts,
	writeTarget,
} from './engine/grid-edit-commit'
import {
	type GridHistoryCell,
	type GridHistoryStep,
	historyStep,
	historyValue,
} from './engine/grid-edit-history'
import {
	type CellRequest,
	type CrossRowEntry,
	crossRowEntry,
	initialSessionRow,
	moveSessionRow,
	planTransition,
	readControlledCell,
	readInitialCell,
	readSettled,
	type SettledCell,
	settledAt,
	settleOn,
	type TransitionPlan,
	writeRowsPlan,
} from './engine/grid-edit-transition'
import {
	coordOf,
	createDraftStore,
	EDITOR_FOCUSABLE,
	type EditorKind,
	type GridActiveEdit,
	type GridDraftKey,
	type GridDraftStore,
	isCellEditing,
	isColumnEditable,
	isInGrid,
	isSameCell,
	NATIVE_ENTER,
	NEW_ROW_KEY,
	readKeyPress,
	readRefusals,
	sameCell,
	stepEditableColumn,
	tabStaysInCell,
	trackSink,
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
import { useGridEditHistory } from './use-grid-edit-history'
import {
	type CommitOn,
	UNEDITABLE_CELL_WARNING,
	useCommitOn,
	useGridEditingWarnings,
} from './use-grid-editing-warnings'
import type { Coord, GridNewRowPosition } from './use-grid-navigation'
import { useGridNewRow } from './use-grid-new-row'

/** The editing layer's surface, consumed by {@link useGridCursor}. @internal */
export type GridEditingApi = {
	session: GridEditingSession
	/**
	 * Opens the named cell for editing and focuses its editor once that mounts —
	 * the grid-owned entry behind `session: 'managed'`. Under row scope the
	 * cell names the row to open, and re-entering a row already editing is a
	 * no-op. Under `scope: 'cell'` it re-points the session: the cell it leaves
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
 * Reseats focus on the grid's single tab stop, `grid`, when focus sits in this
 * grid. Called before a grid-owned session exit unmounts the focused editor, so
 * the keyboard lands back on the cursor rather than falling to `<body>`.
 *
 * @remarks Focus in another grid stays where it is. That includes a grid nested
 * in a detail row of this one, because none of its elements unmount with the
 * exit. {@link isInGrid} tells the two apart.
 *
 * @internal
 */
function restoreGridFocus(grid: HTMLElement | null): void {
	if (grid && isInGrid(document.activeElement, grid)) grid.focus()
}

/**
 * Runs {@link restoreGridFocus} with `flag` set, and clears the flag after it,
 * also when the move throws. The commit on leave reads the flag, so it does not
 * read the grid's own move as a user who left the editor. A module function,
 * because the React Compiler does not compile a `try` without a `catch`.
 *
 * @internal
 */
function reseatFlagged(flag: { current: boolean }, grid: HTMLElement | null): void {
	flag.current = true

	try {
		restoreGridFocus(grid)
	} finally {
		flag.current = false
	}
}

/**
 * Whether `node` is in a floating surface that an editor opened. That is a
 * portaled panel, such as an open listbox's options or the date picker's
 * calendar. It is also an open disclosure's own trigger or input
 * (`aria-expanded="true"`), such as a combobox with its panel open. Only the
 * key surface reads this rule, because a key reaches the table only from its
 * own React tree. The commit on leave must not read it for the element that
 * takes focus: an unrelated surface on the page matches it too. @internal
 */
function inFloatingSurface(node: Element): boolean {
	return node.closest(FLOATING_PORTAL) !== null || node.closest('[aria-expanded="true"]') !== null
}

/**
 * Whether a key press belongs to a floating surface inside the grid rather than
 * to the session. A press already consumed (`defaultPrevented`) qualifies, and
 * so does a press from focus in a surface (see {@link inFloatingSurface}). The
 * surface's own document-level key layer runs after the table's handler, so the
 * session stands down and lets that layer take the press.
 *
 * @internal
 */
function claimedBySurface(event: ReactKeyboardEvent<HTMLTableElement>): boolean {
	if (event.defaultPrevented || !(event.target instanceof Element)) return true

	return inFloatingSurface(event.target)
}

/** Where a move key takes the session from an open editor. @internal */
type SessionMove = 'down' | 'next' | 'previous' | 'here'

/**
 * The move a key press asks of the session from an open editor, or `null` when
 * the press is not the session's. The tab stop's own keys are the cursor's,
 * which enter a cell. A key with Ctrl, Cmd, or Alt is the editor's shortcut.
 * Enter on an element that acts on it natively stays with that element. Tab
 * that has a next control in the same cell stays with the browser (see
 * {@link tabStaysInCell}).
 *
 * @internal
 */
function editorMove(event: ReactKeyboardEvent<HTMLTableElement>): SessionMove | null {
	const target = event.target as Element

	if (target === event.currentTarget || event.ctrlKey || event.metaKey || event.altKey) return null

	// Tab moves between the controls of one cell first. Only Tab past the last
	// control, or Shift+Tab past the first, commits and moves.
	if (event.key === 'Tab') {
		if (tabStaysInCell(target, event.shiftKey)) return null

		return event.shiftKey ? 'previous' : 'next'
	}

	if (event.key === 'F2') return 'here'

	if (event.key === 'Enter' && !target.closest(NATIVE_ENTER)) return 'down'

	return null
}

/**
 * Whether `node`, an element in the DOM of the table `grid`, is inside what a
 * `commitOn` policy watches. `'leaveGrid'` watches the grid, by the
 * nearest-grid rule. `'leaveEditor'` watches the editors, which `inEditors`
 * names.
 *
 * @internal
 */
function inWatched(args: {
	commitOn: CommitOn
	grid: HTMLElement
	node: Element
	inEditors: (node: Element) => boolean
}): boolean {
	const { commitOn, grid, node, inEditors } = args

	return commitOn === 'leaveGrid' ? isInGrid(node, grid) : inEditors(node)
}

/**
 * What a focus move out of `from` into `next` means to a `commitOn` policy,
 * for the table `grid`: `'stay'`, `'leave'`, or `'ask'`.
 *
 * - A move that does not start inside what the policy watches stays. A
 *   `from` outside the table's DOM reached the table through the React tree.
 *   It is in a surface that the grid renders, so it counts as inside.
 * - A window blur stays. It names no `next` element while the document has
 *   no focus. Any other move with no `next` element goes to the page body,
 *   and leaves.
 * - A `next` in the table's DOM reads by {@link inWatched}.
 * - A `next` outside the table's DOM is `'ask'`. Only the React tree can tell
 *   a surface that the grid renders from an unrelated element, so the focus
 *   event that follows decides.
 *
 * @internal
 */
function readLeave(args: {
	commitOn: CommitOn
	grid: HTMLElement
	from: Element
	next: Element | null
	inEditors: (node: Element) => boolean
}): 'stay' | 'leave' | 'ask' {
	const { grid, from, next } = args

	if (grid.contains(from) && !inWatched({ ...args, node: from })) return 'stay'

	if (next === null) return document.hasFocus() ? 'leave' : 'stay'

	if (!grid.contains(next)) return 'ask'

	return inWatched({ ...args, node: next }) ? 'stay' : 'leave'
}

/**
 * A focus move out of the table's DOM that waits for its focus event. The
 * table's `onFocus` marks it `owned` when the event reaches the table through
 * the React tree. @internal
 */
type PendingLeave = { next: Element; rowKey: string | number; owned: boolean }

/**
 * Resolves the session's cell against the set. It owns the `cell`
 * controllable, the value the transition effect settled, and the mask of an
 * uncontrolled coord that stranded. @internal
 */
function useActiveCell<T>({
	config,
	cellScoped,
	controlled,
	initialCell,
	editableRows,
	editSource,
	entry,
}: {
	config: GridEditableConfig | undefined
	cellScoped: boolean
	controlled: boolean
	initialCell: GridActiveEdit | null
	editableRows: Set<string | number>
	editSource: GridEditSource<T>
	entry: CrossRowEntry | null
}) {
	// The session's cell as the binding holds it, before the grid resolves it
	// against the set. Uncontrolled, the grid writes it at event time. Controlled,
	// the consumer writes it, and the grid only asks through the change report.
	const [value, setValue] = useControllable<GridActiveEdit>({
		value: cellScoped ? config?.cell : undefined,
		defaultValue: initialCell ?? undefined,
		onValueChange: (next) => config?.onCellChange?.(next),
	})

	const raw = value ?? null

	// The last value of a controlled binding that the transition effect acted on.
	// A value past it is in flight: the effect has yet to write the rows it needs.
	// State, because the render reads it: the effect sets it, and the render that
	// follows reads the new value before paint.
	const [settled, setSettled] = useState<SettledCell>({ raw: initialCell, cell: initialCell })

	const candidate = controlled ? readControlledCell(raw, settled, editableRows, editSource) : raw

	// An uncontrolled coord that stranded once stays dropped. Masking alone would
	// survive as state, so the same row re-entering the set later would revive a
	// cell nobody opened and mount its editor alone. The grid cannot clear the
	// state here without a change report, so it records the stranded value
	// instead. A controlled value is the consumer's own, so it reads again when
	// its row opens again.
	const [maskedCell, setMaskedCell] = useState<GridActiveEdit | null>(null)

	const masked = !controlled && candidate !== null && candidate === maskedCell

	// Three things strand the coord. A binding can decline an entry, so the row
	// never joins the set; a consumer save can drop an editing row from under the
	// session; and `scope` or `session` can change under a live session, which
	// leaves a coord the current config would never have written.
	const stranded =
		candidate !== null && !masked && (!cellScoped || !editableRows.has(candidate.rowKey))

	// A cross-row entry that the rows binding declined reads as the cell it left,
	// while that cell's row is still open. The transition effect then writes the
	// state back to it, so no mask is necessary.
	const declined =
		stranded &&
		!controlled &&
		cellScoped &&
		entry !== null &&
		sameCell(candidate, entry.to) &&
		editableRows.has(entry.from.rowKey)

	// Adjusting the state here is React's answer to a value gone stale against its
	// input, and it beats an effect that resynchronizes a render late.
	if (stranded && !controlled && !declined) setMaskedCell(candidate)

	const activeEdit = declined ? entry.from : stranded || masked ? null : candidate

	return { raw, setValue, settled, setSettled, activeEdit }
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

	const { record: recordEntry, take: takeStep, restore: restoreStep } = history

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

	// The cell whose editor takes focus once it mounts. The entry sets it, and the
	// editor claims it as it mounts or as the session comes to hold it. A
	// controlled binding can delay that mount by a consumer round-trip.
	const pendingFocusRef = useRef<GridActiveEdit | null>(null)

	// The value a type-to-edit entry opens its editor with, beside the focus
	// intent and cleared with it. The editor reads it once, as it mounts.
	const pendingSeedRef = useRef<(GridActiveEdit & { value?: string | number }) | null>(null)

	const entrySeed = useCallback((rowKey: string | number, columnId: string | number) => {
		const pending = pendingSeedRef.current

		return pending && isSameCell(pending, { rowKey, columnId }) ? pending.value : undefined
	}, [])

	const dropIntents = useCallback(() => {
		pendingFocusRef.current = null

		pendingSeedRef.current = null
	}, [])

	// Called by an editor as it mounts, and as the session comes to hold it. It
	// takes the focus intent when the intent names its cell and that cell is
	// open. The editor then focuses itself. It knows its own element, so no
	// display coord travels from the entry, and a re-sort cannot misplace it.
	const claimFocus = useCallback(
		(rowKey: string | number, columnId: string | number) => {
			const pending = pendingFocusRef.current

			if (!pending || !isSameCell(pending, { rowKey, columnId })) return false

			const open = isCellEditing({
				rowKey,
				columnId,
				editableRows: editableRowsRef.current,
				activeEdit: activeEditRef.current,
			})

			if (open) dropIntents()

			return open
		},
		[dropIntents],
	)

	// Set when a transition opens a row this commit, so the drop below waits one
	// render for the row to arrive.
	const awaitRowRef = useRef(false)

	// Drop a focus intent whose cell the session does not hold, after each render.
	// A binding declined the entry, or the session moved on. Without this the
	// intent would steal focus at the next, unrelated open of that cell. An open
	// cell keeps its intent: its editor claims it as it mounts, which under a
	// controlled binding is the render after this one.
	useEffect(() => {
		if (awaitRowRef.current) {
			awaitRowRef.current = false

			return
		}

		const pending = pendingFocusRef.current

		if (pending && !isCellEditing({ ...pending, editableRows, activeEdit })) dropIntents()
	})

	// Set while the grid moves focus itself, so the commit on leave does not
	// read the grid's own reseat as a user who left the editor.
	const reseatingRef = useRef(false)

	// Reseats focus on the tab stop (see `restoreGridFocus`), marked as the
	// grid's own move for the commit on leave.
	const reseat = useCallback(() => reseatFlagged(reseatingRef, tableRef.current), [tableRef])

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

	// Moves focus for one transition of a controlled binding. A value set from
	// outside replaces the intents of any entry, and focus follows it into the
	// grid only when focus is already there (WCAG 3.2.1). Focus in a grid nested
	// in a detail row is not in this grid (see `isInGrid`). The leaving editor
	// blurs while it is still mounted, so a value it stages on blur reaches the
	// draft before the sweep commits the cell. A move the grid asked for blurs
	// where the uncontrolled path does: on a key move or an exit.
	const settleFocus = useCallback(
		(plan: TransitionPlan, blur: boolean) => {
			const focused = isInGrid(document.activeElement, tableRef.current)

			if (!plan.asked) {
				dropIntents()

				if (plan.next && focused) pendingFocusRef.current = plan.next
			}

			if (plan.asked ? blur : focused) reseat()
		},
		[dropIntents, reseat, tableRef],
	)

	// Warns once for a consumer's cell that is not editable: the initial value
	// here, and each later value in the transition effect below.
	const warnedRef = useRef(false)

	const warnUneditable = useCallback(() => {
		if (process.env.NODE_ENV === 'production' || warnedRef.current) return

		warnedRef.current = true

		console.warn(UNEDITABLE_CELL_WARNING)
	}, [])

	useEffect(() => {
		if (initial.uneditable) warnUneditable()
	}, [initial.uneditable, warnUneditable])

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
			const current = activeEditRef.current

			const request = requestRef.current ?? {
				to: current,
				endRows: new Set(),
				discard: null,
				blur: false,
			}

			request.to = next

			// An exit reseats focus, as `endSession` does at event time uncontrolled.
			// A commit on leave does not, because focus already went elsewhere.
			if (exit) request.endRows.add(exit.rowKey)

			if (exit?.reseat) request.blur = true

			if (exit?.discard) request.discard = current

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
			if (here || isPending(rowKey, columnId)) return

			pendingFocusRef.current = { rowKey, columnId }

			pendingSeedRef.current = { rowKey, columnId, value: seed }

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
		[bump, cellScoped, controlled, isPending, setEditableRows, writeActiveCell],
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
			if (reseatFocus) reseat()

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
		[controlled, requestCell, discardDrafts, setEditableRows, writeActiveCell, reseat],
	)

	// The session's own exit, from its keys, its settle controls, and a slot's
	// `commit`. Each reseats focus on the tab stop.
	const endSession = useCallback(
		(rowKey: string | number, outcome: 'save' | 'discard') => exitSession(rowKey, outcome, true),
		[exitSession],
	)

	// Acts on each new value of a controlled `cell`, whether the grid asked
	// for it or the consumer set it. It runs as a layout effect, so the editor the
	// value names is open before paint.
	//
	// - A value equal to the settled one moves nothing. A request that did not
	//   land was declined, so its intents drop.
	// - A value the grid asked for keeps the intents of its entry, and carries out
	//   the exits and the discard recorded with it.
	// - Any other value is a set from outside. Focus follows it into the grid only
	//   when focus is already there (WCAG 3.2.1).
	//
	// The rows follow the rules of a grid entry. The new cell's row opens, and a
	// row the session acquired closes as the session leaves it. `null` closes
	// the held row, as a save does.
	const applyTransition = useCallback(
		(raw: GridActiveEdit | null, from: SettledCell, request: CellRequest | null) => {
			const rows = editableRowsRef.current

			const plan = planTransition({
				from,
				raw,
				request,
				rows,
				sessionRow: sessionRowRef.current,
				source: editSourceRef.current,
			})

			if (raw !== null && plan.next === null) warnUneditable()

			setSettled(settleOn(plan, raw, readSettled(from, rows)))

			settleFocus(plan, request?.blur === true)

			if (plan.discard) unstageDraft(plan.discard.rowKey, plan.discard.columnId)

			// A waiting value keeps the session row until its row opens. An exit on
			// the way still takes the row that it closes.
			const sessionRow = sessionRowRef.current

			if (!plan.opens) sessionRowRef.current = plan.sessionRow
			else if (sessionRow && plan.endRows.has(sessionRow.rowKey)) sessionRowRef.current = null

			writeRowsPlan(plan, setEditableRows, gridClosedRef.current)

			// The render held the settled cell while this value waited for its row. A
			// render must follow, even where the consumer declines the rows write.
			if (raw === null || !rows.has(raw.rowKey)) bump()

			awaitRowRef.current = plan.opens
		},
		[setSettled, editSourceRef, warnUneditable, settleFocus, unstageDraft, setEditableRows, bump],
	)

	// Lands a settled value that waits for its row, once that row is open. The
	// session then holds the new cell and the session row that it planned.
	const landWait = useCallback(
		(current: SettledCell): SettledCell => {
			const wait = current.wait

			if (!wait || !editableRowsRef.current.has(wait.cell.rowKey)) return current

			sessionRowRef.current = wait.sessionRow

			const landed = { raw: current.raw, cell: wait.cell }

			setSettled(landed)

			return landed
		},
		[setSettled],
	)

	// Settles an uncontrolled binding: the entry the last event recorded, and the
	// settled value that a switch to a controlled binding starts from.
	const settleUncontrolled = useCallback(
		(raw: GridActiveEdit | null) => {
			if (entry === null) return

			setEntry(null)

			// The render read a declined entry as the cell it left. Write the
			// state back to that cell, and report it, as the entry was reported.
			if (sameCell(raw, entry.to) && sameCell(activeEditRef.current, entry.from)) {
				sessionRowRef.current = entry.sessionRow

				setActiveCellValue(entry.from)
			}
		},
		[entry, setActiveCellValue],
	)

	// The cell that an uncontrolled binding held at its last commit, for a
	// switch to a controlled binding. A ref, not the settled state: the render
	// reads the settled value only while controlled, so a write on each move
	// would render the host once more for nothing.
	// Only an uncontrolled commit writes it, and a switch always follows one.
	const uncontrolledRef = useRef<GridActiveEdit | null>(activeEdit)

	const wasControlledRef = useRef(controlled)

	const settleBinding = useCallback(
		(raw: GridActiveEdit | null) => {
			const request = requestRef.current

			requestRef.current = null

			const switched = controlled && !wasControlledRef.current

			wasControlledRef.current = controlled

			if (!controlled) {
				settleUncontrolled(raw)

				uncontrolledRef.current = activeEditRef.current

				return
			}

			// A switch to a controlled binding starts from the cell that the
			// uncontrolled binding held.
			const held = uncontrolledRef.current

			const base = switched && !settledAt(settled, held) ? { raw: held, cell: held } : settled

			if (base !== settled) setSettled(base)

			const from = landWait(base)

			// An equal value moves nothing. A request that did not land was declined.
			if (!sameCell(raw, from.raw)) applyTransition(raw, from, request)
			else if (request) dropIntents()
		},
		[controlled, settled, setSettled, settleUncontrolled, applyTransition, dropIntents, landWait],
	)

	// Settle the binding after each commit. It acts on a moved value, on a request,
	// whose render `bump` forces, so a declined move drops its intents, and on a
	// waiting value whose row has opened. With none of those, it changes nothing.
	useLayoutEffect(() => settleBinding(raw))

	// The session one key press names. The press names its row when it came from
	// inside one, which is what picks the right row while several edit at once.
	// Elsewhere in the grid — the tab stop after a Tab back, a header control —
	// it names none, and the session the grid opened is the one it means. The
	// column comes from the press's cell, and only an open editor's cell names
	// one. Escape reads the row alone; Enter needs the editor.
	const sessionTarget = useCallback(
		(target: Element): { rowKey: string | number; columnId: string | number | null } | null => {
			const rowIndex = target.closest('tr[data-row-index]')?.getAttribute('data-row-index')

			const rowKey =
				rowIndex === null || rowIndex === undefined
					? sessionRowRef.current?.rowKey
					: rowKeysRef.current[Number(rowIndex)]

			if (rowKey == null || !editableRowsRef.current.has(rowKey)) return null

			const colAttr = target.closest('td[data-grid-col]')?.getAttribute('data-grid-col')

			const col = dataColumnsRef.current.find((candidate) => String(candidate.id) === colAttr)

			const open =
				col !== undefined &&
				isColumnEditable(col) &&
				isCellEditing({
					rowKey,
					columnId: col.id,
					editableRows: editableRowsRef.current,
					activeEdit: activeEditRef.current,
				})

			return { rowKey, columnId: open ? col.id : null }
		},
		[rowKeysRef, dataColumnsRef],
	)

	// Enter commits the session and moves the cursor down one row. Under cell
	// scope it enters the next row's cell, which is the column-wise fill flow of a
	// spreadsheet. On the last row the cursor stays, and focus rests on the tab
	// stop. The exit and the entry are two writes, so a controlled binding can
	// decline the entry and keep the commit.
	const commitDown = useCallback(
		(rowKey: string | number, columnId: string | number) => {
			const rowKeys = rowKeysRef.current

			const { row, col } = coordOf(rowKeys, dataColumnsRef.current, { rowKey, columnId })

			endSession(rowKey, 'save')

			const next = rowKeys[row + 1]

			moveTo({ row: next === undefined ? row : row + 1, col })

			if (cellScoped && next !== undefined) enterEdit(next, columnId)
		},
		[cellScoped, endSession, enterEdit, moveTo, rowKeysRef, dataColumnsRef],
	)

	// F2 commits the session and leaves the cursor on the cell, with focus back on
	// the tab stop. It toggles edit off, as F2 on the tab stop toggles it on.
	const commitHere = useCallback(
		(rowKey: string | number, columnId: string | number) => {
			const coord = coordOf(rowKeysRef.current, dataColumnsRef.current, { rowKey, columnId })

			endSession(rowKey, 'save')

			moveTo(coord)
		},
		[endSession, moveTo, rowKeysRef, dataColumnsRef],
	)

	// Tab and Shift+Tab move along the row's editable columns, and wrap at the
	// edges. Under cell scope the move re-points the session, so the cell it
	// leaves commits. Under row scope every editor of the row is open, so focus
	// moves and the row commits when it closes. A row with one editable column
	// has nowhere to go, so the key commits there, as F2 does.
	const commitAlong = useCallback(
		(rowKey: string | number, columnId: string | number, step: 1 | -1) => {
			const columns = dataColumnsRef.current

			const { row, col } = coordOf(rowKeysRef.current, columns, { rowKey, columnId })

			// A cell whose commit is in flight cannot open, so the move steps past it.
			const next = stepEditableColumn(columns, col, step, (index) =>
				isPending(rowKey, columns[index]?.id ?? ''),
			)

			const target = columns[next]

			if (next === col || !target) {
				commitHere(rowKey, columnId)

				return
			}

			moveTo({ row, col: next })

			if (!cellScoped) {
				const editor = document
					.getElementById(cellId(row, next))
					?.querySelector<HTMLElement>(EDITOR_FOCUSABLE)

				if (editor) focusWithoutReveal(editor)

				return
			}

			// Blur the editor while it is still mounted, so a value it stages on blur
			// reaches the draft before the sweep commits the cell. A controlled
			// binding can decline the move, so the request marks the blur, and the
			// transition effect does it once the move lands.
			if (!controlled) reseat()

			enterEdit(rowKey, target.id)

			if (requestRef.current) requestRef.current.blur = true
		},
		[
			cellScoped,
			controlled,
			cellId,
			commitHere,
			isPending,
			enterEdit,
			moveTo,
			rowKeysRef,
			dataColumnsRef,
			reseat,
		],
	)

	// Runs the move a key asked of the session from an open editor.
	const runMove = useCallback(
		(move: SessionMove, rowKey: string | number, columnId: string | number) => {
			if (move === 'down') commitDown(rowKey, columnId)
			else if (move === 'here') commitHere(rowKey, columnId)
			else commitAlong(rowKey, columnId, move === 'previous' ? -1 : 1)
		},
		[commitDown, commitAlong, commitHere],
	)

	const { keys: newRowKeys } = newRow

	// Escape anywhere in an editing grid abandons its session, so it never reads
	// as dead while a draft stands. The move keys act only from an open editor
	// (see `editorMove`). Every key stands down while the press belongs to a
	// floating surface (see `claimedBySurface`) or to an input method. The first
	// press closes that surface, and the next reaches the session.
	const sessionKeys = useCallback(
		(event: ReactKeyboardEvent<HTMLTableElement>) => {
			// The new-row slot keeps its own keys, and no data session reads them.
			if (claimedBySurface(event) || readKeyPress(event).composing || newRowKeys(event)) return

			const target = event.target as Element

			const move = event.key === 'Escape' ? 'abandon' : editorMove(event)

			const session = move === null ? null : sessionTarget(target)

			if (move === null || session === null) return

			if (move === 'abandon') {
				event.preventDefault()

				endSession(session.rowKey, 'discard')

				return
			}

			if (session.columnId === null) return

			event.preventDefault()

			runMove(move, session.rowKey, session.columnId)
		},
		[endSession, sessionTarget, runMove, newRowKeys],
	)

	// The row a focus move out of `from` would commit: the editing row that
	// `from` sits in, else the row the grid-owned session holds. A move from a
	// row that is not editing, or from a surface outside the table's DOM, names
	// the held row.
	const leaveRow = useCallback(
		(from: Element, grid: HTMLElement): string | number | null => {
			const hit = grid.contains(from) ? sessionTarget(from) : null

			if (hit) return hit.rowKey

			const held = sessionRowRef.current?.rowKey

			return held != null && editableRowsRef.current.has(held) ? held : null
		},
		[sessionTarget],
	)

	// A focus move out of the table's DOM, while its focus event is due.
	const pendingLeaveRef = useRef<PendingLeave | null>(null)

	// Settles a pending leave once its focus event has run. A surface that the
	// grid renders owns the move, and the session stays. Anything else leaves.
	const settleLeave = useCallback(
		(pending: PendingLeave) => {
			if (pendingLeaveRef.current !== pending) return

			pendingLeaveRef.current = null

			if (!pending.owned) exitSession(pending.rowKey, 'save', false)
		},
		[exitSession],
	)

	// Commits the session when focus leaves what `commitOn` watches (see
	// `readLeave`). The commit is the commit of Enter, without the cursor move
	// and without the focus reseat: focus stays where the user sent it. The
	// grid's own reseat is not a leave. Under `'leaveEditor'`, the editors of the
	// row are the open editors of the committed row, which is only the held
	// cell under cell scope. The settle controls sit in that cell.
	//
	// A move to an element outside the table's DOM waits for its `focusin`. The
	// browser fires `focusin` in the same task, after this `focusout`. React
	// gives it to the table's `onFocus` from its own listener on the root or on
	// the portal container, below the document. A one-time `focusin` listener
	// on the document therefore runs after that `onFocus`, and settles the move.
	// A microtask is not reliable. After a click, the browser runs microtasks
	// between the two events.
	const sessionLeave = useCallback(
		(event: ReactFocusEvent<HTMLTableElement>) => {
			if (reseatingRef.current || commitOn === 'explicit') return

			const from = event.target

			const grid = event.currentTarget

			const rowKey = leaveRow(from, grid)

			if (rowKey === null) return

			const inEditors = (node: Element) => {
				const hit = isInGrid(node, grid) ? sessionTarget(node) : null

				return hit !== null && hit.rowKey === rowKey && hit.columnId !== null
			}

			const next = event.relatedTarget instanceof Element ? event.relatedTarget : null

			const verdict = readLeave({ commitOn, grid, from, next, inEditors })

			if (verdict === 'leave') exitSession(rowKey, 'save', false)

			if (verdict !== 'ask' || next === null) return

			const pending: PendingLeave = { next, rowKey, owned: false }

			pendingLeaveRef.current = pending

			document.addEventListener('focusin', () => settleLeave(pending), { once: true })
		},
		[commitOn, leaveRow, sessionTarget, exitSession, settleLeave],
	)

	// Marks a pending leave as owned when its focus event reaches the table
	// through the React tree. Only a surface that the grid renders does that.
	const sessionFocus = useCallback((event: ReactFocusEvent<HTMLTableElement>) => {
		const pending = pendingLeaveRef.current

		if (pending && event.target === pending.next) pending.owned = true
	}, [])

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

	// Whether the grid is mounted. A commit that settles after the unmount
	// changes nothing and announces nothing.
	const mountedRef = useMountedRef()

	// The refused rows that a settle asked `rows` to open again. `rerender` forces
	// the render that tells an applied write from a declined one.
	const awaitingReopenRef = useRef(new Set<string | number>())

	const rerender = useForceRender()

	// A controlled `rows` that declines to open a refused row again chose to
	// close it, so the refused drafts of that row drop. Without this, they
	// would commit again at the next sweep of an unrelated transition.
	useEffect(() => {
		const awaiting = awaitingReopenRef.current

		if (awaiting.size === 0) return

		const declined = new Set([...awaiting].filter((row) => !editableRows.has(row)))

		awaiting.clear()

		if (declined.size === 0) return

		// An add settles the new-row slot, and never a batch, so the slot test never
		// fails. It narrows the key to a data row key for `declined`.
		const dropped = drafts.drop(
			(rowKey, _, draft) =>
				rowKey !== NEW_ROW_KEY && declined.has(rowKey) && draft.error !== undefined,
		)

		// A dropped draft can change what a cell shows, so the cells read again.
		if (dropped > 0) {
			activeEditStore.notify()

			announce(describeDiscard(dropped))
		}
	})

	// Settles one async batch. An accepted draft leaves the store, and the cell
	// reads the row again. A refused draft is staged again, with its error, and
	// focus stays where it is. Under row scope the refused row opens again.
	// Under cell scope a refused cell opens beside the session, unless the
	// session holds it. One polite announcement speaks the batch.
	const settleBatch = useCallback(
		(batch: InFlightBatch, refused: Map<string | number, string>) => {
			const { rowKey } = batch

			// A cell-scoped session holds one cell, so a refused cell opens beside
			// it. A cell that the session holds already needs no mark.
			const reopen = (columnId: string | number) =>
				cellScoped &&
				!isCellEditing({
					rowKey,
					columnId,
					editableRows: editableRowsRef.current,
					activeEdit: activeEditRef.current,
				})

			const { saved, failed, accepted } = settleDrafts({ batch, refused, drafts, reopen })

			if (saved.length + failed.length === 0) return

			activeEditStore.notify()

			// An accepted save goes into the history. An undo or a redo moved its
			// entry when it was sent, so a refused cell goes back.
			if (batch.outcome === 'undone' || batch.outcome === 'redone') {
				restoreStep(
					batch.outcome === 'undone' ? 'undo' : 'redo',
					batch.history.filter((cell) => refused.has(cell.columnId)),
				)
			} else {
				recordEntry(batch.history.filter((cell) => accepted.has(cell.columnId)))
			}

			if (failed.length > 0 && !cellScoped && !editableRowsRef.current.has(rowKey)) {
				awaitingReopenRef.current.add(rowKey)

				setEditableRows((prev) => new Set(prev ?? EMPTY_SET).add(rowKey))

				// A render must follow even when a controlled `rows` declines the
				// write, so the check below sees the decline.
				rerender()
			}

			announce(describeSettle(saved, failed, batch.row, batch.outcome))
		},
		[cellScoped, drafts, activeEditStore, setEditableRows, recordEntry, restoreStep, rerender],
	)

	// Puts the drafts of an async batch back as pending, and settles them when
	// the promise does. A rejection refuses the whole batch. A refusal counts
	// only for a draft of the batch, on the row of the batch.
	const trackBatch = useCallback(
		(batch: InFlightBatch) => {
			for (const [columnId, draft] of batch.drafts) drafts.pend(batch.rowKey, columnId, draft)

			activeEditStore.notify()

			const takes = (refusal: { rowKey?: string | number; columnId: string | number }) =>
				refusal.rowKey === batch.rowKey && batch.drafts.has(refusal.columnId)

			trackSink(batch.result, mountedRef, (outcome) =>
				settleBatch(batch, readRefusals(outcome, batch.drafts.keys(), takes)),
			)
		},
		[drafts, activeEditStore, settleBatch, mountedRef],
	)

	// Read by the sweep, so a new callback does not run the sweep again.
	const trackInFlight = useEffectEvent((batch: InFlightBatch) => trackBatch(batch))

	// Commit the cells that the session closed in the render just past. The
	// drafts belong to the session, and this is where they land in the sink. The
	// open state answers it on its own, so no copy of the last render is kept to
	// diff against.
	useEffect(() => {
		const source = editSourceRef.current

		// One lookup serves the sweep, so no row is found by a second scan.
		const rowOf = rowLookup(source)

		const dropped = dropStrandedHolds({
			drafts,
			before: sweptRef.current.rows,
			after: editableRows,
			gridClosed: gridClosedRef.current,
			rowOf,
		})

		// A dropped draft can change what a cell shows, so the cells read again.
		if (dropped > 0) {
			activeEditStore.notify()

			announce(describeDiscard(dropped))
		}

		sweptRef.current = { rows: editableRows, cell: activeEdit }

		const { saved, inFlight } = flushClosedCells({
			drafts,
			editableRows,
			activeEdit,
			source,
			rowOf,
			onCommit: hasCommit ? sendCommit : undefined,
			onReject: sendReject,
		})

		// Announce the commit politely, without moving focus (WCAG 4.1.3). An
		// async batch announces as it settles.
		if (saved.columns.length > 0) announce(describeCommit(saved.columns, saved.row))

		// One sweep is one user action, so its cells are one entry. An async
		// batch goes into the history as it settles.
		recordEntry(saved.history)

		for (const batch of inFlight) trackInFlight(batch)
	}, [
		drafts,
		editableRows,
		activeEdit,
		editSourceRef,
		activeEditStore,
		recordEntry,
		hasCommit,
		sendCommit,
		sendReject,
	])

	// Sends a batch of changes that no session staged through the sink, and
	// announces and tracks it as the commit sweep does. `rowOf` reads the live
	// rows, so a caller that already indexed them passes its own. A write that
	// no history value came from, such as a paste, passes `write`: its cells go
	// through the checks of a save, and its refusals, with the ones the caller
	// found, go to `onReject` in one call. Its saved cells are one entry in the
	// history. The announcement also counts the cells that the write skipped. A
	// history step passes its cells as `history`, so a refused batch puts them
	// back.
	const submitCells = useCallback(
		(
			changes: readonly GridCellChange[],
			outcome: GridSaveOutcome,
			rowOf: (rowKey: string | number) => T | undefined,
			write?: { refused: readonly GridCellChange[]; skipped: number },
			history: readonly GridHistoryCell[] = [],
		) => {
			const { saved, inFlight, refused } = sendCells({
				changes,
				outcome,
				source: editSourceRef.current,
				rowOf,
				onCommit: hasCommit ? sendCommit : undefined,
				check: write !== undefined,
				history,
			})

			const rejected = write ? [...write.refused, ...refused] : refused

			if (rejected.length > 0) sendReject(rejected)

			recordEntry(saved.history)

			const message = describeWrite(
				saved.columns,
				saved.row,
				outcome,
				(write?.skipped ?? 0) + rejected.length,
			)

			if (message) announce(message)

			for (const batch of inFlight) trackBatch(batch)
		},
		[editSourceRef, hasCommit, sendCommit, sendReject, recordEntry, trackBatch],
	)

	// Writes the text of a paste into its cells, as one save. A cell that its
	// column cannot edit, that has no `field`, or that holds a draft is
	// skipped. A text that does not fit its cell is refused.
	const pasteCells = useCallback(
		(cells: readonly GridPasteCell[]) => {
			const source = editSourceRef.current

			const rowOf = rowLookup(source)

			const changes: GridCellChange[] = []

			const refused: GridCellChange[] = []

			let skipped = 0

			for (const cell of cells) {
				const drafted = drafts.read(cell.rowKey, cell.columnId) !== undefined

				const paste = drafted ? null : pasteChange(source, rowOf, cell)

				if (!paste) skipped++
				else if (paste.fits) changes.push(paste.change)
				else refused.push(paste.change)
			}

			submitCells(changes, 'pasted', rowOf, { refused, skipped })
		},
		[editSourceRef, drafts, submitCells],
	)

	// Writes the values of a fill into their cells, as one save. A fill skips
	// the cells that a paste skips.
	const fillCells = useCallback(
		(cells: readonly GridFillCell[]) => {
			const source = editSourceRef.current

			const rowOf = rowLookup(source)

			const changes: GridCellChange[] = []

			let skipped = 0

			for (const cell of cells) {
				const drafted = drafts.read(cell.rowKey, cell.columnId) !== undefined

				if (drafted || !writeTarget(source, rowOf, cell)) skipped++
				else changes.push(cell)
			}

			submitCells(changes, 'filled', rowOf, { refused: [], skipped })
		},
		[editSourceRef, drafts, submitCells],
	)

	// Moves the cursor to a cell that a history step wrote, when the grid shows
	// its row and its column.
	const moveToCell = useCallback(
		(cell: GridHistoryCell | undefined) => {
			if (!cell) return

			const coord = coordOf(rowKeysRef.current, dataColumnsRef.current, cell)

			if (coord.row !== -1 && coord.col !== -1) moveTo(coord)
		},
		[rowKeysRef, dataColumnsRef, moveTo],
	)

	// Takes one step through the history, and returns whether it wrote a cell.
	// The step sends the values that it writes through `onCommit`, as a save
	// does, so the consumer applies it as it applies a save. From a key, the
	// cursor moves to the first cell that the step writes, when the grid shows
	// its row and its column. With the history off, nothing happens.
	const stepHistory = useCallback(
		(step: GridHistoryStep, moveCursor: boolean): boolean => {
			if (!history.on) return false

			const source = editSourceRef.current

			const rowOf = rowLookup(source)

			const result = takeStep(step, {
				current: (cell) => readHistoryCell(source, rowOf, cell),
				drafted: (cell) => drafts.read(cell.rowKey, cell.columnId) !== undefined,
			})

			if (result.status !== 'applied') {
				announce(describeHistoryMiss(step, result.status))

				return false
			}

			const { cells } = result

			const changes = cells.map((cell) => ({
				rowKey: cell.rowKey,
				columnId: cell.columnId,
				value: historyValue(cell, step),
			}))

			submitCells(changes, historyOutcome(step), rowOf, undefined, cells)

			if (moveCursor) moveToCell(cells[0])

			return true
		},
		[history.on, editSourceRef, takeStep, drafts, submitCells, moveToCell],
	)

	// The step of the grid's `ref` handle. Focus is on the control that sent it,
	// so the cursor stays where it is.
	const stepFromHandle = useCallback(
		(step: GridHistoryStep) => stepHistory(step, false),
		[stepHistory],
	)

	// The history keys act on the tab stop only. In an open editor, the input
	// keeps Ctrl+Z for its own text. The keys are absent while the history is off.
	const historyKeys = useMemo(() => {
		if (!history.on) return undefined

		return (event: ReactKeyboardEvent<HTMLTableElement>) => {
			if (event.target !== event.currentTarget || event.defaultPrevented) return

			const step = historyStep({ ...readKeyPress(event), shiftKey: event.shiftKey })

			if (step === null) return

			event.preventDefault()

			stepHistory(step, true)
		}
	}, [history.on, stepHistory])

	const session = useMemo<GridEditingSession>(
		() => ({
			activeEditStore,
			stageDraft,
			unstageDraft,
			readDraft,
			endSession,
			entrySeed,
			claimFocus,
			settleControls,
			resumeCell,
			managed,
		}),
		[
			activeEditStore,
			stageDraft,
			unstageDraft,
			readDraft,
			managed,
			endSession,
			entrySeed,
			claimFocus,
			settleControls,
			resumeCell,
		],
	)

	return {
		session,
		enterEdit,
		sessionKeys: managed ? sessionKeys : undefined,
		historyKeys,
		stepHistory: stepFromHandle,
		pasteCells: managed ? pasteCells : undefined,
		fillCells: managed ? fillCells : undefined,
		sessionLeave: commitOn === 'explicit' ? undefined : { blur: sessionLeave, focus: sessionFocus },
		newRow: {
			position: newRowPosition,
			session: newRow.session,
			enter: newRow.enter,
			editorKind: newRow.editorKind,
		},
	}
}
