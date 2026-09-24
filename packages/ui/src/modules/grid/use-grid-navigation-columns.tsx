'use client'

import {
	type ComponentProps,
	type MouseEvent,
	type ReactNode,
	type RefObject,
	useCallback,
	useLayoutEffect,
	useMemo,
	useRef,
	useSyncExternalStore,
} from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { isDataColumn } from '../../utilities'
import { GRID_ROLE } from './engine/grid-constants'
import { fromInteractiveContent } from './engine/grid-row/cell'
import type { GridColumn } from './types'
import { type Coord, useGridNavContext } from './use-grid-navigation'

/**
 * The height that a sticky header lays over the top edge of the scroll
 * container, or zero when the header does not stick. It is the one source of
 * the top inset for the cursor, the new-row slot, and the windowed body.
 *
 * @remarks Each header row reads its first cell, because the cells of a row
 * stick together. A row covers down to its sticky `top` plus its height. The
 * column row of a grid with column groups sticks below the band, so the inset
 * is the full height of the head.
 *
 * @internal
 */
export function stickyHeadInset(table: HTMLTableElement): number {
	let inset = 0

	for (const row of table.tHead?.rows ?? []) {
		const cell = row.cells[0]

		if (!cell) continue

		const style = getComputedStyle(cell)

		if (style.position !== 'sticky' || style.top === 'auto') continue

		const top = Number.parseFloat(style.top) || 0

		inset = Math.max(inset, top + row.getBoundingClientRect().height)
	}

	return inset
}

/**
 * The insets that the grid's own sticky chrome would lay over a cell scrolled to
 * the viewport edge. The top inset is the height that the sticky header covers
 * (see {@link stickyHeadInset}). The side insets are the pinned columns' widths,
 * measured from the first header row's sticky cells.
 * The new-row slot of an editable grid sticks too. Its height adds to the top
 * or the bottom inset of each other cell (see {@link slotInsets}). Applied as
 * the active cell's `scroll-margin` so `scrollIntoView` keeps it clear of that
 * chrome (WCAG 2.4.11, Focus Not Obscured). Zero on every side for a grid with
 * neither, so the margin is cleared.
 *
 * @remarks Read fresh on each activation rather than cached, at O(cols)
 * `getComputedStyle`, human-paced per keystroke. The insets shift on any resize,
 * pin, or density change. A stale value would scroll the cell under the very
 * chrome it is meant to clear (WCAG 2.4.11). A cache would need a layout-invalidation signal
 * this hook does not have, so correctness is kept over a micro-optimization.
 *
 * @internal
 */
function obscuringInsets(cell: HTMLElement): {
	top: number
	bottom: number
	left: number
	right: number
} {
	const table = cell.closest('table')

	const headRow = table?.querySelector<HTMLElement>('thead > tr')

	let left = 0
	let right = 0

	if (headRow) {
		for (const headCell of headRow.children) {
			const style = getComputedStyle(headCell)

			if (style.position !== 'sticky') continue

			const box = headCell.getBoundingClientRect()

			// A pinned cell (sticky `left`/`right`) overlays that side. The top edge
			// comes from `stickyHeadInset`, which reads each header row.
			if (style.left !== 'auto') left += box.width
			else if (style.right !== 'auto') right += box.width
		}
	}

	return { ...stickyEdgeInsets(cell), left, right }
}

/**
 * The height that the grid's sticky chrome lays over the top and the bottom edge
 * of the scroll container. The element is part of the grid, outside the new-row slot.
 * The top is the sticky header (see {@link stickyHeadInset}) plus a top slot, and
 * the bottom is a bottom slot (see {@link slotInsets}). The cursor clears the
 * active cell of it, and the windowed body pads its alignment by it.
 *
 * @param stickyHead - Whether to read the header. A caller that knows the header
 * does not stick passes `false`, and skips the computed-style reads.
 * @internal
 */
export function stickyEdgeInsets(
	element: HTMLElement,
	stickyHead = true,
): { top: number; bottom: number } {
	const table = element.closest('table')

	const head = table && stickyHead ? stickyHeadInset(table) : 0

	const slot = slotInsets(element)

	return { top: head + slot.top, bottom: slot.bottom }
}

/**
 * The height that the sticky new-row slot lays over the top or the bottom edge
 * of the scroll container, for a cell outside the slot. The slot is the one of
 * this table, not of a grid nested in a detail row. @internal
 */
function slotInsets(cell: HTMLElement): { top: number; bottom: number } {
	// The body sections of the table are few, so the walk reads a handful of
	// elements, not the rows of the data body.
	const bodies = cell.closest('table')?.tBodies ?? []

	const slot = Array.from(bodies).find((body) => body.dataset.slot === 'grid-new-row-body')?.rows[0]

	if (!slot || slot.contains(cell)) return { top: 0, bottom: 0 }

	const height = slot.getBoundingClientRect().height

	return slot.dataset.position === 'top' ? { top: height, bottom: 0 } : { top: 0, bottom: height }
}

/**
 * Whether the horizontal correction of {@link clearStickyChrome} applies to
 * `cell`. A cell of a pinned column is the chrome itself, so it takes none. A
 * cell of the new-row slot sticks only to the top or the bottom edge, so it
 * takes one. A right-to-left scroller takes none, because a pinned column does
 * not stick there. Its offset is a physical `left` or `right`.
 * @internal
 */
function clearsSides(cell: HTMLElement, scroller: HTMLElement): boolean {
	const style = getComputedStyle(cell)

	if (style.position === 'sticky' && (style.left !== 'auto' || style.right !== 'auto')) return false

	return getComputedStyle(scroller).direction !== 'rtl'
}

/**
 * Scrolls the grid's own scroll container so the cell clears the sticky chrome
 * at each edge. It runs after the cell's `scrollIntoView`. Chromium's
 * `nearest` alignment does not scroll a cell that is inside the container, on
 * either axis. It therefore ignores the `scroll-margin` of a cell under the
 * sticky header or under a pinned column. A cell of a nested grid with no
 * scroll container of its own is not moved.
 *
 * @remarks The side edges take a correction only where a pinned column can
 * cover the cell (see {@link clearsSides}).
 *
 * @internal
 */
function clearStickyChrome(
	cell: HTMLElement,
	insets: { top: number; bottom: number; left: number; right: number },
): void {
	const table = cell.closest('table')

	const scroller = table?.closest<HTMLElement>('[data-slot="grid-scroll"]')

	if (!scroller || scroller.querySelector('table') !== table) return

	const box = scroller.getBoundingClientRect()

	const edgeTop = box.top + scroller.clientTop + insets.top

	const edgeBottom = box.top + scroller.clientTop + scroller.clientHeight - insets.bottom

	const rect = cell.getBoundingClientRect()

	// The top edge wins for a cell taller than the clear area.
	if (rect.top < edgeTop) scroller.scrollTop -= edgeTop - rect.top
	else if (rect.bottom > edgeBottom)
		scroller.scrollTop += Math.min(rect.bottom - edgeBottom, rect.top - edgeTop)

	if (!clearsSides(cell, scroller)) return

	const edgeLeft = box.left + scroller.clientLeft + insets.left

	const edgeRight = box.left + scroller.clientLeft + scroller.clientWidth - insets.right

	// The left edge wins for a cell wider than the clear area.
	if (rect.left < edgeLeft) scroller.scrollLeft -= edgeLeft - rect.left
	else if (rect.right > edgeRight)
		scroller.scrollLeft += Math.min(rect.right - edgeRight, rect.left - edgeLeft)
}

/**
 * Sets a `scroll-margin` side of `cell` to `inset` pixels, or clears it at
 * zero. A value that does not change is not written, because each write sets
 * the `style` attribute again. @internal
 */
function setScrollMargin(
	cell: HTMLElement,
	side: 'scrollMarginTop' | 'scrollMarginBottom' | 'scrollMarginLeft' | 'scrollMarginRight',
	inset: number,
): void {
	const value = inset ? `${inset}px` : ''

	if (cell.style[side] !== value) cell.style[side] = value
}

/**
 * Active-cell flag for one navigable cell. Subscribes to the cursor store, and
 * toggles `data-active` on its owning `role="gridcell"` `<td>` when this cell
 * becomes (or stops being) the active one. The `<td>`'s `cellProps` are
 * non-reactive, so the memoized row holds across cursor moves. The styling
 * therefore rides this imperative attribute instead. The active cell also
 * scrolls into view, clear of the grid's sticky header and pinned columns.
 * Renders a hidden locator span, not a wrapper,
 * so cell layout is untouched.
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

	useLayoutEffect(() => {
		const cell = ref.current?.closest<HTMLElement>('[role="gridcell"]')

		if (!cell) return

		cell.toggleAttribute('data-active', isActive)

		if (isActive) {
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
	}, [isActive])

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
 *
 * @internal
 */
export function seatingCellProps<T>(args: {
	col: GridColumn<T>
	row: T
	rowIndexMapRef: RefObject<Map<T, number>>
	colIndexMapRef: RefObject<Map<string | number, number>>
	cellId: (row: number, col: number) => string
	moveTo: (coord: Coord) => void
	extra?: ComponentProps<'td'>
}): ComponentProps<'td'> {
	const { col, row, rowIndexMapRef, colIndexMapRef, cellId, moveTo, extra } = args

	const rowIdx = rowIndexMapRef.current.get(row) ?? -1

	const colIdx = colIndexMapRef.current.get(col.id) ?? -1

	const prev = col.cellProps?.(row)

	return {
		...prev,
		...extra,
		id: cellId(rowIdx, colIdx),
		role: 'gridcell',
		onMouseDown: (event: MouseEvent<HTMLTableCellElement>) => {
			// A press in a portal that the cell renders, such as an editor's open
			// listbox, reaches the cell through the React tree. It is not a press
			// on the cell, so it must not pull focus onto the grid.
			const inCell = event.target instanceof Node && event.currentTarget.contains(event.target)

			if (inCell && !fromInteractiveContent(event.target)) {
				event.currentTarget.closest<HTMLElement>(GRID_ROLE)?.focus()

				moveTo({ row: rowIdx, col: colIdx })
			}

			prev?.onMouseDown?.(event)
		},
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

/**
 * Projects the read-only grid's data columns into navigable ones. Each gains a
 * stable per-cell id, matched by the grid's `aria-activedescendant`. Each also
 * gains `role="gridcell"`, a click-to-focus `onMouseDown`, and an active-cell
 * marker wrapping its content. Display-order row/column indices resolve at
 * cell-render time from `rowIndexMapRef`/`colIndexMapRef`. The augmented columns
 * therefore stay referentially stable across cursor moves, and the memoized rows
 * hold. Only the marker whose active flag flipped re-renders. The non-data columns
 * (selection, actions, drag handle, expander), and a non-navigable grid (`enabled` false), pass through untouched.
 *
 * @returns The augmented `GridColumn<T>[]` to feed the engine.
 * @internal
 */
export function useGridNavigationColumns<T>({
	enabled,
	columns,
	rowIndexMapRef,
	colIndexMapRef,
	cellId,
	moveTo,
}: {
	enabled: boolean
	columns: GridColumn<T>[]
	/** Live row → display-index map; resolves a cell's cursor row. */
	rowIndexMapRef: RefObject<Map<T, number>>
	/** Live column-id → display-data-index map; resolves a cell's cursor column. */
	colIndexMapRef: RefObject<Map<string | number, number>>
	cellId: (row: number, col: number) => string
	moveTo: (coord: Coord) => void
}): GridColumn<T>[] {
	return useMemo(() => {
		if (!enabled) return columns

		return columns.map((col) => {
			if (!isDataColumn(col)) return col

			const renderCell = col.cell

			return {
				...col,
				className: cn(k.nav.cell, col.className),
				cellProps: (row: T): ComponentProps<'td'> =>
					seatingCellProps({ col, row, rowIndexMapRef, colIndexMapRef, cellId, moveTo }),
				cell: (row: T): ReactNode => {
					const rowIdx = rowIndexMapRef.current.get(row) ?? -1

					const colIdx = colIndexMapRef.current.get(col.id) ?? -1

					return (
						<GridNavCell row={rowIdx} col={colIdx}>
							{renderCell?.(row)}
						</GridNavCell>
					)
				},
			}
		})
	}, [enabled, columns, rowIndexMapRef, colIndexMapRef, cellId, moveTo])
}
