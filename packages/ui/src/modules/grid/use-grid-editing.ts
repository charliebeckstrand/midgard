'use client'

import {
	type KeyboardEvent as ReactKeyboardEvent,
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { announce } from '../../core'
import { useControllable } from '../../hooks'
import { useIsomorphicLayoutEffect } from '../../hooks/use-isomorphic-layout-effect'
import { EMPTY_SET } from './engine/grid-constants'
import { isColumnEditable } from './engine/grid-editing-utilities'
import type { GridEditingStore, GridRowEditing } from './grid-editing-context'
import type { CellChange, GridEditableConfig } from './grid-editing-types'
import type { GridColumn } from './types'
import type { Coord } from './use-grid-navigation'

/** The per-row editing layer's surface, consumed by {@link useGridCursor}. @internal */
export type GridEditingApi = {
	/**
	 * The staging half of the cells' editing context — the session store, draft
	 * callbacks, and focus handshake. {@link useGridCursor} composes the session
	 * exits (commit-and-move, cancel) over it to form the provided value.
	 */
	rowEditing: Omit<GridRowEditing, 'commitRowEdit' | 'cancelRowEdit' | 'commitOnEnter'>
	/**
	 * Puts the cell at `coord` into edit mode through the controllable set (so
	 * `onRowsChange` fires) and, once its editor mounts, focuses it — the
	 * grid-owned entry behind `trigger: 'doubleClick'`. Under `scope: 'row'` the
	 * whole row's editors mount (a no-op for a row already editing); under
	 * `scope: 'cell'` the entered cell alone mounts, and entering it while
	 * another cell is active commits that cell's staged edit first. A `seed`
	 * (the typed-to-enter character) rides the focus handshake to the editor,
	 * replacing the cell's value.
	 */
	enterRowEdit: (rowKey: string | number, coord: Coord, seed?: string) => void
	/**
	 * Ends a row's edit session, saving its staged changes through the flush —
	 * the raw exit {@link useGridCursor} wraps with the commit-and-move keys.
	 */
	exitRowEdit: (rowKey: string | number) => void
	/**
	 * Ends every open session, committing staged edits through the flush — the
	 * click-outside policy's exit. Focus is not reseated: the user deliberately
	 * left the grid.
	 */
	exitAllSessions: () => void
	/** Ends a row's edit session, discarding every staged draft. */
	cancelRowEdit: (rowKey: string | number) => void
	/** Whether a row currently has an open edit session, read at event time. */
	isRowEditing: (rowKey: string | number) => boolean
	/** Whether the grid owns the session lifecycle (`trigger: 'doubleClick'`). */
	sessionOwned: boolean
	/** Whether sessions are cell-scoped (`scope: 'cell'`). */
	cellScoped: boolean
	/**
	 * Abandons an editing row's session when an Escape bubbles up from one of its
	 * editors — layered onto the grid `<table>`'s key handler by
	 * {@link useGridCursor}, so every editor (inferred input, listbox, `editCell`
	 * slot) inherits it without wiring of its own. `undefined` unless the grid
	 * owns the session (`trigger: 'doubleClick'`).
	 */
	sessionEscape: ((event: ReactKeyboardEvent<HTMLTableElement>) => void) | undefined
}

/**
 * Reseats focus on the grid's single tab stop when it currently sits inside the
 * grid — called before a grid-owned session exit unmounts the focused editor, so
 * the keyboard lands back on the cursor rather than falling to `<body>`.
 *
 * @internal
 */
function restoreGridFocus(): void {
	const active = document.activeElement

	if (active instanceof HTMLElement) active.closest<HTMLElement>('[role="grid"]')?.focus()
}

/** A row's staged cell values, keyed by column id. @internal */
type RowDrafts = Map<string | number, unknown>

/** The single cell a `scope: 'cell'` session covers; `null` while no cell-scoped session is open. @internal */
type ActiveEditCell = { rowKey: string | number; columnId: string | number }

/** Whether two active-edit coords address the same cell (either may be unset). @internal */
function sameCell(a: ActiveEditCell | null, b: ActiveEditCell | null): boolean {
	return a?.rowKey === b?.rowKey && a?.columnId === b?.columnId
}

/**
 * Resolves a row's staged drafts into committed {@link CellChange}s: keeps each
 * changed cell (its draft differs from the row's current value) that passes the
 * column's {@link GridColumn.validate}, dropping unchanged and invalid ones.
 * Module-level so the flush effect stays within its complexity budget.
 *
 * @internal
 */
function flushRow<T>(args: {
	rowKey: string | number
	drafts: RowDrafts
	columns: GridColumn<T>[]
	rows: T[]
	rowKeys: (string | number)[]
}): CellChange[] {
	const rowIdx = args.rowKeys.indexOf(args.rowKey)

	const row = args.rows[rowIdx]

	if (row == null) return []

	const changes: CellChange[] = []

	for (const col of args.columns) {
		if (!args.drafts.has(col.id)) continue

		const value = args.drafts.get(col.id)

		const original = col.field != null ? row[col.field] : undefined

		if (Object.is(value, original)) continue

		if (col.validate?.(value, row) != null) continue

		changes.push({ rowKey: args.rowKey, columnId: col.id, value })
	}

	return changes
}

/**
 * Flushes every row that left the editable set since the last render: emits its
 * staged changes as one `onValueChange` batch, clears its drafts, and returns the
 * total cells saved across them (for the commit announcement). @internal
 */
function flushExitedRows<T>(args: {
	prev: Set<string | number>
	next: Set<string | number>
	drafts: Map<string | number, RowDrafts>
	columns: GridColumn<T>[]
	rows: T[]
	rowKeys: (string | number)[]
	onValueChange: ((changes: CellChange[]) => void) | undefined
}): number {
	let saved = 0

	for (const rowKey of args.prev) {
		if (args.next.has(rowKey)) continue

		const drafts = args.drafts.get(rowKey)

		args.drafts.delete(rowKey)

		if (!drafts || drafts.size === 0) continue

		const changes = flushRow({
			rowKey,
			drafts,
			columns: args.columns,
			rows: args.rows,
			rowKeys: args.rowKeys,
		})

		if (!changes.length) continue

		args.onValueChange?.(changes)

		saved += changes.length
	}

	return saved
}

/**
 * Flushes one cell as a cell-scoped session leaves it while its row stays in the
 * editable set — the within-row move the row-leave flush can't see. Emits the
 * cell's staged draft (changed and `validate`-passing) as a one-change batch and
 * clears it; returns the cells saved (0 or 1). @internal
 */
function flushExitedCell<T>(args: {
	cell: ActiveEditCell
	drafts: Map<string | number, RowDrafts>
	columns: GridColumn<T>[]
	rows: T[]
	rowKeys: (string | number)[]
	onValueChange: ((changes: CellChange[]) => void) | undefined
}): number {
	const rowDrafts = args.drafts.get(args.cell.rowKey)

	if (!rowDrafts?.has(args.cell.columnId)) return 0

	const single: RowDrafts = new Map([[args.cell.columnId, rowDrafts.get(args.cell.columnId)]])

	rowDrafts.delete(args.cell.columnId)

	const changes = flushRow({
		rowKey: args.cell.rowKey,
		drafts: single,
		columns: args.columns,
		rows: args.rows,
		rowKeys: args.rowKeys,
	})

	if (!changes.length) return 0

	args.onValueChange?.(changes)

	return changes.length
}

/**
 * Owns inline editing: the editable rows (a controllable `Set<key>`,
 * consumer-driven by default), the active cell of a cell-scoped session, and the
 * staged drafts of cells under edit. A session covers a whole row (`scope:
 * 'row'`, the default — every editable cell renders its editor at once) or a
 * single cell (`scope: 'cell'` — the entered cell alone, its row carried in the
 * same set). Each edit stages into a grid-held ref (no per-keystroke grid
 * render). When a session ends — the consumer's save action, or a grid-owned
 * exit under `trigger: 'doubleClick'` (an editor's Enter saves, Escape
 * abandons) — its drafts flush as a single {@link CellChange} batch through
 * `onValueChange`, dropping unchanged and invalid cells. Inert when `enabled`
 * is false, so a read-only grid pays nothing.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridEditing<T>({
	enabled,
	config,
	rowsRef,
	rowKeysRef,
	dataColumnsRef,
}: {
	enabled: boolean
	config: GridEditableConfig | undefined
	rowsRef: RefObject<T[]>
	rowKeysRef: RefObject<(string | number)[]>
	/** Visible data columns in display order. */
	dataColumnsRef: RefObject<GridColumn<T>[]>
}): GridEditingApi {
	// The editable-row set is consumer-driven by default — the grid renders no
	// built-in trigger and only reads the binding (a row-action button flips a
	// key). Under `trigger: 'doubleClick'` the grid also writes it, through the
	// session callbacks below, so every entry/exit still emits `onRowsChange`.
	const [editableRowsRaw, setEditableRows] = useControllable<Set<string | number>>({
		value: config?.rows,
		defaultValue: config?.defaultRows ?? EMPTY_SET,
		onValueChange: (next) => config?.onRowsChange?.(next ?? EMPTY_SET),
	})

	const editableRows = enabled ? (editableRowsRaw ?? EMPTY_SET) : EMPTY_SET

	// Grid-owned session lifecycle (enter on double-click / cursor Enter, exit on
	// an editor's Enter/Escape); the default 'manual' mode leaves it entirely to
	// the consumer.
	const sessionOwned = enabled && config?.trigger === 'doubleClick'

	// Cell-scoped sessions (`scope: 'cell'`): one cell edits at a time, tracked by
	// the active-edit coord joined to the set below.
	const cellScoped = enabled && config?.scope === 'cell'

	// The single cell a cell-scoped session covers. Its row rides the editable
	// set (so the controllable binding stays the source of truth); this coord
	// narrows which of the row's cells mounts an editor. Stays `null` under row
	// scope.
	const [activeCell, setActiveCell] = useState<ActiveEditCell | null>(null)

	// Read by the [] -stable session callbacks at event time.
	const editableRowsRef = useRef(editableRows)

	editableRowsRef.current = editableRows

	const activeCellRef = useRef(activeCell)

	activeCellRef.current = activeCell

	const onValueChangeRef = useRef(config?.onValueChange)

	onValueChangeRef.current = config?.onValueChange

	// Mirror the session into an external store so each cell subscribes to its
	// own editing flag (the editor mount test): a session enter, exit, or
	// within-row move re-renders only the cells whose flag flipped — never the
	// whole grid — matching the cursor-store pattern (`useGridNavigation`).
	const internalRef = useRef<{
		rows: Set<string | number>
		cell: ActiveEditCell | null
		cellScoped: boolean
		listeners: Set<() => void>
	} | null>(null)

	if (internalRef.current === null) {
		internalRef.current = { rows: editableRows, cell: activeCell, cellScoped, listeners: new Set() }
	}

	const internal = internalRef.current

	useIsomorphicLayoutEffect(() => {
		internal.rows = editableRows

		internal.cell = activeCell

		internal.cellScoped = cellScoped

		for (const listener of internal.listeners) listener()
	}, [editableRows, activeCell, cellScoped, internal])

	const storeRef = useRef<GridEditingStore | null>(null)

	if (storeRef.current === null) {
		storeRef.current = {
			subscribe: (listener) => {
				internal.listeners.add(listener)

				return () => {
					internal.listeners.delete(listener)
				}
			},
			isCellEditing: (rowKey, columnId) =>
				internal.rows.has(rowKey) &&
				(!internal.cellScoped ||
					(internal.cell?.rowKey === rowKey && internal.cell?.columnId === columnId)),
		}
	}

	// Staged drafts per editing row, keyed rowKey → (columnId → value). Held in a
	// ref so staging never re-renders the grid; read at flush time.
	const draftsRef = useRef<Map<string | number, RowDrafts>>(new Map())

	const stageDraft = useCallback(
		(rowKey: string | number, columnId: string | number, value: unknown) => {
			let row = draftsRef.current.get(rowKey)

			if (!row) {
				row = new Map()

				draftsRef.current.set(rowKey, row)
			}

			row.set(columnId, value)
		},
		[],
	)

	const unstageDraft = useCallback((rowKey: string | number, columnId: string | number) => {
		draftsRef.current.get(rowKey)?.delete(columnId)
	}, [])

	// The cell whose editor takes focus once it mounts — recorded by
	// `enterRowEdit`, resolved by the editor itself through `claimPendingFocus`
	// at mount (however many render passes the session store and a controlled
	// binding take to get there). A typed-to-enter seed rides along.
	const pendingFocusRef = useRef<(ActiveEditCell & { seed?: string }) | null>(null)

	const enterRowEdit = useCallback(
		(rowKey: string | number, coord: Coord, seed?: string) => {
			const columnId = dataColumnsRef.current[coord.col]?.id

			if (columnId === undefined) return

			if (cellScoped) {
				const current = activeCellRef.current

				if (
					current?.rowKey === rowKey &&
					current.columnId === columnId &&
					editableRowsRef.current.has(rowKey)
				) {
					return
				}

				pendingFocusRef.current = { rowKey, columnId, seed }

				setActiveCell({ rowKey, columnId })

				// One session at a time: the entered cell's row replaces the set, so a
				// previously active cell commits through the row-leave flush (or the
				// within-row move flush when the row is unchanged).
				if (!(editableRowsRef.current.size === 1 && editableRowsRef.current.has(rowKey))) {
					setEditableRows(new Set([rowKey]))
				}

				return
			}

			if (editableRowsRef.current.has(rowKey)) return

			pendingFocusRef.current = { rowKey, columnId, seed }

			setEditableRows((prev) => new Set(prev ?? EMPTY_SET).add(rowKey))
		},
		[cellScoped, setEditableRows, dataColumnsRef],
	)

	const claimPendingFocus = useCallback((rowKey: string | number, columnId: string | number) => {
		const pending = pendingFocusRef.current

		if (!pending || pending.rowKey !== rowKey || pending.columnId !== columnId) return null

		pendingFocusRef.current = null

		return { seed: pending.seed }
	}, [])

	// Drop a pending focus intent the session moved past — a controlled consumer
	// declined the entry, or a cell-scoped reseat landed elsewhere — so it can't
	// steal focus if the same cell mounts an editor on a later, unrelated edit.
	useEffect(() => {
		const pending = pendingFocusRef.current

		if (!pending) return

		if (!editableRows.has(pending.rowKey)) pendingFocusRef.current = null
		else if (cellScoped && !sameCell(activeCell, pending)) pendingFocusRef.current = null
	}, [editableRows, activeCell, cellScoped])

	// Grid-owned exits: both reseat focus on the grid's tab stop before the
	// editors unmount, then remove the row from the set — the same flush path a
	// consumer save takes. Cancel drops the row's drafts first, so the flush
	// finds nothing to emit.
	const exitRowEdit = useCallback(
		(rowKey: string | number) => {
			if (!editableRowsRef.current.has(rowKey)) return

			restoreGridFocus()

			setActiveCell((current) => (current?.rowKey === rowKey ? null : current))

			setEditableRows((prev) => {
				const next = new Set(prev ?? EMPTY_SET)

				next.delete(rowKey)

				return next
			})
		},
		[setEditableRows],
	)

	const cancelRowEdit = useCallback(
		(rowKey: string | number) => {
			draftsRef.current.delete(rowKey)

			exitRowEdit(rowKey)
		},
		[exitRowEdit],
	)

	// The click-outside policy's exit: every open session commits through the
	// flush. Focus is deliberately not reseated — the user left the grid.
	const exitAllSessions = useCallback(() => {
		if (editableRowsRef.current.size === 0) return

		setActiveCell(null)

		setEditableRows(EMPTY_SET)
	}, [setEditableRows])

	// Escape from any of an editing row's editors abandons its session. It stands
	// down while the press belongs to an inner floating surface, whose
	// document-level escape layer runs *after* this React handler: a press
	// already consumed (`defaultPrevented`), one fired from focus inside a
	// portaled panel (an open listbox's options, the date picker's calendar), or
	// one on an open disclosure's own trigger/input (`aria-expanded="true"`, a
	// combobox typing with its panel open) — each closes that surface instead,
	// and the next press abandons. The row resolves from the event's `<tr>`
	// (`data-row-index` into the display order), so only an editing row's Escape
	// is consumed and every other press keeps bubbling.
	const sessionEscape = useCallback(
		(event: ReactKeyboardEvent<HTMLTableElement>) => {
			if (event.key !== 'Escape' || event.defaultPrevented) return

			if (!(event.target instanceof Element)) return

			if (event.target.closest('[data-floating-ui-portal]')) return

			if (event.target.closest('[aria-expanded="true"]')) return

			const rowIndex = event.target.closest('tr[data-row-index]')?.getAttribute('data-row-index')

			if (rowIndex == null) return

			const rowKey = rowKeysRef.current[Number(rowIndex)]

			if (rowKey === undefined || !editableRowsRef.current.has(rowKey)) return

			event.preventDefault()

			cancelRowEdit(rowKey)
		},
		[cancelRowEdit, rowKeysRef],
	)

	// Flush sessions that ended since the last render: rows that left the
	// editable set emit their staged changes as one batch each, and a cell-scoped
	// session that moved within its row (the set unchanged) emits the departed
	// cell's draft. The editors for both have unmounted, but the drafts persist
	// in the ref until flushed here.
	const prevRowsRef = useRef<Set<string | number>>(EMPTY_SET)

	const prevCellRef = useRef<ActiveEditCell | null>(null)

	useEffect(() => {
		const prev = prevRowsRef.current

		prevRowsRef.current = editableRows

		const prevCell = prevCellRef.current

		prevCellRef.current = activeCell

		let saved = flushExitedRows({
			prev,
			next: editableRows,
			drafts: draftsRef.current,
			columns: dataColumnsRef.current,
			rows: rowsRef.current,
			rowKeys: rowKeysRef.current,
			onValueChange: onValueChangeRef.current,
		})

		// The within-row move: the previous active cell stopped editing while its
		// row stayed in the set, so the row-leave pass above never saw it. A row
		// that did leave was flushed (and its drafts cleared) there already.
		if (prevCell && !sameCell(prevCell, activeCell) && editableRows.has(prevCell.rowKey)) {
			saved += flushExitedCell({
				cell: prevCell,
				drafts: draftsRef.current,
				columns: dataColumnsRef.current,
				rows: rowsRef.current,
				rowKeys: rowKeysRef.current,
				onValueChange: onValueChangeRef.current,
			})
		}

		// Announce the commit politely, without moving focus (WCAG 4.1.3).
		if (saved > 0) announce(`${saved} ${saved === 1 ? 'cell' : 'cells'} updated`)
	}, [editableRows, activeCell, dataColumnsRef, rowsRef, rowKeysRef])

	// Keep the active-edit coord coherent with the set it rides: clear it when
	// its row leaves the set, and seat a consumer-driven session (a row put into
	// the set with no entered cell to narrow to) at that row's first editable
	// column so `scope: 'cell'` stays usable under the manual trigger. Runs after
	// the flush effect above, so a reseat never swallows a pending flush.
	useEffect(() => {
		if (!cellScoped) return

		setActiveCell((current) => {
			if (editableRows.size === 0) return current === null ? current : null

			if (current && editableRows.has(current.rowKey)) return current

			const [firstRow] = editableRows

			const col = dataColumnsRef.current.find((candidate) => isColumnEditable(candidate))

			return firstRow === undefined || col === undefined
				? null
				: { rowKey: firstRow, columnId: col.id }
		})
	}, [cellScoped, editableRows, dataColumnsRef])

	const isRowEditing = useCallback(
		(rowKey: string | number) => editableRowsRef.current.has(rowKey),
		[],
	)

	const rowEditing = useMemo<
		Omit<GridRowEditing, 'commitRowEdit' | 'cancelRowEdit' | 'commitOnEnter'>
	>(
		() => ({
			store: storeRef.current as GridEditingStore,
			stageDraft,
			unstageDraft,
			claimPendingFocus,
		}),
		[stageDraft, unstageDraft, claimPendingFocus],
	)

	return {
		rowEditing,
		enterRowEdit,
		exitRowEdit,
		exitAllSessions,
		cancelRowEdit,
		isRowEditing,
		sessionOwned,
		cellScoped,
		sessionEscape: sessionOwned ? sessionEscape : undefined,
	}
}
