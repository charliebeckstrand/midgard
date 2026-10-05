'use client'

import {
	type ComponentProps,
	type MouseEvent,
	type PointerEvent,
	type ReactNode,
	type RefObject,
	useCallback,
	useLayoutEffect,
	useRef,
	useSyncExternalStore,
} from 'react'
import { composeEventHandlers } from '../../core'
import { GRID_ROLE } from './engine/grid-constants'
import { fromInteractiveContent } from './engine/grid-row/cell'
import { clearStickyChrome, obscuringInsets, setScrollMargin } from './engine/grid-sticky-insets'
import type { GridColumn } from './types'
import { type Coord, useGridNavContext } from './use-grid-navigation'
import type { GridTouchEntry } from './use-grid-touch-entry'

/**
 * Active-cell flag for one navigable cell. Subscribes to the cursor store, and
 * toggles `data-active` on its owning `role="gridcell"` `<td>` when this cell
 * becomes (or stops being) the active one. The `<td>`'s `cellProps` are
 * non-reactive, so the memoized row holds across cursor moves. The styling
 * therefore rides this imperative attribute instead. A cell in the range of
 * the cursor carries `data-in-range` in the same way. The active cell also
 * scrolls into view, clear of the grid's sticky header and pinned columns.
 * Renders a hidden locator span, not a wrapper,
 * so cell layout is untouched. While the grid can fill, the active cell also
 * holds the fill handle, which one overlay shows (see {@link GridNavStore.fillHandle}).
 *
 * @internal
 */
export function GridNavCell({
	row = -1,
	col = -1,
	stop,
	children,
}: {
	row?: number
	col?: number
	/** The item key of a one-stop row, whose one cell this marks in place of `row`/`col`. */
	stop?: string
	children?: ReactNode
}) {
	const store = useGridNavContext()

	const ref = useRef<HTMLSpanElement>(null)

	const isActive = useSyncExternalStore(
		store.subscribe,
		useCallback(
			() => (stop === undefined ? store.isActive(row, col) : store.isStopActive(stop)),
			[store, row, col, stop],
		),
		() => false,
	)

	// A one-stop row holds no cell of a range.
	const isInRange = useSyncExternalStore(
		store.subscribe,
		useCallback(() => stop === undefined && store.isInRange(row, col), [store, row, col, stop]),
		() => false,
	)

	const fillHandle = stop === undefined && isActive ? store.fillHandle : null

	// The active cell holds the fill handle, which one overlay shows on it.
	useLayoutEffect(() => {
		const cell = ref.current?.closest<HTMLElement>('[role="gridcell"]')

		if (!cell || !fillHandle) return

		return fillHandle.hold(cell)
	}, [fillHandle])

	// A render of the cell can move it, so the handle takes its place again.
	useLayoutEffect(() => {
		fillHandle?.place()
	})

	// Its own effect, so a change of the range does not scroll the active cell.
	useLayoutEffect(() => {
		const cell = ref.current?.closest<HTMLElement>('[role="gridcell"]')

		if (!cell) return

		cell.toggleAttribute('data-in-range', isInRange)

		return () => {
			cell.removeAttribute('data-in-range')
		}
	}, [isInRange])

	useLayoutEffect(() => {
		const cell = ref.current?.closest<HTMLElement>('[role="gridcell"]')

		if (!cell) return

		cell.toggleAttribute('data-active', isActive)

		// A cell scrolls into view once for each change of the cursor. A cell that
		// mounts active again, as a scroll brings its row back into a window,
		// leaves the scroll where the reader put it.
		if (isActive && store.claimReveal()) {
			// Hold the cell clear of the grid's sticky header and pinned columns as it
			// scrolls into view, so the focus indicator is never obscured (WCAG 2.4.11).
			const insets = obscuringInsets(cell)

			setScrollMargin(cell, 'scrollMarginTop', insets.top)

			setScrollMargin(cell, 'scrollMarginBottom', insets.bottom)

			setScrollMargin(cell, 'scrollMarginLeft', insets.left)

			setScrollMargin(cell, 'scrollMarginRight', insets.right)

			cell.scrollIntoView({ block: 'nearest', inline: 'nearest' })

			clearStickyChrome(cell, insets)
		}

		return () => {
			cell.removeAttribute('data-active')
		}
	}, [isActive, store])

	return (
		<>
			{children}
			<span ref={ref} hidden />
		</>
	)
}

/**
 * The cursor-seating `cellProps` shared by the navigable and editable column
 * projections: a stable per-cell id, `role="gridcell"`, and a click-to-seat
 * `onMouseDown`. That handler moves the cursor to this cell, and pulls focus onto
 * the grid container. It stands down where the click landed on focusable cell
 * content: links, buttons, an editor. It also stands down for a press in a
 * portal that the cell renders. Merged over the consumer's own `cellProps` and any `extra`
 * attributes the caller layers on (the editable projection adds `aria-readonly`).
 * A column's own `onMouseDown` runs first, and its `preventDefault()` does not
 * stop the seat, because the cursor is a roving model (CONVENTIONS.md §3.9).
 * With `touch`, the cell also gives its press, lift, and touch end to the
 * touch entry of the editing layer (see {@link touchEntryProps}).
 *
 * @internal
 */
export function seatingCellProps<T>(args: {
	col: GridColumn<T>
	row: T
	/** The row's 0-based place in the view. */
	rowIdx: number
	colIndexMapRef: RefObject<Map<string | number, number>>
	cellId: (row: number, col: number) => string
	/** Seats the cursor on a pressed cell (see `useGridNavigation`). */
	seat: (coord: Coord, event: MouseEvent<HTMLElement>) => void
	extra?: ComponentProps<'td'>
	/** The touch entry of an editable cell under a grid-owned session, else `undefined`. */
	touch?: GridTouchEntry | undefined
}): ComponentProps<'td'> {
	const { col, row, rowIdx, colIndexMapRef, cellId, seat, extra, touch } = args

	const colIdx = colIndexMapRef.current.get(col.id) ?? -1

	const prev = col.cellProps?.(row)

	return {
		...prev,
		...extra,
		id: cellId(rowIdx, colIdx),
		role: 'gridcell',
		onMouseDown: composeEventHandlers(
			prev?.onMouseDown,
			(event: MouseEvent<HTMLTableCellElement>) => {
				// A press in a portal that the cell renders, such as an editor's open
				// listbox, reaches the cell through the React tree. It is not a press
				// on the cell, so it must not pull focus onto the grid.
				const inCell = event.target instanceof Node && event.currentTarget.contains(event.target)

				if (inCell && !fromInteractiveContent(event.target)) {
					event.currentTarget.closest<HTMLElement>(GRID_ROLE)?.focus()

					seat({ row: rowIdx, col: colIdx }, event)
				}
			},
			{ checkForDefaultPrevented: false },
		),
		...(touch ? touchEntryProps(touch, { row: rowIdx, col: colIdx }, prev) : undefined),
	}
}

/**
 * The touch handlers of one editable cell, merged over the handlers of the
 * column's `cellProps`. The column's handler runs first. Its `preventDefault()`
 * on the press or the lift stops the open, because a tap that opens a cell is
 * side behavior. A move, a cancel, and a touch end keep the state of the
 * gesture true, so they run whatever the column does (CONVENTIONS.md §3.9).
 *
 * A press on focusable content in the cell, such as an open editor, or in a
 * portal that the cell renders, gives no cell. Such a press opens nothing.
 *
 * @internal
 */
function touchEntryProps(
	touch: GridTouchEntry,
	coord: Coord,
	prev: ComponentProps<'td'> | undefined,
): ComponentProps<'td'> {
	return {
		onPointerDown: composeEventHandlers(
			prev?.onPointerDown,
			(event: PointerEvent<HTMLTableCellElement>) => {
				const inCell = event.target instanceof Node && event.currentTarget.contains(event.target)

				touch.onPointerDown(inCell && !fromInteractiveContent(event.target) ? coord : null, event)
			},
		),
		onPointerMove: composeEventHandlers(prev?.onPointerMove, touch.onPointerMove, {
			checkForDefaultPrevented: false,
		}),
		onPointerUp: composeEventHandlers(prev?.onPointerUp, touch.onPointerUp),
		onPointerCancel: composeEventHandlers(prev?.onPointerCancel, touch.onPointerCancel, {
			checkForDefaultPrevented: false,
		}),
		onTouchEnd: composeEventHandlers(prev?.onTouchEnd, touch.onTouchEnd, {
			checkForDefaultPrevented: false,
		}),
	}
}

/**
 * The props of the one cell of a one-stop row: a group header, a group total,
 * or a detail panel. They are the element id that `aria-activedescendant`
 * names, the `gridcell` role, and a press that seats the cursor on the row.
 * A press on focusable content in the cell stands down, as on a data cell.
 * The header's toggle and a control in a panel are such content. The props
 * are empty while the cursor is off.
 *
 * @internal
 */
export function useGridNavStopProps(key: string): ComponentProps<'td'> {
	const store = useGridNavContext()

	if (!store.enabled) return NO_STOP_PROPS

	return {
		id: store.stopId(key),
		role: 'gridcell',
		onMouseDown: (event: MouseEvent<HTMLTableCellElement>) => {
			const inCell = event.target instanceof Node && event.currentTarget.contains(event.target)

			if (!inCell || fromInteractiveContent(event.target)) return

			event.currentTarget.closest<HTMLElement>(GRID_ROLE)?.focus()

			store.seatStop(key)
		},
	}
}

/** The props of a one-stop cell while the cursor is off: none. @internal */
const NO_STOP_PROPS: ComponentProps<'td'> = {}
