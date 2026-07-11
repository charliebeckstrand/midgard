import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { dataAttr } from '../../../../core'
import { k } from '../../../../recipes/kata/grid'
import type { GridColumn } from '../../types'
import {
	fromInteractiveContent,
	type GridCellClick,
	type GridRowClick,
	resolveCellContext,
} from './cell'

/**
 * Runs `activate` when Enter or Space lands on the element itself — not on a
 * descendant, so interactive inner content keeps its own key behaviour — and
 * suppresses the default (a Space scroll, an Enter click) first. The one
 * keyboard-activation gate the row shell and the roving cells share.
 *
 * @internal
 */
export function activateOnEnterSpace<E extends Element>(
	event: ReactKeyboardEvent<E>,
	activate: (event: ReactKeyboardEvent<E>) => void,
): void {
	if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
		event.preventDefault()

		activate(event)
	}
}

/**
 * The row's DOM handler for a click or double-click: a click on interactive
 * cell content defers to that content; otherwise the cell-level handler fires
 * first — when the event landed on a data cell — then the row-level one,
 * matching the DOM's inside-out event order. `undefined` when the row carries
 * neither, so an inert row attaches no handler.
 *
 * @internal
 */
export function rowPointerHandler<T>(args: {
	columns: GridColumn<T>[]
	row: T
	rowKey: string | number
	onRow: GridRowClick<T> | undefined
	onCell: GridCellClick<T> | undefined
}): ((event: ReactMouseEvent<HTMLTableRowElement>) => void) | undefined {
	const { columns, row, rowKey, onRow, onCell } = args

	if (!onRow && !onCell) return undefined

	return (event) => {
		if (fromInteractiveContent(event.target)) return

		if (onCell) {
			const cell = resolveCellContext(columns, row, rowKey, event.target)

			if (cell) onCell(cell, event)
		}

		onRow?.(row, event)
	}
}

/** The four row/cell click handlers a row may carry; any one makes it read as clickable. @internal */
type GridRowShellHandlers<T> = {
	onRowClick?: GridRowClick<T>
	onCellClick?: GridCellClick<T>
	onRowDoubleClick?: GridRowClick<T>
	onCellDoubleClick?: GridCellClick<T>
}

/**
 * The clickable-affordance class a row carries when any row- or cell-level
 * click handler is attached: the pointer cursor and keyboard focus ring. One
 * definition of "this row is clickable", shared by every row renderer.
 *
 * @internal
 */
export function rowClickableClass<T>(
	handlers: GridRowShellHandlers<T>,
): typeof k.row.clickable | false {
	return (
		Boolean(
			handlers.onRowClick ||
				handlers.onCellClick ||
				handlers.onRowDoubleClick ||
				handlers.onCellDoubleClick,
		) && k.row.clickable
	)
}

/** Inputs for {@link rowShellProps}. @internal */
type GridRowShellArgs<T> = GridRowShellHandlers<T> & {
	/** Visible columns, for resolving a pointer event to its data cell. */
	columns: GridColumn<T>[]
	row: T
	rowKey: string | number
	selected: boolean
	selectable: boolean
	/** Whether the row is a roving-tabindex item right now (callers gate on expansion themselves). */
	rowRoving: boolean
}

/**
 * The `<tr>` wiring every row renderer shares: the identifying and state
 * `data-*`/`aria-*` attributes, the pointer handlers (cell-level first, then
 * row-level — see {@link rowPointerHandler}), and the Enter / Space keyboard
 * activation gated to the row itself. Callers spread this and layer their own
 * layout, focus, and animation props on top.
 *
 * @internal
 */
export function rowShellProps<T>(args: GridRowShellArgs<T>): {
	'data-grid-row': string
	'data-selected': '' | undefined
	'aria-selected': boolean | undefined
	'data-clickable': '' | undefined
	'data-roving': '' | undefined
	onClick: ((event: ReactMouseEvent<HTMLTableRowElement>) => void) | undefined
	onDoubleClick: ((event: ReactMouseEvent<HTMLTableRowElement>) => void) | undefined
	onKeyDown: ((event: ReactKeyboardEvent<HTMLTableRowElement>) => void) | undefined
} {
	const { columns, row, rowKey, onRowClick, onCellClick, onRowDoubleClick, onCellDoubleClick } =
		args

	return {
		'data-grid-row': String(rowKey),
		'data-selected': dataAttr(args.selected),
		// Selectable rows expose their checkbox state to assistive tech; a grid
		// with no selection column omits the attribute entirely.
		'aria-selected': args.selectable ? args.selected : undefined,
		'data-clickable': dataAttr(onRowClick != null),
		// Roving marks the row an item the grid's roving hook owns the `tabIndex`
		// of; the cell-mode/inert cases leave it off.
		'data-roving': dataAttr(args.rowRoving),
		onClick: rowPointerHandler({ columns, row, rowKey, onRow: onRowClick, onCell: onCellClick }),
		onDoubleClick: rowPointerHandler({
			columns,
			row,
			rowKey,
			onRow: onRowDoubleClick,
			onCell: onCellDoubleClick,
		}),
		// A clickable row activates on Enter / Space, gated to the row itself so
		// inner controls keep their own key behaviour.
		onKeyDown: onRowClick
			? (event) => activateOnEnterSpace(event, (e) => onRowClick(row, e))
			: undefined,
	}
}

/**
 * A data row's global `aria-rowindex`: the header occupies row 1, so data rows
 * are offset by 2, plus the page offset so a paginated (or windowed) row
 * reports its place in the full set.
 *
 * @internal
 */
export function ariaRowIndex(rowIndexOffset: number, index: number): number {
	return rowIndexOffset + index + 2
}
