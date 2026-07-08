'use client'

import {
	type FocusEvent,
	type KeyboardEvent,
	type RefObject,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { createContext } from '../../core'
import { useIdScope } from '../../hooks'
import { clamp } from '../../utilities'
import { NAV_PAGE_STEP } from './grid-constants'

/** Zero-based cursor position over the grid's data cells, in display order. @internal */
export type Coord = { row: number; col: number }

/**
 * Activates the row under the cursor on Enter/Space. The originating event is the
 * grid `<table>` (the cursor's single tab stop), not a `<tr>`, so this is decoupled
 * from the grid's row-click handler; `Grid` bridges the two.
 *
 * @internal
 */
export type GridRowActivate = (row: unknown, event: KeyboardEvent<HTMLTableElement>) => void

/**
 * Activates the data cell under the cursor on Enter/Space, ahead of the row
 * activation — the keyboard counterpart of the grid's cell click, addressed by
 * the cursor's display-index coord; `Grid` resolves it to the cell context.
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
	subscribe: (listener: () => void) => () => void
	/** Whether the cell at `(row, col)` is currently the active cursor cell. */
	isActive: (row: number, col: number) => boolean
}

/** Provides the read-only cursor store to the cell markers under a `navigable` grid. @internal */
export const [GridNavContext, useGridNavContext] = createContext<GridNavStore>('GridNav')

/** Inert store for a non-navigable grid, so the hook can return a stable shape unconditionally. @internal */
const INERT_STORE: GridNavStore = { subscribe: () => () => {}, isActive: () => false }

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
 * the key doesn't move the cursor. Arrows step one cell; Home/End jump to the
 * row's edges, or the grid's first/last cell with Ctrl/Cmd (`toGrid`); PageUp/Down
 * jump `pageStep` rows (a viewport-relative count, see {@link resolvePageStep}).
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
 * The number of rows a PageUp/PageDown jumps: a viewport-page of rows, measured
 * from the grid's scroll container height and a rendered row's height (one row of
 * overlap kept for context), so a tall grid pages by what's visible rather than a
 * fixed count. Returns {@link NAV_PAGE_STEP} for any non-page key (no layout read),
 * and as the fallback when there is no scroll container (a fully-visible grid) or
 * the rows can't be measured (jsdom).
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
 * Owns the read-only grid's keyboard cursor: a single active cell mirrored into
 * an external store (so only the cells whose active flag flips re-render) and
 * exposed to assistive tech through `aria-activedescendant`. Arrow keys, Home/End
 * (row), Ctrl/Cmd+Home/End (grid), and PageUp/PageDown move the cursor;
 * Enter/Space activates the cell through `onCellActivate` then the row through
 * `onRowActivate`; Escape unseats it.
 *
 * Bounds and the active row come from `rowsRef`/`colCountRef` at event time, so
 * the hook holds no stale counts and its callbacks stay referentially stable
 * across renders. When `enabled` is false the hook is inert — `navTableProps`
 * is `undefined` and the store never reports an active cell — so a non-navigable
 * grid pays nothing.
 *
 * @returns The reactive `active` coord (drives `aria-activedescendant`), the
 *   subscription `store`, the `cellId` id-deriver matched by the active pointer,
 *   the clamped `moveTo` (for click-to-focus), and `navTableProps` to spread onto
 *   the `<table>` (or `undefined` when disabled).
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
	/** Scrolls a row into the virtualized window before the cursor lands on it; null when unwindowed. */
	scrollRowIntoViewRef: RefObject<((rowIndex: number) => void) | null>
	/** The grid's scroll container, measured for the viewport-relative PageUp/Down step; null when the grid doesn't scroll. */
	scrollContainerRef: RefObject<HTMLElement | null>
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

	// Read the row- and cell-click through refs so the key handler's deps stay
	// stable when the consumer passes inline callbacks.
	const onRowActivateRef = useRef(onRowActivate)

	onRowActivateRef.current = onRowActivate

	const onCellActivateRef = useRef(onCellActivate)

	onCellActivateRef.current = onCellActivate

	// Read selection toggling through a ref so the key handler's deps stay stable.
	const toggleActiveRowRef = useRef(toggleActiveRow)

	toggleActiveRowRef.current = toggleActiveRow

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

	useLayoutEffect(() => {
		internal.active = active

		for (const listener of internal.listeners) listener()
	}, [active, internal])

	const storeRef = useRef<GridNavStore | null>(null)

	if (storeRef.current === null) {
		storeRef.current = {
			subscribe: (listener) => {
				internal.listeners.add(listener)

				return () => {
					internal.listeners.delete(listener)
				}
			},
			isActive: (row, col) => internal.active?.row === row && internal.active?.col === col,
		}
	}

	const moveTo = useCallback(
		(coord: Coord) => {
			const rowCount = rowsRef.current.length

			const colCount = colCountRef.current

			if (rowCount === 0 || colCount === 0) return

			const row = clamp(coord.row, 0, rowCount - 1)

			const col = clamp(coord.col, 0, colCount - 1)

			// Bring the target row into the virtualized window so its cell mounts
			// before `aria-activedescendant` points at it; a no-op when unwindowed.
			scrollRowIntoViewRef.current?.(row)

			setActive({ row, col })
		},
		[rowsRef, colCountRef, scrollRowIntoViewRef],
	)

	// Re-clamp the cursor to the current bounds when the data shrinks (filter,
	// paginate, hide a column), so the active cell — and the `aria-activedescendant`
	// it drives — never dangles past the rendered grid; clears it when the grid
	// empties. A no-op while in bounds (returns the same coord, so no re-render).
	const reconcile = useCallback((rowCount: number, colCount: number) => {
		setActive((current) => {
			if (current === null) return null

			if (rowCount === 0 || colCount === 0) return null

			const row = clamp(current.row, 0, rowCount - 1)

			const col = clamp(current.col, 0, colCount - 1)

			return row === current.row && col === current.col ? current : { row, col }
		})
	}, [])

	// Activates the cell then the row under the cursor through the grid's
	// click bridges — the same cell-first order a pointer click fires in.
	const activateRow = useCallback(
		(event: KeyboardEvent<HTMLTableElement>, coord: Coord) => {
			const activate = onRowActivateRef.current

			const activateCell = onCellActivateRef.current

			const row = rowsRef.current[coord.row]

			if ((!activate && !activateCell) || row === undefined) return

			event.preventDefault()

			activateCell?.(coord.row, coord.col, event)

			activate?.(row, event)
		},
		[rowsRef],
	)

	// Space toggles the active row's selection in a selectable grid (APG grid) and
	// never scrolls the grid's own tab stop; Enter — and Space when the grid has no
	// selection — activates a clickable cell/row instead.
	const activateOrSelectRow = useCallback(
		(event: KeyboardEvent<HTMLTableElement>, coord: Coord) => {
			if (event.key === ' ') {
				event.preventDefault()

				if (selectableRef.current) {
					toggleActiveRowRef.current?.(coord.row)

					return
				}
			}

			activateRow(event, coord)
		},
		[activateRow, selectableRef],
	)

	const onKeyDown = useCallback(
		(event: KeyboardEvent<HTMLTableElement>) => {
			// Only keys landing on the `<table>` tab stop drive the cursor; a keystroke
			// bubbling up from a focusable descendant (an inline editor, a link) belongs
			// to that control — hijacking it freezes the caret and jumps the cursor.
			if (event.target !== event.currentTarget) return

			const rowCount = rowsRef.current.length

			const colCount = colCountRef.current

			if (rowCount === 0 || colCount === 0) return

			// The cursor seeds at the first cell when a key arrives before focus has.
			const base = activeRef.current ?? { row: 0, col: 0 }

			// `event.currentTarget` is the `<table>`; the page step is viewport-relative
			// (a no-op layout read for non-page keys, see `resolvePageStep`).
			const target = navTarget(
				event.key,
				base,
				rowCount,
				colCount,
				event.metaKey || event.ctrlKey,
				resolvePageStep(event.key, scrollContainerRef.current, event.currentTarget),
			)

			if (target) {
				event.preventDefault()

				moveTo(target)
			} else if (event.key === 'Enter' || event.key === ' ') {
				activateOrSelectRow(event, base)
			} else if (event.key === 'Escape' && activeRef.current) {
				event.preventDefault()

				setActive(null)
			}
		},
		[moveTo, activateOrSelectRow, rowsRef, colCountRef, scrollContainerRef],
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
			if (rel instanceof Element && rel.closest('[data-floating-ui-portal]')) return

			const rowCount = rowsRef.current.length

			const colCount = colCountRef.current

			if (rowCount === 0 || colCount === 0) return

			// Entering backwards (Shift+Tab from after the grid) lands on the last cell;
			// forwards lands on the first.
			const cameFromAfter =
				rel instanceof Node &&
				!!(event.currentTarget.compareDocumentPosition(rel) & Node.DOCUMENT_POSITION_FOLLOWING)

			setActive(cameFromAfter ? { row: rowCount - 1, col: colCount - 1 } : { row: 0, col: 0 })
		},
		[rowsRef, colCountRef],
	)

	const onBlur = useCallback((event: FocusEvent<HTMLTableElement>) => {
		const next = event.relatedTarget

		// Keep the cursor while focus moves to focusable cell content inside the grid;
		// drop it only when focus leaves the table entirely.
		if (next instanceof Node && event.currentTarget.contains(next)) return

		// Keep it seated, too, while focus is in a floating overlay opened from the
		// grid (e.g. its context menu), so the active cell is restored on close —
		// mirrors the `onFocus` portal guard that declines to re-seed on return.
		if (next instanceof Element && next.closest('[data-floating-ui-portal]')) return

		setActive(null)
	}, [])

	const navTableProps: GridNavTableProps | undefined = enabled
		? {
				tabIndex: 0,
				'aria-activedescendant': active ? cellId(active.row, active.col) : undefined,
				onKeyDown,
				onFocus,
				onBlur,
			}
		: undefined

	return {
		active: enabled ? active : null,
		store: enabled ? storeRef.current : INERT_STORE,
		cellId,
		moveTo,
		reconcile,
		navTableProps,
	}
}
