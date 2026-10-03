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
import { announce } from '../../core'
import { useDevWarning } from '../../hooks/use-dev-warning'
import { useMountedRef } from '../../hooks/use-mounted-ref'
import { useStableEvent } from '../../hooks/use-stable-event'
import { focusWithoutReveal } from '../../hooks/use-truncation'
import { describeRowAdd } from './engine/grid-announcements'
import { GRID_ROLE } from './engine/grid-constants'
import {
	collectNewRow,
	columnOf,
	EDITOR_FOCUSABLE,
	type EditorKind,
	type GridDraftStore,
	inferEditorKind,
	isColumnEditable,
	isInGrid,
	isThenable,
	NATIVE_ENTER,
	NEW_ROW_KEY,
	readRefusals,
	type SinkOutcome,
	trackSink,
} from './engine/grid-editing-utilities'
import { type NewRowFlight, restoreRefused, slotColumnOf } from './engine/grid-new-row'
import type { GridEditSource } from './grid-data-types'
import type { GridNewRowSession } from './grid-editing-context'
import type { GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'
import { type Coord, type GridNewRowPosition, NEW_ROW_INDEX } from './use-grid-navigation'

/** The warning for a slot under a session that the consumer owns. @internal */
const MANUAL_NEW_ROW_WARNING =
	"Grid: `editable.newRow` adds a row through the keys of a session that the grid owns, but `editable.session` is 'manual'. The grid renders no new row — set `session: 'managed'` to show it."

/** The warning for a slot with no sink to take its row. @internal */
const SINKLESS_NEW_ROW_WARNING =
	'Grid: `editable.newRow` needs `editable.onRowAdd` to take the row. The grid renders no new row — pass `onRowAdd` to show it.'

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
	dataColumnsRef,
	tableRef,
	reseat,
	cellId,
	moveTo,
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
	/** Visible data columns in display order. */
	dataColumnsRef: RefObject<GridColumn<T>[]>
	/** The grid `<table>`, the tab stop. */
	tableRef: RefObject<HTMLTableElement | null>
	/** Reseats focus on the tab stop, marked as the grid's own move. */
	reseat: () => void
	cellId: (row: number, col: number) => string
	moveTo: (coord: Coord) => void
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
} {
	// A slot that the config cannot show renders nothing, so the setting fails
	// silently. The warnings tell the developer.
	const requested = config?.newRow != null

	useDevWarning(requested && !managed, MANUAL_NEW_ROW_WARNING)

	useDevWarning(requested && config?.onRowAdd == null, SINKLESS_NEW_ROW_WARNING)

	// Raised to mount the slot's editors again, so each reads the store.
	const [generation, remount] = useReducer((count: number) => count + 1, 0)

	// Raised by a blocked add, so the slot renders and each editor checks again.
	const [checks, check] = useReducer((count: number) => count + 1, 0)

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
		() => dataColumnsRef.current.find((column) => isColumnEditable(column))?.id ?? null,
		[dataColumnsRef],
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
			const col = dataColumnsRef.current.findIndex((column) => column.id === columnId)

			moveTo({ row: NEW_ROW_INDEX, col: Math.max(col, 0) })
		},
		[dataColumnsRef, moveTo],
	)

	// The mounted editor of a cell of the slot, in this grid.
	const editorOf = useCallback(
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
	// cell when `focus` asks for it.
	const accept = useCallback(
		(focus: boolean) => {
			if (focus) {
				reseat()

				focusRef.current = firstEditable()
			}

			drafts.unstageRow(NEW_ROW_KEY)

			remount()

			announce(describeRowAdd(0))
		},
		[drafts, firstEditable, reseat],
	)

	// Settles an async add. An accepted add clears the slot. A refused one
	// stages its values again, with the errors, and focus does not move. A
	// refusal names a cell of the slot by its column, so its row is ignored.
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

				accept(isInGrid(document.activeElement, tableRef.current))

				return
			}

			restoreRefused(drafts, flight, refused)

			remount()

			announce(describeRowAdd(refused.size))
		},
		[drafts, editableColumn, accept, tableRef],
	)

	// Adds the row. An add with no value does nothing. A `validate` refusal
	// blocks it, and the slot renders so the editors show the error, also one
	// that reads another cell. A second add waits
	// while one is in flight. It reads the newest position and `onRowAdd`.
	const addRow = useStableEvent(() => {
		if (position === null || flightRef.current !== null) return

		const { values, cells } = collectNewRow(
			drafts.readRow(NEW_ROW_KEY),
			editSourceRef.current.columns,
		)

		if (cells.length === 0) return

		const invalid = cells.filter(
			({ column, draft }) => column.validate?.(draft.value, values as T) != null,
		).length

		if (invalid > 0) {
			check()

			announce(describeRowAdd(invalid))

			return
		}

		const result = config?.onRowAdd?.(values)

		if (!isThenable(result)) {
			accept(true)

			return
		}

		// The editors turn inert while the add is in flight, so focus moves to
		// the tab stop first rather than drop to the page.
		reseat()

		const flight: NewRowFlight = {
			cells: cells.map(({ column, draft }) => [column.id, draft]),
		}

		for (const [columnId, draft] of flight.cells) drafts.pend(NEW_ROW_KEY, columnId, draft)

		flightRef.current = flight

		setInFlight(true)

		trackSink(result, mountedRef, (outcome) => settle(flight, outcome))
	})

	const enter = useCallback(
		(columnId: string | number, seed?: string | number) => {
			if (flightRef.current !== null) return

			const column = columnOf(dataColumnsRef.current, columnId)

			if (!column || !isColumnEditable(column)) return

			if (seed === undefined) {
				const editor = editorOf(columnId)

				if (editor) focusWithoutReveal(editor)

				return
			}

			// A typed entry replaces the value. The editor mounts again to show it,
			// and takes focus as it mounts.
			drafts.stage(NEW_ROW_KEY, columnId, seed, null)

			focusRef.current = columnId

			remount()
		},
		[drafts, dataColumnsRef, editorOf],
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
			if (event.ctrlKey || event.metaKey || event.altKey) return true

			const columnId = slotColumnOf(cell.getAttribute('data-grid-new-col'), dataColumnsRef.current)

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
		[dataColumnsRef, leave, addRow],
	)

	const session = useMemo<GridNewRowSession | null>(
		() =>
			position === null
				? null
				: {
						position,
						generation,
						checks,
						inFlight,
						stageDraft: drafts.stage,
						unstageDraft: drafts.unstage,
						readDraft: drafts.read,
						claimFocus,
						addRow,
						editorKind,
						cellId,
						moveTo,
					},
		[
			position,
			generation,
			checks,
			inFlight,
			drafts,
			claimFocus,
			addRow,
			editorKind,
			cellId,
			moveTo,
		],
	)

	return { session, keys, enter, editorKind }
}
