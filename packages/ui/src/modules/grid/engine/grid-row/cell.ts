import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { isDataColumn } from '../../../../utilities'
import type { CellTooltip } from '../../grid-cell-content'
import type { GridColumn } from '../../types'
import { columnAccessor } from '../grid-column/accessor'

/**
 * Row-level event handler for {@link GridDataProps.onRowClick} and
 * {@link GridDataProps.onRowDoubleClick}: the row datum and the originating
 * pointer or keyboard event.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridRowClick<T> = (
	row: T,
	event: ReactMouseEvent<HTMLTableRowElement> | ReactKeyboardEvent<HTMLTableRowElement>,
) => void

/**
 * Context for a cell-level event ({@link GridDataProps.onCellClick} /
 * {@link GridDataProps.onCellDoubleClick}): the cell's column id and data
 * value alongside the owning row.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridCellClickContext<T> = {
	/** The owning row's datum. */
	row: T
	/** The owning row's key, from {@link GridDataProps.getKey}. */
	rowKey: string | number
	/** The clicked column's id. */
	columnId: string | number
	/**
	 * The cell's data value: the column's {@link GridColumn.value} accessor when
	 * set, else the row field named by the column id — the same resolution sort,
	 * filter, and export read. `undefined` when the column has neither.
	 */
	value: unknown
}

/**
 * Cell-level event handler for {@link GridDataProps.onCellClick} and
 * {@link GridDataProps.onCellDoubleClick}: the {@link GridCellClickContext}
 * and the originating pointer or keyboard event.
 *
 * @typeParam T - Shape of a single row.
 */
export type GridCellClick<T> = (
	cell: GridCellClickContext<T>,
	event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
) => void

/**
 * Activates a keyboard-focused data cell (cell roving): fires the cell click
 * then the row click for the given context, matching the order a pointer click
 * fires them in. @internal
 */
export type GridCellRovingActivate<T> = (
	cell: GridCellClickContext<T>,
	event: ReactKeyboardEvent<HTMLElement>,
) => void

/**
 * A cell's data value: the column's {@link GridColumn.value} accessor when set,
 * else the row field named by the column id — the resolution sort, filter, and
 * export share. @internal
 */
export function cellValue<T>(col: GridColumn<T>, row: T): unknown {
	return columnAccessor(col)(row)
}

/**
 * Resolves the data cell a row-level pointer event landed on: the closest
 * `td[data-grid-col]` names the column, matched back through the row's visible
 * columns. Non-data cells (selection, actions, drag handle, expander) resolve
 * to `null`, so cell-level events fire only for row content.
 *
 * @internal
 */
export function resolveCellContext<T>(
	columns: GridColumn<T>[],
	row: T,
	rowKey: string | number,
	target: EventTarget | null,
): GridCellClickContext<T> | null {
	if (!(target instanceof Element)) return null

	const id = target.closest('td[data-grid-col]')?.getAttribute('data-grid-col')

	if (id == null) return null

	for (const col of columns) {
		if (String(col.id) === id && isDataColumn(col)) {
			return { row, rowKey, columnId: col.id, value: cellValue(col, row) }
		}
	}

	return null
}
/**
 * Interactive cell content that handles its own click, so a row-level
 * `onRowClick` defers to it rather than double-firing. @internal
 */
const INTERACTIVE_CELL_CONTENT =
	'a,button,input,select,textarea,label,[role="button"],[role="menuitem"],[role="checkbox"],[contenteditable="true"]'

/** Whether the event originated inside interactive cell content. @internal */
export function fromInteractiveContent(target: EventTarget | null): boolean {
	return target instanceof Element && target.closest(INTERACTIVE_CELL_CONTENT) != null
}

/**
 * Resolves a column's truncation tooltip: `auto` (the cell's own content) when
 * the column declares no `cellTooltip`, a `custom` node when it returns one, or
 * `none` when it returns null/undefined.
 *
 * @internal
 */
export function resolveCellTooltip<T>(col: GridColumn<T>, row: T): CellTooltip {
	if (col.cellTooltip == null) return AUTO_TOOLTIP

	const node = col.cellTooltip(row)

	return node == null ? NO_TOOLTIP : { kind: 'custom', node }
}

/** Shared default-tooltip descriptor — one allocation, not one per rendered cell. @internal */
const AUTO_TOOLTIP: CellTooltip = { kind: 'auto' }

/** Shared suppressed-tooltip descriptor. @internal */
const NO_TOOLTIP: CellTooltip = { kind: 'none' }
