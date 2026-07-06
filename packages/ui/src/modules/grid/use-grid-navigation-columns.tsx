'use client'

import {
	type HTMLAttributes,
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
import { fromInteractiveContent } from './grid-row'
import type { GridColumn } from './types'
import { type Coord, useGridNavContext } from './use-grid-navigation'

/**
 * The insets that the grid's own sticky chrome would lay over a cell scrolled to
 * the viewport edge: the sticky header's height (top) and the pinned columns'
 * widths (left/right), measured from the header row's sticky cells. Applied as
 * the active cell's `scroll-margin` so `scrollIntoView` keeps it clear of that
 * chrome (WCAG 2.4.11, Focus Not Obscured). Zero on every side for a grid with
 * neither, so the margin is cleared.
 *
 * @remarks Read fresh on each activation (O(cols) `getComputedStyle`, human-paced
 * per keystroke) rather than cached: the insets shift on any resize, pin, or
 * density change, and a stale value would scroll the cell under the very chrome it
 * is meant to clear (WCAG 2.4.11). A cache would need a layout-invalidation signal
 * this hook does not have, so correctness is kept over a micro-optimization.
 *
 * @internal
 */
function obscuringInsets(cell: HTMLElement): { top: number; left: number; right: number } {
	const headRow = cell.closest('table')?.querySelector<HTMLElement>('thead > tr')

	let top = 0
	let left = 0
	let right = 0

	if (headRow) {
		for (const headCell of headRow.children) {
			const style = getComputedStyle(headCell)

			if (style.position !== 'sticky') continue

			const box = headCell.getBoundingClientRect()

			// A sticky-top header cell overlays the top edge; a pinned cell (sticky
			// `left`/`right`) overlays that side — a pinned header is often both.
			if (style.top !== 'auto') top = Math.max(top, box.height)

			if (style.left !== 'auto') left += box.width
			else if (style.right !== 'auto') right += box.width
		}
	}

	return { top, left, right }
}

/**
 * Active-cell flag for one navigable cell. Subscribes to the cursor store and,
 * when this cell becomes (or stops being) the active one, toggles `data-active`
 * on its owning `role="gridcell"` `<td>` — the read-only mirror of the editable
 * grid's `aria-selected` write. The `<td>`'s `cellProps` are non-reactive so the
 * memoized row holds across cursor moves, so the styling rides this imperative
 * attribute instead; the active cell also scrolls into view, clear of the grid's
 * sticky header and pinned columns. Renders a hidden locator span, not a wrapper,
 * so cell layout is untouched.
 *
 * @internal
 */
export function GridNavCell({
	row,
	col,
	children,
}: {
	row: number
	col: number
	children: ReactNode
}) {
	const store = useGridNavContext()

	const ref = useRef<HTMLSpanElement>(null)

	const isActive = useSyncExternalStore(
		store.subscribe,
		useCallback(() => store.isActive(row, col), [store, row, col]),
		() => false,
	)

	useLayoutEffect(() => {
		const cell = ref.current?.closest<HTMLElement>('[role="gridcell"]')

		if (!cell) return

		cell.toggleAttribute('data-active', isActive)

		if (isActive) {
			// Hold the cell clear of the grid's sticky header and pinned columns as it
			// scrolls into view, so the focus indicator is never obscured (WCAG 2.4.11).
			const { top, left, right } = obscuringInsets(cell)

			cell.style.scrollMarginTop = top ? `${top}px` : ''

			cell.style.scrollMarginLeft = left ? `${left}px` : ''

			cell.style.scrollMarginRight = right ? `${right}px` : ''

			cell.scrollIntoView({ block: 'nearest', inline: 'nearest' })
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
 * `onMouseDown` that — unless the click landed on focusable cell content (links,
 * buttons, an editor) — moves the cursor to this cell and pulls focus onto the
 * grid container. Merged over the consumer's own `cellProps` and any `extra`
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
	extra?: HTMLAttributes<HTMLTableCellElement>
}): HTMLAttributes<HTMLTableCellElement> {
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
			if (!fromInteractiveContent(event.target)) {
				event.currentTarget.closest<HTMLElement>('[role="grid"]')?.focus()

				moveTo({ row: rowIdx, col: colIdx })
			}

			prev?.onMouseDown?.(event)
		},
	}
}

/**
 * Projects the read-only grid's data columns into navigable ones: each gains a
 * stable per-cell id (matched by the grid's `aria-activedescendant`),
 * `role="gridcell"`, a click-to-focus `onMouseDown`, and an active-cell marker
 * wrapping its content. Display-order row/column indices resolve at cell-render
 * time from `rowIndexMapRef`/`colIndexMapRef`, so the augmented columns stay
 * referentially stable across cursor moves and the memoized rows hold — only the
 * marker whose active flag flipped re-renders. Select/actions columns, and a
 * non-navigable grid (`enabled` false), pass through untouched.
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
				cellProps: (row: T): HTMLAttributes<HTMLTableCellElement> =>
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
