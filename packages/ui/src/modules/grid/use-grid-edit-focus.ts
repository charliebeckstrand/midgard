'use client'

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import {
	type FocusOrigin,
	interactionPlace,
	reseatFlagged,
	returnElement,
	returnFlagged,
} from './engine/grid-edit-focus'
import type { TransitionPlan } from './engine/grid-edit-transition'
import {
	EDITOR_FOCUSABLE,
	findCoord,
	type GridActiveEdit,
	inGrid,
	isCellEditing,
	pointsAt,
} from './engine/grid-editing-utilities'
import type { GridColumn } from './types'
import type { Coord } from './use-grid-navigation'

/**
 * Owns where focus goes in an edit session. It holds the focus intent and the
 * typed seed of an entry, which the entered cell's editor claims as it mounts.
 * It reseats focus on the tab stop as the grid ends a session, and marks that
 * move as the grid's own for the commit on leave. It also records where focus
 * returns as the session on each open row ends: the cell that the session
 * entered, or the place of the last press or focus as the row opened.
 *
 * @typeParam T - Shape of a single row.
 * @internal
 */
export function useGridEditFocus<T>({
	editableRows,
	activeEdit,
	editableRowsRef,
	activeEditRef,
	tableRef,
	rowKeysRef,
	dataColumnsRef,
	cellId,
	moveTo,
}: {
	/** The rows that edit in this render. */
	editableRows: Set<string | number>
	/** The cell that a cell-scoped session edits in this render. */
	activeEdit: GridActiveEdit | null
	/** The rows that edit, read at event time. */
	editableRowsRef: RefObject<Set<string | number>>
	/** The cell of the session, read at event time. */
	activeEditRef: RefObject<GridActiveEdit | null>
	/** The grid `<table>`, the tab stop that a session exit reseats focus on. */
	tableRef: RefObject<HTMLTableElement | null>
	rowKeysRef: RefObject<(string | number)[]>
	/** Visible data columns in display order. */
	dataColumnsRef: RefObject<GridColumn<T>[]>
	/** The cursor's per-cell id deriver; locates a cell's editor to focus it. */
	cellId: (row: number, col: number) => string
	/** The cursor's clamped move. */
	moveTo: (coord: Coord) => void
}) {
	// The cell whose editor takes focus once it mounts. The entry sets it, and the
	// editor claims it as it mounts or as the session comes to hold it. A
	// controlled binding can delay that mount by a consumer round-trip.
	const pendingFocusRef = useRef<GridActiveEdit | null>(null)

	// The value a type-to-edit entry opens its editor with, beside the focus
	// intent and cleared with it. The editor reads it once, as it mounts.
	const pendingSeedRef = useRef<(GridActiveEdit & { value?: string | number }) | null>(null)

	const entrySeed = useCallback((rowKey: string | number, columnId: string | number) => {
		const pending = pendingSeedRef.current

		return pending && pointsAt(pending, { rowKey, columnId }) ? pending.value : undefined
	}, [])

	// Whether an entry named this cell. Each entry sets the seed, with a typed
	// value or with none, so the seed marks the entry too.
	const hasEntry = useCallback((rowKey: string | number, columnId: string | number) => {
		const pending = pendingSeedRef.current

		return pending !== null && pointsAt(pending, { rowKey, columnId })
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

			if (!pending || !pointsAt(pending, { rowKey, columnId })) return false

			const open = isCellEditing({
				rowKey,
				columnId,
				editableRows: editableRowsRef.current,
				activeEdit: activeEditRef.current,
			})

			if (open) dropIntents()

			return open
		},
		[dropIntents, editableRowsRef, activeEditRef],
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

	// Reseats focus on the tab stop, marked as the grid's own move for the
	// commit on leave.
	const reseat = useCallback(() => reseatFlagged(reseatingRef, tableRef.current), [tableRef])

	// Where focus returns as the session on each open row ends. A cell entry
	// records its cell. A row that the consumer opens records the place of the
	// last press or focus, so focus returns only to a cell that the session
	// edited or that was in use as it started.
	const originsRef = useRef(new Map<string | number, FocusOrigin>())

	// The place of the last press or focus on the page, as `interactionPlace`
	// gives it. A row that the consumer opens takes it as its origin. A press
	// counts as well as a focus, because a tap on a button in Safari does not
	// focus the button. The place is read at the event, because a pencil can
	// unmount in the render that opens its row.
	const lastPlaceRef = useRef<Element | null>(null)

	useEffect(() => {
		const table = tableRef.current

		if (!table) return

		const doc = table.ownerDocument

		const press = (event: PointerEvent) => {
			lastPlaceRef.current =
				event.target instanceof Element ? interactionPlace(table, event.target) : null
		}

		const focusIn = (event: FocusEvent) => {
			const target = event.target instanceof Element ? event.target : null

			// A press on a cell focuses the table, and the press names the cell.
			const last = lastPlaceRef.current

			if (target === table && last !== null && last !== table && table.contains(last)) return

			lastPlaceRef.current = target === null ? null : interactionPlace(table, target)
		}

		doc.addEventListener('pointerdown', press, true)

		doc.addEventListener('focusin', focusIn, true)

		return () => {
			doc.removeEventListener('pointerdown', press, true)

			doc.removeEventListener('focusin', focusIn, true)
		}
	}, [tableRef])

	useLayoutEffect(() => {
		const origins = originsRef.current

		for (const key of origins.keys()) if (!editableRows.has(key)) origins.delete(key)

		for (const key of editableRows) {
			if (origins.has(key)) continue

			const element = lastPlaceRef.current

			if (element) origins.set(key, { element })
		}
	}, [editableRows])

	// Records the place of the last press or focus as the origin of `rowKey`, in
	// place of the cell that an entry records. A control that opens its row,
	// such as a pencil, then takes focus back as the session on the row ends.
	const placeOrigin = useCallback((rowKey: string | number) => {
		const element = lastPlaceRef.current

		if (element) originsRef.current.set(rowKey, { element })
	}, [])

	// The element that focus returns to as the session on `rowKey` ends, or
	// `null` for none. A cell origin moves the cursor onto the cell that the
	// session edited, and gives the tab stop. An element origin gives what
	// `returnElement` gives.
	const focusTarget = useCallback(
		(rowKey: string | number): HTMLElement | null => {
			const origin = originsRef.current.get(rowKey)

			if (!origin) return null

			const table = tableRef.current

			if ('element' in origin) return returnElement(origin.element, table)

			const active = activeEditRef.current

			const cell = active?.rowKey === rowKey ? active : origin.cell

			const coord = findCoord(rowKeysRef.current, dataColumnsRef.current, cell)

			if (coord.row >= 0 && coord.col >= 0) moveTo(coord)

			return table
		},
		[activeEditRef, dataColumnsRef, moveTo, rowKeysRef, tableRef],
	)

	// Returns focus as the session on `rowKey` ends, when focus is in the grid.
	const returnFocus = useCallback(
		(rowKey: string | number) => {
			if (!inGrid(document.activeElement, tableRef.current)) return

			const target = focusTarget(rowKey)

			if (target) returnFlagged(reseatingRef, target)
		},
		[focusTarget, tableRef],
	)

	// Moves focus for one transition of a controlled binding. A value set from
	// outside replaces the intents of any entry, and focus follows it into the
	// grid only when focus is already there (WCAG 3.2.1). Focus in a grid nested
	// in a detail row is not in this grid (see `inGrid`). The leaving editor
	// blurs while it is still mounted, so a value it stages on blur reaches the
	// draft before the sweep commits the cell. A move the grid asked for blurs
	// where the uncontrolled path does: on a key move or an exit.
	const settleFocus = useCallback(
		(plan: TransitionPlan, blur: boolean) => {
			const focused = inGrid(document.activeElement, tableRef.current)

			if (!plan.asked) {
				dropIntents()

				if (plan.next && focused) pendingFocusRef.current = plan.next
			}

			if (plan.asked ? blur : focused) reseat()
		},
		[dropIntents, reseat, tableRef],
	)

	// Moves focus into the open editor of a cell. The editor claims the entry's
	// intents as it takes the focus, so an intent that no editor took drops here.
	const focusOpenEditor = useCallback(
		(rowKey: string | number, columnId: string | number) => {
			const { row, col } = findCoord(rowKeysRef.current, dataColumnsRef.current, {
				rowKey,
				columnId,
			})

			const editor = document
				.getElementById(cellId(row, col))
				?.querySelector<HTMLElement>(EDITOR_FOCUSABLE)

			editor?.focus()

			dropIntents()
		},
		[cellId, dataColumnsRef, dropIntents, rowKeysRef],
	)

	return {
		pendingFocusRef,
		pendingSeedRef,
		awaitRowRef,
		reseatingRef,
		originsRef,
		placeOrigin,
		entrySeed,
		hasEntry,
		dropIntents,
		claimFocus,
		reseat,
		focusTarget,
		returnFocus,
		settleFocus,
		focusOpenEditor,
	}
}
