'use client'

import {
	type FocusEvent,
	type KeyboardEvent,
	type MouseEvent,
	type RefObject,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createContext } from '../../core'
import { useIdScope } from '../../hooks'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { useStableEvent } from '../../hooks/use-stable-event'
import {
	clamp,
	createEmitter,
	FOCUSABLE_SELECTOR,
	noopSubscribe,
	sameElements,
} from '../../utilities'
import { FLOATING_PORTAL, NAV_PAGE_STEP } from './engine/grid-constants'
import { type GridRangeCells, inRangeRect, rangeCells, rangeRect } from './engine/grid-range/range'
import type { GridCellActivate, GridRowActivate } from './engine/grid-row/bridges'
import type { GridCursorRow } from './grid-cursor-order'
import type { GridFillHandle } from './use-grid-fill-handle'
import { useGridRangeDrag } from './use-grid-range-drag'

/**
 * Scrolls a row into the rendered window. A flat body reads `rowIndex`, the
 * data index. A grouped or master-detail body reads `key`, the item key. @internal
 */
export type GridScrollRowIntoView = (rowIndex: number, key?: string) => void

/**
 * Gives the cursor the row keys and the data column ids in display order, and
 * the place of the new-row slot. The cursor follows its cell into this layout
 * (see {@link useGridNavigation}). @internal
 */
export type GridReconcile = (
	rowKeys: readonly unknown[],
	columnIds: readonly unknown[],
	slot: GridNewRowPosition,
) => void

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
	/** Whether the cell at `(row, col)` is in the cell range (see {@link GridDataProps.range}). */
	isInRange: (row: number, col: number) => boolean
	/** The fill handle that the active cell holds, or `null` when the grid shows no handle. */
	fillHandle: GridFillHandle | null
	/** Whether the cursor sits on the one-stop row with this item key. */
	isStopActive: (key: string) => boolean
	/** The element id of the one cell of a one-stop row, matched by `aria-activedescendant`. */
	stopId: (key: string) => string
	/** Seats the cursor on the one-stop row with this item key, as a click on it does. */
	seatStop: (key: string) => void
	/**
	 * Whether the active cell has a change of the cursor to scroll into view.
	 * The first call after each change returns `true`, and each later call
	 * `false`. A row that a scroll brings back into a window mounts its active
	 * cell again, and that cell does not move the scroll a second time.
	 */
	claimReveal: () => boolean
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
	subscribe: noopSubscribe,
	isActive: () => false,
	isInRange: () => false,
	fillHandle: null,
	isStopActive: () => false,
	stopId: (key) => key,
	seatStop: () => {},
	claimReveal: () => false,
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

/** The keys that move the cursor. @internal */
const MOVEMENT_KEYS = new Set([
	'ArrowUp',
	'ArrowDown',
	'ArrowLeft',
	'ArrowRight',
	'Home',
	'End',
	'PageUp',
	'PageDown',
])

/**
 * Whether the browser keeps a movement key: Alt with any of them (history),
 * and Ctrl or Cmd with an arrow or a page key (history, a tab switch). Ctrl or
 * Cmd with Home and End stays the grid's, which jumps to its first or last cell.
 *
 * @internal
 */
function browserOwnsKey(event: KeyboardEvent): boolean {
	if (!MOVEMENT_KEYS.has(event.key)) return false

	if (event.altKey) return true

	return (event.metaKey || event.ctrlKey) && event.key !== 'Home' && event.key !== 'End'
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
 * The order and the row map that one render of the cursor reads: the published
 * order, or `null` for data rows only, and the row to data index map it was
 * resolved against. @internal
 */
type CursorView = {
	order: readonly GridCursorRow[] | null
	rowIndexMap: Map<unknown, number>
}

/** The data row index of a cursor row in `view`, or -1 for a row that holds no data. @internal */
function dataRowIn(view: CursorView, row: number): number {
	if (!view.order || row === NEW_ROW_INDEX) return row

	const entry = view.order[row]

	return entry?.kind === 'data' ? (view.rowIndexMap.get(entry.row) ?? -1) : -1
}

/** The one-stop entry at a cursor row in `order`, or `undefined` for a data row or the new-row slot. @internal */
function stopIn(order: readonly GridCursorRow[] | null, row: number): GridCursorRow | undefined {
	const entry = row === NEW_ROW_INDEX ? undefined : order?.[row]

	return entry && entry.kind !== 'data' ? entry : undefined
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
 * The index in `after` of the item at `index` in `before`, found by its key.
 * It is `null` when `after` does not hold the item. An index outside `before`
 * stays as it is. The check at the same index comes first, so an item that
 * keeps its place costs no search. @internal
 */
function followIndex(
	index: number,
	before: readonly unknown[],
	after: readonly unknown[],
): number | null {
	if (index < 0 || index >= before.length) return index

	const key = before[index]

	if (Object.is(after[index], key)) return index

	const next = after.indexOf(key)

	return next === -1 ? null : next
}

/** The row keys and the data column ids of one layout of the grid. @internal */
type CursorLayout = { rows: readonly unknown[]; cols: readonly unknown[] }

/**
 * Finds the cursor's cell again in a new layout: its column by the column id,
 * and its row by the row key when `byRow` is set. A body that publishes an
 * order finds its row in `publish` (see {@link reseat}), so it does not set
 * `byRow`. It returns `from` when the cell keeps its place. It returns a new
 * coord when the cell moved, or when its row or its column is gone. A cell that
 * is gone keeps the index of the part that is gone, and the clamp then gives the
 * nearest cell. @internal
 */
function followCell(from: Coord, seen: CursorLayout, next: CursorLayout, byRow: boolean): Coord {
	const row =
		byRow && from.row !== NEW_ROW_INDEX ? followIndex(from.row, seen.rows, next.rows) : from.row

	const col = followIndex(from.col, seen.cols, next.cols)

	if (row === from.row && col === from.col) return from

	return { row: row ?? from.row, col: col ?? from.col }
}

/**
 * `coord` clamped into the cursor's order and the data columns, or `null` when
 * the grid has no cell. It returns `current` itself when `coord` is `current`
 * and the clamp keeps its place, so a layout that moves nothing commits no
 * render. @internal
 */
function clampCoord(
	coord: Coord,
	current: Coord,
	bounds: { rows: number; cols: number; slot: GridNewRowPosition },
): Coord | null {
	const row = clampRow(coord.row, bounds.rows, bounds.slot)

	if (row === null || bounds.cols === 0) return null

	const col = clamp(coord.col, 0, bounds.cols - 1)

	return coord === current && row === current.row && col === current.col ? current : { row, col }
}

/** The row and the column at the end of a data cell's element id (see `cellId`). @internal */
const CELL_ID_TAIL = /cell-(\d+)-(\d+)$/

/**
 * The active cell of the cursor as an external store. The cells subscribe to
 * it, each to its own flag, and the event handlers read it. The hook writes it
 * in a layout effect, so every reader after a commit sees the value of that
 * commit. @internal
 */
function createActiveCursor() {
	let active: Coord | null = null

	// The anchor of the cell range, a place in the cursor's order, or `null`
	// for no range.
	let anchor: Coord | null = null

	// The count of the changes of the active cell, and the change that a cell
	// last scrolled into view.
	let changed = 0

	let revealed = 0

	const changes = createEmitter()

	return {
		get: (): Coord | null => active,
		getAnchor: (): Coord | null => anchor,
		set: (next: Coord | null, nextAnchor: Coord | null) => {
			if (next?.row !== active?.row || next?.col !== active?.col) changed++

			active = next

			anchor = nextAnchor

			changes.emit()
		},
		claimReveal: (): boolean => {
			if (revealed === changed) return false

			revealed = changed

			return true
		},
		subscribe: changes.subscribe,
	}
}

/**
 * Owns the read-only grid's keyboard cursor: a single active cell mirrored into
 * an external store. Only the cells whose active flag flips re-render, and the
 * cursor is exposed to assistive tech through `aria-activedescendant`. Arrow
 * keys, Home/End (row), Ctrl/Cmd+Home/End (grid), and PageUp/PageDown move the
 * cursor. Enter/Space activates the cell through `onCellActivate` then the row
 * through `onRowActivate`. Escape unseats it, and with no cursor drawn only a
 * movement key acts. A key that the browser keeps (Alt or Cmd with an arrow,
 * Ctrl with a page key) passes through. In a right-to-left grid, ArrowLeft
 * moves to the next column and ArrowRight to the previous one.
 *
 * A body that renders more than data rows publishes its order through the
 * store (see {@link GridCursorRow}). The cursor then walks that order: a group
 * header, a group total, and a detail panel are one stop each. A new order
 * reseats the cursor on the same row by its key, then on its parent row, then
 * at the same place clamped to the order, and clears it when the order is
 * empty.
 *
 * The bounds come from the published order, else from `rowsRef`/`colCountRef`,
 * at event time. The hook thus holds no stale counts, and its callbacks stay
 * referentially stable across renders. When `enabled` is false the hook is inert — `navTableProps`
 * is `undefined` and the store never reports an active cell — so a non-navigable
 * grid pays nothing.
 *
 * @returns The cursor handle:
 *
 * - The reactive `active` coord (drives `aria-activedescendant`).
 * - The subscription `store`.
 * - The `cellId` id-deriver matched by the active pointer.
 * - The clamped `moveTo` (for click-to-focus).
 * - The `reconcile` follow and re-clamp, which the grid runs as the layout changes.
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
	range = false,
}: {
	enabled: boolean
	/** Live rendered rows; backs cursor bounds and the Enter/Space row lookup. */
	rowsRef: RefObject<readonly unknown[]>
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
	scrollRowIntoViewRef: RefObject<GridScrollRowIntoView | null>
	/** The grid's scroll container, measured for the viewport-relative PageUp/Down step; null when the grid doesn't scroll. */
	scrollContainerRef: RefObject<HTMLElement | null>
	/** Where the new-row slot sits in the cursor's order, read at event time. */
	newRowRef: RefObject<GridNewRowPosition>
	/** Live row → data index map; turns a data row of a published order into a data index. */
	rowIndexMapRef: RefObject<Map<unknown, number>>
	/** Whether the cursor holds a cell range (see {@link GridDataProps.range}). */
	range?: boolean
}): {
	active: Coord | null
	store: GridNavStore
	cellId: (row: number, col: number) => string
	moveTo: (coord: Coord) => void
	/**
	 * Follows the active cell into a new layout of the row keys and the data
	 * column ids, and clamps it to the new bounds and the new-row slot. It also
	 * ends the cell range when the layout changes. The grid drives it as the
	 * data and the columns change.
	 */
	reconcile: GridReconcile
	/**
	 * Seats the cursor on a pressed data cell. With the range on, Shift extends
	 * the range to the cell, and a press without it can start a drag.
	 */
	seat: (coord: Coord, event: MouseEvent<HTMLElement>) => void
	/** Moves the cursor to a data cell, and keeps the range anchor where it is. */
	extendTo: (coord: Coord) => void
	/** The data cell that an element id names, or `null` for another id. */
	cellCoordOf: (id: string) => Coord | null
	/** The anchor of the range, reactive, so a reader can follow a change of the range. */
	rangeAnchor: Coord | null
	/** The cells of the range at call time, or `null` for no range. */
	readRange: () => GridRangeCells | null
	/** Shows the range between two data cells, the first as the anchor and the second as the cursor. */
	showRange: (from: Coord, to: Coord) => void
	navTableProps: GridNavTableProps | undefined
} {
	const [active, setActive] = useState<Coord | null>(null)

	// The anchor of the cell range, a place in the cursor's order, or `null` for
	// no range. The cursor is the other corner.
	const [anchor, setAnchor] = useState<Coord | null>(null)

	// Read the row- and cell-click as stable events, so the key handler's deps
	// stay stable when the consumer passes inline callbacks. Whether each one is
	// present stays in the deps, because Enter is claimed only when one is.
	const hasRowActivate = onRowActivate !== undefined

	const hasCellActivate = onCellActivate !== undefined

	const rowActivate = useStableEvent((row: unknown, event: KeyboardEvent<HTMLTableElement>) =>
		onRowActivate?.(row, event),
	)

	const cellActivate = useStableEvent(
		(rowIdx: number, colIdx: number, event: KeyboardEvent<HTMLTableElement>) =>
			onCellActivate?.(rowIdx, colIdx, event),
	)

	// Read selection toggling as a stable event, so the key handler's deps stay stable.
	const toggleActive = useStableEvent((rowIdx: number) => toggleActiveRow?.(rowIdx))

	const { sub } = useIdScope()

	const cellId = useCallback((row: number, col: number) => sub(`cell-${row}-${col}`), [sub])

	// Mirror the active cell into an external store so each cell subscribes to its
	// own active flag: moving the cursor re-renders only the two cells whose flag
	// flipped, not every rendered cell.
	const [internal] = useState(createActiveCursor)

	const { get: readActive } = internal

	// The order of a body that renders more than data rows, or `null` for data rows
	// only. Inside this hook `active.row` is a place in that order. The public API
	// speaks data row indexes either way, so no caller learns of the order.
	const orderRef = useRef<readonly GridCursorRow[] | null>(null)

	const cursorOfDataRef = useRef<Map<number, number>>(new Map())

	// The order and the row map as this hook's render reads them. The refs above
	// serve the event handlers and the cells, which read at their own time. The
	// view changes with each published order, and with each new row map while a
	// body publishes one.
	const [view, setView] = useState<CursorView>(() => ({ order: null, rowIndexMap: new Map() }))

	// The item key and parent of the active row, read against the order it was
	// seated in, so a new order can find the same row again.
	const activeKeyRef = useRef<{ key: string; parent: string | undefined } | null>(null)

	const count = useCallback(() => orderRef.current?.length ?? rowsRef.current.length, [rowsRef])

	/** The data row index of a cursor row, or -1 for a row that holds no data. */
	const dataRowOf = useCallback(
		(row: number): number =>
			dataRowIn({ order: orderRef.current, rowIndexMap: rowIndexMapRef.current }, row),
		[rowIndexMapRef],
	)

	/** The cursor row of a data row index, or -1 for a data row the order does not show. */
	const cursorRowOf = useCallback((row: number): number => {
		if (!orderRef.current || row === NEW_ROW_INDEX) return row

		return cursorOfDataRef.current.get(row) ?? -1
	}, [])

	/** The one-stop entry at a cursor row, or `undefined` for a data row or the new-row slot. */
	const stopAt = useCallback((row: number) => stopIn(orderRef.current, row), [])

	const stopId = useCallback((key: string) => sub(`stop-${key}`), [sub])

	useLayoutEffect(() => internal.set(active, anchor), [active, anchor, internal])

	// The anchor that a move with the range on keeps: the one held, else the
	// cell the cursor leaves. A range starts only at a data cell, so a one-stop
	// row or the new-row slot sets none.
	const holdAnchor = useCallback(() => {
		const from = readActive()

		const seed = from && from.row !== NEW_ROW_INDEX && dataRowOf(from.row) !== -1 ? from : null

		setAnchor((held) => held ?? seed)
	}, [readActive, dataRowOf])

	// The two corners of the range at call time, or `null` for no range.
	const readCorners = useCallback(() => {
		const from = internal.getAnchor()

		const to = readActive()

		if (!from || !to || to.row === NEW_ROW_INDEX) return null

		return { from, to }
	}, [internal, readActive])

	// Moves the cursor to a place in its order. A one-stop row keeps the column
	// the cursor came from, so a later step onto a data row lands in it again.
	// A move that extends the range keeps its anchor, and any other move ends
	// the range. With the range off, no move extends. A move to a cell that the
	// reader points at (`shown`) needs no scroll of the window. A scroll there
	// would fight the scroll of a drag at an edge.
	const moveToCursor = useCallback(
		(coord: Coord, extend = false, shown = false) => {
			const colCount = colCountRef.current

			const row = clampRow(coord.row, count(), newRowRef.current)

			if (row === null || colCount === 0) return

			if (extend && range) holdAnchor()
			else setAnchor(null)

			const col = clamp(coord.col, 0, colCount - 1)

			// Bring the target row into the virtualized window so its cell mounts
			// before `aria-activedescendant` points at it; a no-op when unwindowed.
			// The new-row slot sits outside the window, and is always mounted.
			if (row !== NEW_ROW_INDEX && !shown) {
				scrollRowIntoViewRef.current?.(row, orderRef.current?.[row]?.key)
			}

			// A move that stays put, such as a held arrow at an edge, keeps the coord,
			// so it commits no render.
			setActive((current) =>
				current && current.row === row && current.col === col ? current : { row, col },
			)
		},
		[colCountRef, count, scrollRowIntoViewRef, newRowRef, holdAnchor, range],
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

	// Extends the range to a data cell, as Shift with a click or a drag does. The
	// pointer is on the cell, so the cell is in the window.
	const extendTo = useCallback(
		(coord: Coord) => {
			const row = cursorRowOf(coord.row)

			if (row === -1 || !range) return

			moveToCursor({ row, col: coord.col }, true, true)
		},
		[cursorRowOf, moveToCursor, range],
	)

	const cellCoordOf = useCallback(
		(id: string): Coord | null => {
			const match = CELL_ID_TAIL.exec(id)

			if (!match) return null

			const coord = { row: Number(match[1]), col: Number(match[2]) }

			// The id must be one that this grid gave, not one of a nested grid.
			return cellId(coord.row, coord.col) === id ? coord : null
		},
		[cellId],
	)

	const startDrag = useGridRangeDrag({ onCell: extendTo, cellCoordOf, scrollContainerRef })

	// Shows the range between two data cells, the first as its anchor and the
	// second as the cursor, as the drag of the fill handle grows it. The pointer
	// is on the second cell, so the cell is in the window.
	const showRange = useCallback(
		(from: Coord, to: Coord) => {
			const anchorRow = cursorRowOf(from.row)

			const row = cursorRowOf(to.row)

			if (anchorRow === -1 || row === -1 || !range) return

			setAnchor((held) =>
				held?.row === anchorRow && held.col === from.col ? held : { row: anchorRow, col: from.col },
			)

			setActive((current) =>
				current?.row === row && current.col === to.col ? current : { row, col: to.col },
			)
		},
		[cursorRowOf, range],
	)

	// A press on a data cell. Without the range, it only seats the cursor. With
	// it, the grid owns the press, so the browser starts no text selection.
	// Whether the cell at a data row and a column is inside the range.
	const inRangeAt = useCallback(
		(row: number, col: number) => {
			const corners = readCorners()

			if (corners === null) return false

			const rect = rangeRect(corners.from, corners.to)

			const place = orderRef.current ? (cursorOfDataRef.current.get(row) ?? -1) : row

			return place !== -1 && inRangeRect(rect, place, col)
		},
		[readCorners],
	)

	const seat = useCallback(
		(coord: Coord, event: MouseEvent<HTMLElement>) => {
			if (!range) {
				moveTo(coord)

				return
			}

			// A press of another button, such as the one that opens the context
			// menu, keeps a range that holds the cell, so the menu can act on it.
			if (event.button !== 0 && inRangeAt(coord.row, coord.col)) return

			event.preventDefault()

			if (event.shiftKey) {
				extendTo(coord)

				return
			}

			moveTo(coord)

			startDrag(event)
		},
		[range, moveTo, extendTo, startDrag, inRangeAt],
	)

	const readRange = useCallback((): GridRangeCells | null => {
		const corners = readCorners()

		return corners ? rangeCells(corners.from, corners.to, dataRowOf) : null
	}, [readCorners, dataRowOf])

	// Records the key of each row the cursor seats on, against the order it was
	// seated in. A later order looks the row up by that key. A new order counts
	// too: a reseat that clamps to the same place keeps the coord, but the row
	// at that place is another one.
	useLayoutEffect(() => {
		const entry = active && active.row !== NEW_ROW_INDEX ? view.order?.[active.row] : undefined

		activeKeyRef.current = entry
			? { key: entry.key, parent: entry.kind === 'group' ? undefined : entry.parent }
			: null
	}, [active, view.order])

	// The store's actions. A stop row seats the cursor from an event, and a body
	// publishes its order from a layout effect, never during render.
	const seatStop = useStableEvent((key: string) => {
		const row = orderRef.current?.findIndex((entry) => entry.key === key) ?? -1

		if (row !== -1) moveToCursor({ row, col: readActive()?.col ?? 0 })
	})

	const publish = useStableEvent((order: readonly GridCursorRow[] | null) => {
		if (order === orderRef.current) return

		orderRef.current = order

		cursorOfDataRef.current = cursorOfDataRows(order, rowIndexMapRef.current)

		setView({ order, rowIndexMap: rowIndexMapRef.current })

		// A new order moves the places under the range.
		setAnchor(null)

		const seated = activeKeyRef.current

		setActive((current) => reseat(current, order, seated))
	})

	// Built once. The cells call `isActive` and `isStopActive` in their render,
	// through `useSyncExternalStore`, so those two stay plain methods. They read
	// the order when a cell calls them.
	const [store] = useState<GridNavStore>(() => ({
		enabled: true,
		subscribe: internal.subscribe,
		isActive: (row, col) => {
			const current = readActive()

			if (current === null || current.col !== col) return false

			const data = dataRowOf(current.row)

			return data !== -1 && data === row
		},
		isInRange: inRangeAt,
		fillHandle: null,
		isStopActive: (key) => {
			const current = readActive()

			return current !== null && stopAt(current.row)?.key === key
		},
		stopId,
		seatStop,
		claimReveal: internal.claimReveal,
		publish,
	}))

	// The row keys and the data column ids that the cursor last saw.
	const layoutRef = useRef<CursorLayout | null>(null)

	// Follows the active cell into a new layout of the grid, and clamps it to the
	// new bounds. A sort, a filter, a page, or a column change can move the cell.
	// The cursor finds its column again by the column id. A flat body finds its
	// row again by the row key. A body that publishes an order finds its row in
	// `publish`. When the row or the column is gone, the cursor keeps its index,
	// and the clamp gives the nearest cell. The cursor never dangles past the
	// rendered grid, and it clears when the grid empties. A layout with the same
	// cells costs one pass over the keys, and it commits no render.
	const reconcile = useCallback(
		(rowKeys: readonly unknown[], columnIds: readonly unknown[], slot: GridNewRowPosition) => {
			const seen = layoutRef.current

			const next = { rows: rowKeys, cols: columnIds }

			layoutRef.current = next

			const moved =
				seen !== null && !(sameElements(seen.rows, rowKeys) && sameElements(seen.cols, columnIds))

			// The cells under the range moved, so its rectangle names other cells now.
			if (moved) setAnchor(null)

			const from = readActive()

			const followed =
				moved && from ? followCell(from, seen, next, orderRef.current === null) : from

			// Bring a row that moved into the virtualized window, as a move does.
			if (followed && from && followed.row !== from.row && followed.row !== NEW_ROW_INDEX) {
				scrollRowIntoViewRef.current?.(followed.row)
			}

			setActive((current) => {
				if (current === null) return null

				// A `publish` in this commit can queue a reseat first. The reseat
				// found its row, so the cursor only clamps here.
				const base = current === from && followed ? followed : current

				// A published order holds its own bounds; `rowKeys` counts data rows.
				const rows = orderRef.current ? orderRef.current.length : rowKeys.length

				return clampCoord(base, current, { rows, cols: columnIds.length, slot })
			})
		},
		[readActive, scrollRowIntoViewRef],
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
		[rowsRef, hasRowActivate, hasCellActivate, cellActivate, rowActivate],
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
		[activateRow, selectableRef, toggleActive],
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
			} else if (event.key === 'Escape' && readActive()) {
				event.preventDefault()

				// The first Escape ends the range, and the next one clears the cursor.
				if (internal.getAnchor()) setAnchor(null)
				else setActive(null)
			}
		},
		[activateOrSelectRow, dataRowOf, readActive, internal],
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

			// A browser shortcut keeps its key: history on Alt or Cmd with an arrow, a
			// tab switch on Ctrl with a page key.
			if (browserOwnsKey(event)) return

			// A grid with no cell takes no key. The cursor seeds at the first cell when
			// a key arrives before focus has.
			const first = seedCoord(false, order)

			if (!first) return

			const active = readActive()

			// With no cursor drawn, as after Escape, only a movement key acts: it seats
			// the cursor. Enter or Space on a cell the reader cannot see does nothing.
			if (!active && !MOVEMENT_KEYS.has(event.key)) return

			const base = active ?? first

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

			// Shift with a movement key extends the range, when the range is on.
			moveToCursor(target, event.shiftKey)
		},
		[
			moveToCursor,
			onCellKey,
			count,
			colCountRef,
			scrollContainerRef,
			newRowRef,
			onStopKey,
			readActive,
		],
	)

	const onFocus = useCallback(
		(event: FocusEvent<HTMLTableElement>) => {
			// Seed only when the table itself takes focus (not a focusable descendant)
			// and the cursor is unseated.
			if (event.target !== event.currentTarget || readActive()) return

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

			// Through `moveToCursor`, so a windowed body brings the row in first and
			// `aria-activedescendant` names a cell that is mounted.
			if (seed) moveToCursor(seed)
		},
		[count, colCountRef, newRowRef, readActive, moveToCursor],
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

		// Keep it seated, too, while the whole window loses focus (a switch of the
		// window or the tab), so the reader comes back to the same cell.
		if (next === null && !document.hasFocus()) return

		setActive(null)

		setAnchor(null)
	}, [])

	// The grid writes the row map during its render, after this hook. Under a
	// published order, a new map reaches the view here, and the render that
	// follows reads it before paint. The map of data rows to cursor rows follows
	// it, because a row that joins a closed group moves every later data index
	// while the order stays equal. The update reads the view it replaces: a
	// `publish` in this commit already queued the newer order.
	useLayoutEffect(() => {
		const order = orderRef.current

		const rowIndexMap = rowIndexMapRef.current

		if (order === null || view.rowIndexMap === rowIndexMap) return

		cursorOfDataRef.current = cursorOfDataRows(order, rowIndexMap)

		setView((current) =>
			current.rowIndexMap === rowIndexMap ? current : { order: current.order, rowIndexMap },
		)
	})

	const activeStop = active ? stopIn(view.order, active.row) : undefined

	const activeDescendant = active
		? activeStop
			? stopId(activeStop.key)
			: cellId(dataRowIn(view, active.row), active.col)
		: undefined

	// The public cursor speaks data row indexes. On a one-stop row it names no cell.
	const publicActive = useMemo<Coord | null>(() => {
		if (!active || activeStop) return null

		const row = dataRowIn(view, active.row)

		return row === active.row ? active : { row, col: active.col }
	}, [active, activeStop, view])

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
		store: enabled ? store : INERT_STORE,
		cellId,
		moveTo,
		reconcile,
		seat,
		extendTo,
		cellCoordOf,
		rangeAnchor: enabled ? anchor : null,
		readRange,
		showRange,
		navTableProps,
	}
}
