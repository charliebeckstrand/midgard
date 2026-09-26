'use client'

import {
	type FocusEvent,
	type KeyboardEvent,
	type RefObject,
	useCallback,
	useEffectEvent,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createContext } from '../../core'
import { useIdScope } from '../../hooks'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { clamp, FOCUSABLE_SELECTOR } from '../../utilities'
import { FLOATING_PORTAL, NAV_PAGE_STEP } from './engine/grid-constants'
import type { GridCursorRow } from './grid-cursor-order'

/**
 * Zero-based cursor position over the grid's data cells, in display order.
 * The new-row slot is the row {@link NEW_ROW_INDEX}. @internal
 */
export type Coord = { row: number; col: number }

/**
 * The cursor row of the new-row slot ({@link GridEditableConfig.newRow}). It
 * stays the same while the data rows change, so a cursor on the slot stays
 * there when a row is added. It is not `-1`, which a cell of an unknown row
 * reads as. @internal
 */
export const NEW_ROW_INDEX = -2

/** Where the new-row slot sits in the cursor's order, or `null` for no slot. @internal */
export type GridNewRowPosition = 'top' | 'bottom' | null

/**
 * The place of a cursor row in the cursor's order. The order is the data rows,
 * with the new-row slot first or last. A data row below zero reads as the
 * first data row. @internal
 */
function toPosition(row: number, count: number, slot: GridNewRowPosition): number {
	if (row === NEW_ROW_INDEX) return slot === 'top' ? 0 : count

	const data = Math.max(row, 0)

	return slot === 'top' ? data + 1 : data
}

/** The cursor row at a place in the cursor's order (see {@link toPosition}). @internal */
function fromPosition(position: number, count: number, slot: GridNewRowPosition): number {
	if (slot === 'top') return position === 0 ? NEW_ROW_INDEX : position - 1

	if (slot === 'bottom' && position === count) return NEW_ROW_INDEX

	return position
}

/**
 * The cursor row nearest to `row` that exists: the row itself, or the row at
 * the edge of the cursor's order. It is `null` when the order is empty.
 * @internal
 */
function clampRow(row: number, count: number, slot: GridNewRowPosition): number | null {
	const span = count + (slot === null ? 0 : 1)

	if (span === 0) return null

	return fromPosition(clamp(toPosition(row, count, slot), 0, span - 1), count, slot)
}

/**
 * Activates the row under the cursor on Enter/Space. The originating event is
 * the grid `<table>` (the cursor's single tab stop), not a `<tr>`. This is
 * therefore decoupled from the grid's row-click handler, and `Grid` bridges the
 * two.
 *
 * @internal
 */
export type GridRowActivate = (row: unknown, event: KeyboardEvent<HTMLTableElement>) => void

/**
 * Activates the data cell under the cursor on Enter/Space, ahead of the row
 * activation. It is the keyboard counterpart of the grid's cell click,
 * addressed by the cursor's display-index coord. `Grid` resolves it to the cell
 * context.
 *
 * @internal
 */
export type GridCellActivate = (
	rowIdx: number,
	colIdx: number,
	event: KeyboardEvent<HTMLTableElement>,
) => void

/**
 * External-store interface over the read-only cursor, built in
 * {@link useGridNavigation}: each cell subscribes to whether it is the active
 * cell without re-rendering on every cursor move.
 *
 * @internal
 */
export type GridNavStore = {
	/** Whether the cursor runs, so the rows of the grid carry its cell ids and seats. */
	enabled: boolean
	subscribe: (listener: () => void) => () => void
	/** Whether the cell at `(row, col)` is currently the active cursor cell. */
	isActive: (row: number, col: number) => boolean
	/** Whether the cursor sits on the one-stop row with this item key. */
	isStopActive: (key: string) => boolean
	/** The element id of the one cell of a one-stop row, matched by `aria-activedescendant`. */
	stopId: (key: string) => string
	/** Seats the cursor on the one-stop row with this item key, as a click on it does. */
	seatStop: (key: string) => void
	/**
	 * Hands the cursor the order of a body that renders more than data rows, or
	 * `null` for a body of data rows only. A body calls it from a layout effect
	 * each time its order changes (see {@link GridCursorRow}).
	 */
	publish: (order: readonly GridCursorRow[] | null) => void
}

/** Inert store for a non-navigable grid, so the hook can return a stable shape unconditionally. @internal */
const INERT_STORE: GridNavStore = {
	enabled: false,
	subscribe: () => () => {},
	isActive: () => false,
	isStopActive: () => false,
	stopId: (key) => key,
	seatStop: () => {},
	publish: () => {},
}

/**
 * Provides the read-only cursor store to the cell markers under a `navigable`
 * grid. A row outside a grid reads the inert store. @internal
 */
export const [GridNavContext, useGridNavContext] = createContext<GridNavStore>('GridNav', {
	default: INERT_STORE,
})

/**
 * The cursor props merged onto a `navigable` grid's `<table>`: the single tab
 * stop, the active-cell pointer, and the key/focus handlers. `aria-activedescendant`
 * is omitted (rather than empty) when the cursor is unseated.
 *
 * @internal
 */
export type GridNavTableProps = {
	tabIndex: 0
	'aria-activedescendant': string | undefined
	onKeyDown: (event: KeyboardEvent<HTMLTableElement>) => void
	onFocus: (event: FocusEvent<HTMLTableElement>) => void
	onBlur: (event: FocusEvent<HTMLTableElement>) => void
}

/**
 * Resolves a movement key to the cursor's next coord (unclamped), or `null` when
 * the key doesn't move the cursor:
 *
 * - Arrows step one cell.
 * - Home/End jump to the row's edges, or the grid's first/last cell with
 *   Ctrl/Cmd (`toGrid`).
 * - PageUp/Down jump `pageStep` rows (a viewport-relative count, see
 *   {@link resolvePageStep}).
 *
 * @internal
 */
function navTarget(
	key: string,
	base: Coord,
	rowCount: number,
	colCount: number,
	toGrid: boolean,
	pageStep: number,
): Coord | null {
	// `base.row` and the result are places in the cursor's order here, not
	// cursor rows (see `toPosition`).
	switch (key) {
		case 'ArrowUp':
			return { row: base.row - 1, col: base.col }
		case 'ArrowDown':
			return { row: base.row + 1, col: base.col }
		case 'ArrowLeft':
			return { row: base.row, col: base.col - 1 }
		case 'ArrowRight':
			return { row: base.row, col: base.col + 1 }
		case 'Home':
			return toGrid ? { row: 0, col: 0 } : { row: base.row, col: 0 }
		case 'End':
			return toGrid
				? { row: rowCount - 1, col: colCount - 1 }
				: { row: base.row, col: colCount - 1 }
		case 'PageUp':
			return { row: base.row - pageStep, col: base.col }
		case 'PageDown':
			return { row: base.row + pageStep, col: base.col }
		default:
			return null
	}
}

/**
 * The cursor coord a movement key moves to from `base`, or `null` when the key
 * does not move the cursor. The move runs over places in the cursor's order
 * (see {@link toPosition}), so the new-row slot is one row of it, first or
 * last. The result is clamped to the rows that exist. @internal
 */
function keyTarget(
	key: string,
	base: Coord,
	order: { count: number; slot: GridNewRowPosition; colCount: number },
	toGrid: boolean,
	pageStep: number,
): Coord | null {
	const { count, slot, colCount } = order

	const span = count + (slot === null ? 0 : 1)

	const target = navTarget(
		key,
		{ row: toPosition(base.row, count, slot), col: base.col },
		span,
		colCount,
		toGrid,
		pageStep,
	)

	if (!target) return null

	return { row: fromPosition(clamp(target.row, 0, span - 1), count, slot), col: target.col }
}

/**
 * The cell a focus into the grid seats the cursor on. That is the first cell
 * of the cursor's order, or the last one for a focus from after the grid. It
 * is `null` when the grid has no cell. @internal
 */
function seedCoord(
	fromAfter: boolean,
	order: { count: number; slot: GridNewRowPosition; colCount: number },
): Coord | null {
	const { count, slot, colCount } = order

	const span = count + (slot === null ? 0 : 1)

	if (span === 0 || colCount === 0) return null

	return fromAfter
		? { row: fromPosition(span - 1, count, slot), col: colCount - 1 }
		: { row: fromPosition(0, count, slot), col: 0 }
}

/**
 * The number of rows a PageUp/PageDown jumps: a viewport-page of rows. The count
 * is measured from the grid's scroll container height and a rendered row's
 * height, with one row of overlap kept for context. A tall grid therefore pages
 * by what's visible rather than a fixed count. Returns {@link NAV_PAGE_STEP}
 * for any non-page key (no layout read). The same constant is the fallback when
 * there is no scroll container (a fully-visible grid) or the rows can't be
 * measured (jsdom).
 *
 * @internal
 */
function resolvePageStep(key: string, container: HTMLElement | null, table: HTMLElement): number {
	if (key !== 'PageUp' && key !== 'PageDown') return NAV_PAGE_STEP

	const viewport = container?.clientHeight ?? 0

	const rowHeight = table.querySelector<HTMLElement>('tbody tr[data-grid-row]')?.offsetHeight ?? 0

	if (viewport > 0 && rowHeight > 0) return Math.max(1, Math.floor(viewport / rowHeight) - 1)

	return NAV_PAGE_STEP
}

/**
 * Maps each data row index to its place in a published order. A data row that
 * the order does not show has no place. @internal
 */
function cursorOfDataRows(
	order: readonly GridCursorRow[] | null,
	rowIndexMap: Map<unknown, number>,
): Map<number, number> {
	const cursorOfData = new Map<number, number>()

	order?.forEach((entry, row) => {
		if (entry.kind !== 'data') return

		const data = rowIndexMap.get(entry.row)

		if (data !== undefined) cursorOfData.set(data, row)
	})

	return cursorOfData
}

/**
 * Finds the cursor's place again in a new order. The same row is found by key.
 * A row that left the order, such as a leaf of a group that closed, gives way
 * to its parent row. Else the place clamps into the order. A body that stops
 * publishing clears the cursor, because its places mean nothing now. @internal
 */
function reseat(
	current: Coord | null,
	order: readonly GridCursorRow[] | null,
	seated: { key: string; parent: string | undefined } | null,
): Coord | null {
	if (current === null || current.row === NEW_ROW_INDEX) return current

	if (order === null) return null

	const find = (key: string | undefined) =>
		key === undefined ? -1 : order.findIndex((entry) => entry.key === key)

	let row = find(seated?.key)

	if (row === -1) row = find(seated?.parent)

	if (row === -1 && order.length > 0) row = clamp(current.row, 0, order.length - 1)

	if (row === -1) return null

	return row === current.row ? current : { row, col: current.col }
}

/** What a key does on a one-stop row (see `onStopKey`). @internal */
type StopAction = 'toggle' | 'descend' | 'enter' | 'swallow'

/**
 * Resolves the action of a key on a one-stop row, or `null` when the cursor
 * takes the key.
 *
 * - A group header toggles on Enter or Space. ArrowRight opens a closed group,
 *   and it steps into an open one. ArrowLeft closes an open group. The key is
 *   logical (see `logicalArrowKey` in `hooks/a11y`), so a right-to-left grid mirrors it.
 * - A detail panel takes focus into its controls on Enter or F2.
 * - A one-stop row has no cells, so the other keys that act on a cell do
 *   nothing there.
 *
 * @internal
 */
function stopAction(key: string, entry: GridCursorRow): StopAction | null {
	const open = entry.kind === 'group' && entry.expanded

	if (entry.kind === 'group' && (key === 'Enter' || key === ' ')) return 'toggle'

	if (entry.kind === 'group' && key === 'ArrowRight') return open ? 'descend' : 'toggle'

	if (open && key === 'ArrowLeft') return 'toggle'

	if (entry.kind === 'detail' && (key === 'Enter' || key === 'F2')) return 'enter'

	const cellKey = key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Enter' || key === ' '

	return cellKey ? 'swallow' : null
}

/**
 * Gives focus back to the grid on an Escape from a control in one of its
 * detail panels. An Escape that the control took stays with it. @internal
 */
function escapeFromPanel(event: KeyboardEvent<HTMLTableElement>): void {
	if (event.key !== 'Escape' || event.defaultPrevented) return

	const panel = event.target instanceof Element ? event.target.closest('[data-detail-row]') : null

	if (panel?.closest('table') !== event.currentTarget) return

	event.preventDefault()

	event.currentTarget.focus()
}

/**
 * Owns the read-only grid's keyboard cursor: a single active cell mirrored into
 * an external store. Only the cells whose active flag flips re-render, and the
 * cursor is exposed to assistive tech through `aria-activedescendant`. Arrow
 * keys, Home/End (row), Ctrl/Cmd+Home/End (grid), and PageUp/PageDown move the
 * cursor. Enter/Space activates the cell through `onCellActivate` then the row
 * through `onRowActivate`. Escape unseats it. In a right-to-left grid,
 * ArrowLeft moves to the next column and ArrowRight to the previous one.
 *
 * Bounds and the active row come from `rowsRef`/`colCountRef` at event time. The
 * hook thus holds no stale counts, and its callbacks stay referentially stable
 * across renders. When `enabled` is false the hook is inert — `navTableProps`
 * is `undefined` and the store never reports an active cell — so a non-navigable
 * grid pays nothing.
 *
 * @returns The cursor handle:
 *
 * - The reactive `active` coord (drives `aria-activedescendant`).
 * - The subscription `store`.
 * - The `cellId` id-deriver matched by the active pointer.
 * - The clamped `moveTo` (for click-to-focus).
 * - The `reconcile` re-clamp, which the grid runs as the bounds change.
 * - `navTableProps` to spread onto the `<table>` (or `undefined` when disabled).
 *
 * @internal
 */
export function useGridNavigation({
	enabled,
	rowsRef,
	colCountRef,
	onRowActivate,
	onCellActivate,
	selectableRef,
	toggleActiveRow,
	scrollRowIntoViewRef,
	scrollContainerRef,
	newRowRef,
	rowIndexMapRef,
}: {
	enabled: boolean
	/** Live rendered rows; backs cursor bounds and the Enter/Space row lookup. */
	rowsRef: RefObject<unknown[]>
	/** Live count of cursor-visitable data columns; backs horizontal bounds. */
	colCountRef: RefObject<number>
	/** Activates the row under the cursor on Enter, when the grid has a row click. */
	onRowActivate: GridRowActivate | undefined
	/** Activates the cell under the cursor on Enter, ahead of the row, when the grid has a cell click. */
	onCellActivate: GridCellActivate | undefined
	/** Whether the grid has a selection column; gates Space-to-select. */
	selectableRef: RefObject<boolean>
	/** Toggles the active row's selection by display index, when selectable. */
	toggleActiveRow: ((rowIdx: number) => void) | undefined
	/**
	 * Scrolls a row into the virtualized window before the cursor lands on it; null
	 * when unwindowed. A body with a published order also receives the row's item key.
	 */
	scrollRowIntoViewRef: RefObject<((rowIndex: number, key?: string) => void) | null>
	/** The grid's scroll container, measured for the viewport-relative PageUp/Down step; null when the grid doesn't scroll. */
	scrollContainerRef: RefObject<HTMLElement | null>
	/** Where the new-row slot sits in the cursor's order, read at event time. */
	newRowRef: RefObject<GridNewRowPosition>
	/** Live row → data index map; turns a data row of a published order into a data index. */
	rowIndexMapRef: RefObject<Map<unknown, number>>
}): {
	active: Coord | null
	store: GridNavStore
	cellId: (row: number, col: number) => string
	moveTo: (coord: Coord) => void
	/** Re-clamps the active cell to the given bounds; the grid drives it as the data changes. */
	reconcile: (rowCount: number, colCount: number) => void
	navTableProps: GridNavTableProps | undefined
} {
	const [active, setActive] = useState<Coord | null>(null)

	const activeRef = useRef<Coord | null>(null)

	activeRef.current = active

	// Read the row- and cell-click as effect events, so the key handler's deps
	// stay stable when the consumer passes inline callbacks. Whether each one is
	// present stays in the deps, because Enter is claimed only when one is.
	const hasRowActivate = onRowActivate !== undefined

	const hasCellActivate = onCellActivate !== undefined

	const rowActivate = useEffectEvent((row: unknown, event: KeyboardEvent<HTMLTableElement>) =>
		onRowActivate?.(row, event),
	)

	const cellActivate = useEffectEvent(
		(rowIdx: number, colIdx: number, event: KeyboardEvent<HTMLTableElement>) =>
			onCellActivate?.(rowIdx, colIdx, event),
	)

	// Read selection toggling as an effect event, so the key handler's deps stay stable.
	const toggleActive = useEffectEvent((rowIdx: number) => toggleActiveRow?.(rowIdx))

	const { sub } = useIdScope()

	const cellId = useCallback((row: number, col: number) => sub(`cell-${row}-${col}`), [sub])

	// Mirror the active cell into an external store so each cell subscribes to its
	// own active flag: moving the cursor re-renders only the two cells whose flag
	// flipped, not every rendered cell.
	const internalRef = useRef<{ active: Coord | null; listeners: Set<() => void> } | null>(null)

	if (internalRef.current === null) {
		internalRef.current = { active, listeners: new Set() }
	}

	const internal = internalRef.current

	// The order of a body that renders more than data rows, or `null` for data rows
	// only. Inside this hook `active.row` is a place in that order. The public API
	// speaks data row indexes either way, so no caller learns of the order.
	const orderRef = useRef<readonly GridCursorRow[] | null>(null)

	const cursorOfDataRef = useRef<Map<number, number>>(new Map())

	// The item key and parent of the active row, read against the order it was
	// seated in, so a new order can find the same row again.
	const activeKeyRef = useRef<{ key: string; parent: string | undefined } | null>(null)

	const count = useCallback(() => orderRef.current?.length ?? rowsRef.current.length, [rowsRef])

	/** The data row index of a cursor row, or -1 for a row that holds no data. */
	const dataRowOf = useCallback(
		(row: number): number => {
			const order = orderRef.current

			if (!order || row === NEW_ROW_INDEX) return row

			const entry = order[row]

			return entry?.kind === 'data' ? (rowIndexMapRef.current.get(entry.row) ?? -1) : -1
		},
		[rowIndexMapRef],
	)

	/** The cursor row of a data row index, or -1 for a data row the order does not show. */
	const cursorRowOf = useCallback((row: number): number => {
		if (!orderRef.current || row === NEW_ROW_INDEX) return row

		return cursorOfDataRef.current.get(row) ?? -1
	}, [])

	/** The one-stop entry at a cursor row, or `undefined` for a data row or the new-row slot. */
	const stopAt = useCallback((row: number): GridCursorRow | undefined => {
		const entry = row === NEW_ROW_INDEX ? undefined : orderRef.current?.[row]

		return entry && entry.kind !== 'data' ? entry : undefined
	}, [])

	const stopId = useCallback((key: string) => sub(`stop-${key}`), [sub])

	// The store is built once, so its members that need later callbacks read them
	// through this ref.
	const storeActionsRef = useRef<{
		seatStop: (key: string) => void
		publish: (order: readonly GridCursorRow[] | null) => void
	}>({ seatStop: () => {}, publish: () => {} })

	useLayoutEffect(() => {
		internal.active = active

		for (const listener of internal.listeners) listener()
	}, [active, internal])

	const storeRef = useRef<GridNavStore | null>(null)

	if (storeRef.current === null) {
		storeRef.current = {
			enabled: true,
			subscribe: (listener) => {
				internal.listeners.add(listener)

				return () => {
					internal.listeners.delete(listener)
				}
			},
			isActive: (row, col) => {
				const current = internal.active

				if (current === null || current.col !== col) return false

				const data = dataRowOf(current.row)

				return data !== -1 && data === row
			},
			isStopActive: (key) => {
				const current = internal.active

				return current !== null && stopAt(current.row)?.key === key
			},
			stopId,
			seatStop: (key) => storeActionsRef.current.seatStop(key),
			publish: (order) => storeActionsRef.current.publish(order),
		}
	}

	// Moves the cursor to a place in its order. A one-stop row keeps the column
	// the cursor came from, so a later step onto a data row lands in it again.
	const moveToCursor = useCallback(
		(coord: Coord) => {
			const colCount = colCountRef.current

			const row = clampRow(coord.row, count(), newRowRef.current)

			if (row === null || colCount === 0) return

			const col = clamp(coord.col, 0, colCount - 1)

			// Bring the target row into the virtualized window so its cell mounts
			// before `aria-activedescendant` points at it; a no-op when unwindowed.
			// The new-row slot sits outside the window, and is always mounted.
			if (row !== NEW_ROW_INDEX) scrollRowIntoViewRef.current?.(row, orderRef.current?.[row]?.key)

			setActive({ row, col })
		},
		[colCountRef, count, scrollRowIntoViewRef, newRowRef],
	)

	// The public move takes a data row index, as every caller outside this hook
	// speaks it. A data row that a published order does not show is not moved to.
	const moveTo = useCallback(
		(coord: Coord) => {
			const row = cursorRowOf(coord.row)

			if (row === -1) return

			moveToCursor({ row, col: coord.col })
		},
		[cursorRowOf, moveToCursor],
	)

	// Records the key of each row the cursor seats on, against the order it was
	// seated in. A later order looks the row up by that key.
	useLayoutEffect(() => {
		const entry =
			active && active.row !== NEW_ROW_INDEX ? orderRef.current?.[active.row] : undefined

		activeKeyRef.current = entry
			? { key: entry.key, parent: entry.kind === 'group' ? undefined : entry.parent }
			: null
	}, [active])

	storeActionsRef.current = {
		seatStop: (key) => {
			const row = orderRef.current?.findIndex((entry) => entry.key === key) ?? -1

			if (row !== -1) moveToCursor({ row, col: activeRef.current?.col ?? 0 })
		},
		publish: (order) => {
			if (order === orderRef.current) return

			orderRef.current = order

			cursorOfDataRef.current = cursorOfDataRows(order, rowIndexMapRef.current)

			const seated = activeKeyRef.current

			setActive((current) => reseat(current, order, seated))
		},
	}

	// Re-clamp the cursor to the current bounds when the data shrinks (filter,
	// paginate, hide a column), so the active cell — and the `aria-activedescendant`
	// it drives — never dangles past the rendered grid; clears it when the grid
	// empties. A no-op while in bounds (returns the same coord, so no re-render).
	const reconcile = useCallback(
		(rowCount: number, colCount: number) => {
			setActive((current) => {
				if (current === null) return null

				// A published order holds its own bounds; `rowCount` counts data rows.
				const rows = orderRef.current ? orderRef.current.length : rowCount

				const row = clampRow(current.row, rows, newRowRef.current)

				if (row === null || colCount === 0) return null

				const col = clamp(current.col, 0, colCount - 1)

				return row === current.row && col === current.col ? current : { row, col }
			})
		},
		[newRowRef],
	)

	// Activates the cell then the row under the cursor through the grid's
	// click bridges — the same cell-first order a pointer click fires in.
	const activateRow = useCallback(
		(event: KeyboardEvent<HTMLTableElement>, coord: Coord) => {
			const row = rowsRef.current[coord.row]

			if ((!hasRowActivate && !hasCellActivate) || row === undefined) return

			event.preventDefault()

			cellActivate(coord.row, coord.col, event)

			rowActivate(row, event)
		},
		[rowsRef, hasRowActivate, hasCellActivate],
	)

	// Space toggles the active row's selection in a selectable grid (APG grid) and
	// never scrolls the grid's own tab stop; Enter — and Space when the grid has no
	// selection — activates a clickable cell/row instead.
	const activateOrSelectRow = useCallback(
		(event: KeyboardEvent<HTMLTableElement>, coord: Coord) => {
			if (event.key === ' ') {
				event.preventDefault()

				if (selectableRef.current) {
					toggleActive(coord.row)

					return
				}
			}

			activateRow(event, coord)
		},
		[activateRow, selectableRef],
	)

	// The keys of a one-stop row at `base` (see `stopAction`). The cursor's arrows
	// and page keys still move off each kind. Returns whether it took the key.
	const onStopKey = useCallback(
		(event: KeyboardEvent<HTMLTableElement>, key: string, base: Coord): boolean => {
			const entry = stopAt(base.row)

			const action = entry ? stopAction(key, entry) : null

			if (!entry || action === null) return false

			event.preventDefault()

			if (action === 'toggle' && entry.kind === 'group') entry.toggle()
			else if (action === 'descend') moveToCursor({ row: base.row + 1, col: base.col })
			else if (action === 'enter') {
				const cell = document.getElementById(stopId(entry.key))

				cell?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
			}

			return true
		},
		[moveToCursor, stopAt, stopId],
	)

	// Enter and Space act on the active cell, and Escape unseats the cursor.
	const onCellKey = useCallback(
		(event: KeyboardEvent<HTMLTableElement>, base: Coord) => {
			if (event.key === 'Enter' || event.key === ' ') {
				activateOrSelectRow(event, { row: dataRowOf(base.row), col: base.col })
			} else if (event.key === 'Escape' && activeRef.current) {
				event.preventDefault()

				setActive(null)
			}
		},
		[activateOrSelectRow, dataRowOf],
	)

	const onKeyDown = useCallback(
		(event: KeyboardEvent<HTMLTableElement>) => {
			// Only keys landing on the `<table>` tab stop drive the cursor; a keystroke
			// bubbling up from a focusable descendant (an inline editor, a link) belongs
			// to that control — hijacking it freezes the caret and jumps the cursor.
			// One exception: Escape from a control in one of this grid's detail panels.
			if (event.target !== event.currentTarget) {
				escapeFromPanel(event)

				return
			}

			const order = {
				count: count(),
				slot: newRowRef.current,
				colCount: colCountRef.current,
			}

			// A grid with no cell takes no key. The cursor seeds at the first cell when
			// a key arrives before focus has.
			const first = seedCoord(false, order)

			if (!first) return

			const base = activeRef.current ?? first

			// In a right-to-left grid, the columns run from right to left. ArrowLeft
			// then moves to the next column (WAI-ARIA APG grid pattern), and the group
			// keys mirror in the same way.
			const key = logicalArrowKey(event.key, event.currentTarget)

			if (onStopKey(event, key, base)) return

			// `event.currentTarget` is the `<table>`; the page step is viewport-relative
			// (a no-op layout read for non-page keys, see `resolvePageStep`).
			const target = keyTarget(
				key,
				base,
				order,
				event.metaKey || event.ctrlKey,
				resolvePageStep(event.key, scrollContainerRef.current, event.currentTarget),
			)

			if (!target) {
				onCellKey(event, base)

				return
			}

			event.preventDefault()

			moveToCursor(target)
		},
		[moveToCursor, onCellKey, count, colCountRef, scrollContainerRef, newRowRef, onStopKey],
	)

	const onFocus = useCallback(
		(event: FocusEvent<HTMLTableElement>) => {
			// Seed only when the table itself takes focus (not a focusable descendant)
			// and the cursor is unseated.
			if (event.target !== event.currentTarget || activeRef.current) return

			const rel = event.relatedTarget

			if (rel instanceof Node && event.currentTarget.contains(rel)) return

			// Focus returning from a transient floating overlay (e.g. a context menu
			// portaled after the table) is not a Tab-into the grid; leave the cursor
			// unseated rather than seeding the last cell behind the dismissed menu.
			if (rel instanceof Element && rel.closest(FLOATING_PORTAL)) return

			// Entering backwards (Shift+Tab from after the grid) lands on the last cell;
			// forwards lands on the first. The new-row slot counts as a row of the order.
			const cameFromAfter =
				rel instanceof Node &&
				!!(event.currentTarget.compareDocumentPosition(rel) & Node.DOCUMENT_POSITION_FOLLOWING)

			const seed = seedCoord(cameFromAfter, {
				count: count(),
				slot: newRowRef.current,
				colCount: colCountRef.current,
			})

			if (seed) setActive(seed)
		},
		[count, colCountRef, newRowRef],
	)

	const onBlur = useCallback((event: FocusEvent<HTMLTableElement>) => {
		const next = event.relatedTarget

		// Keep the cursor while focus moves to focusable cell content inside the grid;
		// drop it only when focus leaves the table entirely.
		if (next instanceof Node && event.currentTarget.contains(next)) return

		// Keep it seated, too, while focus is in a floating overlay opened from the
		// grid (e.g. its context menu), so the active cell is restored on close —
		// mirrors the `onFocus` portal guard that declines to re-seed on return.
		if (next instanceof Element && next.closest(FLOATING_PORTAL)) return

		setActive(null)
	}, [])

	const activeStop = active ? stopAt(active.row) : undefined

	const activeDescendant = active
		? activeStop
			? stopId(activeStop.key)
			: cellId(dataRowOf(active.row), active.col)
		: undefined

	// The public cursor speaks data row indexes. On a one-stop row it names no cell.
	const publicActive = useMemo<Coord | null>(() => {
		if (!active || activeStop) return null

		const row = dataRowOf(active.row)

		return row === active.row ? active : { row, col: active.col }
	}, [active, activeStop, dataRowOf])

	const navTableProps: GridNavTableProps | undefined = enabled
		? {
				tabIndex: 0,
				'aria-activedescendant': activeDescendant,
				onKeyDown,
				onFocus,
				onBlur,
			}
		: undefined

	return {
		active: enabled ? publicActive : null,
		store: enabled ? storeRef.current : INERT_STORE,
		cellId,
		moveTo,
		reconcile,
		navTableProps,
	}
}
