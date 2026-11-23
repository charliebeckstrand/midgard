'use client'

import {
	type KeyboardEvent as ReactKeyboardEvent,
	type RefObject,
	useCallback,
	useMemo,
	useReducer,
	useRef,
	useState,
} from 'react'
import { announce } from '../../core/announcer'
import { useDevWarning } from '../../hooks/use-dev-warning'
import { useMountedRef } from '../../hooks/use-mounted-ref'
import { useStableEvent } from '../../hooks/use-stable-event'
import { useIntl } from '../../primitives/intl/use-intl'
import { hasBrowserModifier } from '../../utilities/modifier-keys'
import type { GridNewRowSession } from './context'
import { describeRowAdd } from './engine/grid-announcements'
import { GRID_ROLE } from './engine/grid-constants'
import {
	collectNewRow,
	EDITOR_FOCUSABLE,
	type EditorKind,
	findColumn,
	type GridDraftStore,
	inferEditorKind,
	inGrid,
	isColumnEditable,
	isThenable,
	NATIVE_ENTER,
	NEW_ROW_KEY,
	readRefusals,
	type SinkOutcome,
	trackSink,
} from './engine/grid-edit/utilities'
import {
	findSlotColumn,
	firstRefused,
	type GridRowAddResult,
	type GridRowAddSettled,
	type NewRowFlight,
	refuseNewRow,
	restoreRefused,
	stageEmptyRefusals,
} from './engine/grid-new-row'
import type { GridEditSource } from './grid-data-types'
import type { GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'
import { type Coord, type GridNewRowPosition, NEW_ROW_INDEX } from './use-grid-navigation'

/** The warning for a slot under a session that the consumer owns. @internal */
const MANUAL_NEW_ROW_WARNING =
	"Grid: `editable.newRow` adds a row through the keys of a session that the grid owns, but `editable.session` is 'manual'. The grid renders no new row. Set `session: 'managed'` to show it."

/** The warning for a slot with no sink to take its row. @internal */
const SINKLESS_NEW_ROW_WARNING =
	'Grid: `editable.newRow` needs `editable.onRowAdd` to take the row. The grid renders no new row. Pass `onRowAdd` to show it.'

/**
 * Owns the new-row slot of an editable grid ({@link GridEditableConfig.newRow}).
 * The slot is not a data row. Its drafts live in the session's draft store
 * under the reserved key {@link NEW_ROW_KEY}, which no data row has, and the
 * commit sweep never takes them. They leave the store through an add, or an
 * Escape.
 *
 * The editors of the slot are always mounted. They sit outside the `rows` and
 * `cell` bindings, because those are keyed by the consumer's row keys, and the
 * slot has none. A focus move that leaves the slot therefore never adds it: an
 * add is always explicit.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridNewRow<T>({
	config,
	managed,
	position,
	drafts,
	editSource,
	editSourceRef,
	cursorColumnsRef,
	tableRef,
	reseat,
	cellId,
	moveTo,
	seatNewRow,
}: {
	config: GridEditableConfig | undefined
	managed: boolean
	/** Where the slot shows, from {@link resolveNewRow}. */
	position: GridNewRowPosition
	drafts: GridDraftStore
	/**
	 * The grid's own rows and columns in this render. A column's editor kind
	 * reads a sample row, and a cell of the slot asks for it during render.
	 */
	editSource: GridEditSource<T>
	/** The grid's own rows and columns, which the add and its refusals read at event time. */
	editSourceRef: RefObject<GridEditSource<T>>
	/** The columns of the cursor: the visible columns, in display order. */
	cursorColumnsRef: RefObject<GridColumn<T>[]>
	/** The grid `<table>`, the tab stop. */
	tableRef: RefObject<HTMLTableElement | null>
	/** Reseats focus on the tab stop, marked as the grid's own move. */
	reseat: () => void
	cellId: (row: number, col: number) => string
	moveTo: (coord: Coord) => void
	/** The cursor's guarded seat on a column of the slot, for a press on a cell of the slot. */
	seatNewRow: (col: number) => void
}): {
	/** The slot as its cells read it, or `null` when the grid shows none. */
	session: GridNewRowSession | null
	/**
	 * Handles a key press from inside the slot, and returns `true` when the
	 * press came from there. The session keys of the data rows then leave it.
	 */
	keys: (event: ReactKeyboardEvent<HTMLTableElement>) => boolean
	/**
	 * Opens a cell of the slot from the keyboard cursor. Its editor takes focus.
	 * A `seed` replaces the cell's value, as a type-to-edit entry does.
	 */
	enter: (columnId: string | number, seed?: string | number) => void
	/** The editor that the grid infers for a column of the slot. */
	editorKind: (column: { id: string | number; field?: PropertyKey }) => EditorKind
	/**
	 * Adds the values that the slot holds, as Enter does, and gives what became
	 * of the add. A `quiet` add keeps focus and speaks nothing. A paste adds
	 * each of its new rows through it.
	 */
	submitRow: (quiet: boolean) => GridRowAddResult
	/** Whether the slot holds a value of the user, or an add in flight. A paste does not overwrite it. */
	holdsEntry: () => boolean
	/**
	 * Puts values in the slot in place of what it holds, each by its column id,
	 * and mounts the editors again to show them. A paste puts each of its new
	 * rows there before it adds the row.
	 */
	stageRow: (entries: readonly (readonly [string | number, unknown])[]) => void
} {
	const intl = useIntl()

	// A slot that the config cannot show renders nothing, so the setting fails
	// silently. The warnings tell the developer.
	const requested = config?.newRow != null

	useDevWarning(requested && !managed, MANUAL_NEW_ROW_WARNING)

	useDevWarning(requested && config?.onRowAdd == null, SINKLESS_NEW_ROW_WARNING)

	// Raised to mount the slot's editors again, so each reads the store.
	const [generation, remount] = useReducer((count: number) => count + 1, 0)

	const [inFlight, setInFlight] = useState(false)

	const flightRef = useRef<NewRowFlight | null>(null)

	// The column whose editor takes focus as it mounts.
	const focusRef = useRef<string | number | null>(null)

	const mountedRef = useMountedRef()

	const claimFocus = useCallback((columnId: string | number) => {
		if (focusRef.current === null || focusRef.current !== columnId) return false

		focusRef.current = null

		return true
	}, [])

	// The first editable column in display order, where an accepted add puts focus.
	const firstEditable = useCallback(
		() => cursorColumnsRef.current.find((column) => isColumnEditable(column))?.id ?? null,
		[cursorColumnsRef],
	)

	// Whether a column of the slot is open to an edit. A refusal can name only such a column.
	const editableColumn = useCallback(
		(columnId: string | number) =>
			editSourceRef.current.columns.some(
				(column) => column.id === columnId && isColumnEditable(column),
			),
		[editSourceRef],
	)

	const { rows: sourceRows } = editSource

	// The slot holds no value of its own, so the inferred editor reads the
	// first source row with a value in the column. With none, it is a text editor.
	// A cell of the slot calls it during render, so it reads the rows of the
	// render and not the ref.
	const editorKind = useCallback(
		(column: { id: string | number; field?: PropertyKey }) => {
			const field = column.field as keyof T | undefined

			if (field == null) return inferEditorKind(undefined)

			const sample = sourceRows.find((row) => row[field] != null)

			return inferEditorKind(sample?.[field])
		},
		[sourceRows],
	)

	// Moves the keyboard cursor onto a cell of the slot.
	const seatCursor = useCallback(
		(columnId: string | number) => {
			const col = cursorColumnsRef.current.findIndex((column) => column.id === columnId)

			moveTo({ row: NEW_ROW_INDEX, col: Math.max(col, 0) })
		},
		[cursorColumnsRef, moveTo],
	)

	// The mounted editor of a cell of the slot, in this grid.
	const findEditor = useCallback(
		(columnId: string | number) => {
			const table = tableRef.current

			if (!table) return null

			for (const cell of table.querySelectorAll<HTMLElement>('td[data-grid-new-col]')) {
				if (cell.closest(GRID_ROLE) !== table) continue

				if (cell.getAttribute('data-grid-new-col') === String(columnId))
					return cell.querySelector<HTMLElement>(EDITOR_FOCUSABLE)
			}

			return null
		},
		[tableRef],
	)

	// Clears the slot after an accepted add. Focus goes to its first editable
	// cell when `focus` asks for it. A paste speaks once for all of its rows, so
	// its adds are `quiet`.
	const accept = useCallback(
		(focus: boolean, quiet = false) => {
			if (focus) {
				reseat()

				focusRef.current = firstEditable()
			}

			drafts.unstageRow(NEW_ROW_KEY)

			remount()

			if (!quiet) announce(describeRowAdd(intl, 0))
		},
		[drafts, firstEditable, reseat, intl],
	)

	// Settles an async add. An accepted add clears the slot. A refused one
	// stages its values again, with the errors. Focus goes to the first refused
	// cell when focus is still in the grid. A refusal names a cell of the slot
	// by its column, so its row is ignored.
	const settle = useCallback(
		(flight: NewRowFlight, outcome: SinkOutcome) => {
			if (flightRef.current !== flight) return

			flightRef.current = null

			setInFlight(false)

			const refused = readRefusals(
				outcome,
				flight.cells.map(([columnId]) => columnId),
				(refusal) => editableColumn(refusal.columnId),
			)

			if (refused.size === 0) {
				for (const [columnId, draft] of flight.cells)
					drafts.settle(NEW_ROW_KEY, columnId, draft, null)

				accept(!flight.quiet && inGrid(document.activeElement, tableRef.current), flight.quiet)

				flight.done?.('added')

				return
			}

			restoreRefused(drafts, flight, refused)

			if (inGrid(document.activeElement, tableRef.current))
				focusRef.current = firstRefused(cursorColumnsRef.current, refused)

			remount()

			if (!flight.quiet) announce(describeRowAdd(intl, refused.size))

			flight.done?.('refused')
		},
		[drafts, editableColumn, accept, tableRef, cursorColumnsRef, intl],
	)

	// Adds the row, and gives what became of it: `added`, `empty` for a row
	// with no value, `refused`, or `busy` while an add is in flight. An async
	// add gives a promise of the settled result. The checks run before the add
	// starts, so a row that `validate` refuses never goes pending. A row with
	// no value that passes the checks adds nothing. A refusal blocks the add:
	// the editors mount again with the errors, also an error that reads
	// another cell, or that a required cell with no value carries. Focus goes
	// to the first refused cell, with no scroll. A second add waits while one
	// is in flight. It reads the newest position and `onRowAdd`. A `quiet` add,
	// one row of a paste, keeps focus where it is and speaks nothing, because
	// the paste speaks once for all of its rows.
	const submitRow = useStableEvent((quiet: boolean): GridRowAddResult => {
		if (position === null || flightRef.current !== null) return 'busy'

		const row = drafts.readRow(NEW_ROW_KEY)

		const { columns } = editSourceRef.current

		const { values, cells } = collectNewRow(row, columns)

		// The checks run on an empty row too, so a required cell shows why the
		// row adds nothing.
		const refused = refuseNewRow(row, columns, values)

		if (refused.size > 0) {
			stageEmptyRefusals(drafts, refused, new Set(cells.map(({ column }) => column.id)))

			focusRef.current = firstRefused(cursorColumnsRef.current, refused)

			remount()

			if (!quiet) announce(describeRowAdd(intl, refused.size))

			return 'refused'
		}

		if (cells.length === 0) return 'empty'

		const result = config?.onRowAdd?.(values)

		if (!isThenable(result)) {
			accept(!quiet, quiet)

			return 'added'
		}

		// The editors turn inert while the add is in flight, so focus moves to
		// the tab stop first rather than drop to the page.
		reseat()

		const flight: NewRowFlight = {
			cells: cells.map(({ column, draft }) => [column.id, draft]),
			quiet,
		}

		const settled = new Promise<GridRowAddSettled>((resolve) => {
			flight.done = resolve
		})

		for (const [columnId, draft] of flight.cells) drafts.pend(NEW_ROW_KEY, columnId, draft)

		flightRef.current = flight

		setInFlight(true)

		trackSink(result, mountedRef, (outcome) => settle(flight, outcome))

		return settled
	})

	const addRow = useCallback(() => {
		void submitRow(false)
	}, [submitRow])

	const enter = useCallback(
		(columnId: string | number, seed?: string | number) => {
			if (flightRef.current !== null) return

			const column = findColumn(cursorColumnsRef.current, columnId)

			if (!column || !isColumnEditable(column)) return

			if (seed === undefined) {
				const editor = findEditor(columnId)

				editor?.focus()

				return
			}

			// A typed entry replaces the value. The editor mounts again to show it,
			// and takes focus as it mounts.
			drafts.stage(NEW_ROW_KEY, columnId, seed, null)

			focusRef.current = columnId

			remount()
		},
		[drafts, cursorColumnsRef, findEditor],
	)

	// F2 puts focus back on the tab stop, with the cursor on the cell. Escape
	// also clears the slot.
	const leave = useCallback(
		(columnId: string | number, clear: boolean) => {
			reseat()

			seatCursor(columnId)

			if (!clear) return

			drafts.unstageRow(NEW_ROW_KEY)

			remount()
		},
		[drafts, reseat, seatCursor],
	)

	const keys = useCallback(
		(event: ReactKeyboardEvent<HTMLTableElement>) => {
			const target = event.target as Element

			const cell = target.closest<HTMLElement>('td[data-grid-new-col]')

			if (!cell || cell.closest(GRID_ROLE) !== event.currentTarget) return false

			// A shortcut belongs to the editor. Tab moves through the controls of
			// the slot in the tab order, so the browser keeps it.
			if (hasBrowserModifier(event)) return true

			const columnId = findSlotColumn(
				cell.getAttribute('data-grid-new-col'),
				cursorColumnsRef.current,
			)

			if (columnId === undefined) return true

			if (event.key === 'Escape' || event.key === 'F2') {
				event.preventDefault()

				leave(columnId, event.key === 'Escape')
			} else if (event.key === 'Enter' && !target.closest(NATIVE_ENTER)) {
				event.preventDefault()

				addRow()
			}

			return true
		},
		[cursorColumnsRef, leave, addRow],
	)

	const session = useMemo<GridNewRowSession | null>(
		() =>
			position === null
				? null
				: {
						position,
						generation,
						inFlight,
						stageDraft: drafts.stage,
						unstageDraft: drafts.unstage,
						readDraft: drafts.read,
						claimFocus,
						addRow,
						editorKind,
						cellId,
						seat: seatNewRow,
					},
		[position, generation, inFlight, drafts, claimFocus, addRow, editorKind, cellId, seatNewRow],
	)

	const holdsEntry = useCallback(() => {
		if (flightRef.current !== null) return true

		return (
			collectNewRow(drafts.readRow(NEW_ROW_KEY), editSourceRef.current.columns).cells.length > 0
		)
	}, [drafts, editSourceRef])

	const stageRow = useCallback(
		(entries: readonly (readonly [string | number, unknown])[]) => {
			drafts.unstageRow(NEW_ROW_KEY)

			for (const [columnId, value] of entries) drafts.stage(NEW_ROW_KEY, columnId, value, null)

			remount()
		},
		[drafts],
	)

	return { session, keys, enter, editorKind, submitRow, holdsEntry, stageRow }
}
