import type {
	ComponentProps,
	KeyboardEvent as ReactKeyboardEvent,
	MouseEvent as ReactMouseEvent,
	ReactNode,
} from 'react'
import { isDataColumn } from '../../../../utilities'
import type { GridColumn } from '../../types'
import { columnAccessor } from '../grid-column/accessor'

/**
 * Truncation tooltip for a data cell. The `auto` mode shows the cell's own
 * content when it overflows, and `custom` shows a column-supplied node in its
 * place. The `none` mode suppresses the tooltip while still truncating.
 *
 * @internal
 */
export type CellTooltip = { kind: 'auto' } | { kind: 'custom'; node: ReactNode } | { kind: 'none' }

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
	 * set, else the row field named by the column id. Sort, filter, and export
	 * read the same resolution. `undefined` when the column has neither.
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
 * Activates a keyboard-focused data cell (cell roving). It fires the cell click
 * then the row click for the given context, in the order a pointer click fires
 * them.
 *
 * @internal
 */
export type GridCellRovingActivate<T> = (
	cell: GridCellClickContext<T>,
	event: ReactKeyboardEvent<HTMLElement>,
) => void

/**
 * A cell's data value: the column's {@link GridColumn.value} accessor when set,
 * else the row field named by the column id. Sort, filter, and export share the
 * resolution.
 *
 * @internal
 */
export function cellValue<T>(col: GridColumn<T>, row: T): unknown {
	return columnAccessor(col)(row)
}

/** The context of a click or an activation on the cell of `col` in `row`. @internal */
export function cellContext<T>(
	col: GridColumn<T>,
	row: T,
	rowKey: string | number,
): GridCellClickContext<T> {
	return { row, rowKey, columnId: col.id, value: cellValue(col, row) }
}

/**
 * The name of a row in the labels of its controls: the consumer's label, else
 * `row` and the key. @internal
 */
export function rowName(rowLabel: string | undefined, rowKey: string | number): string {
	return rowLabel ?? `row ${rowKey}`
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

	const col = columns.find((c) => String(c.id) === id && isDataColumn(c))

	return col ? cellContext(col, row, rowKey) : null
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
 * Resolves a column's truncation tooltip. It is `auto` (the cell's own content)
 * when the column declares no `cellTooltip`. It is a `custom` node when the
 * column returns one, or `none` when it returns null/undefined.
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

/**
 * A column whose cell reads its display row. The cursor projections build one:
 * the id, the seat, and the active flag of each cell follow the row's place in
 * the view, which the row data does not carry. A flat row gives the index to
 * `cellAt` and `cellPropsAt`, so a cell whose row moved renders again, and a
 * compiled cell keys its content on the index. `cell` and `cellProps` stay for
 * a body that has no index to give.
 *
 * @internal
 */
export type GridIndexedColumn<T> = GridColumn<T> & {
	cellAt?: (row: T, rowIndex: number) => ReactNode
	cellPropsAt?: (row: T, rowIndex: number) => Omit<ComponentProps<'td'>, 'children'>
}

/**
 * The place in the view that a cell of `col` takes: `rowIndex` for a column
 * that reads it (a cursor column), and -1 for any other. A cell that reads no
 * place thus keeps its memo when a sort moves its row.
 *
 * @internal
 */
export function cellRowIndex<T>(col: GridIndexedColumn<T>, rowIndex: number): number {
	return col.cellAt !== undefined || col.cellPropsAt !== undefined ? rowIndex : -1
}

/** The content of a column's cell in the row at `rowIndex` of the view, or `null` with no `cell`. @internal */
export function cellContentAt<T>(col: GridIndexedColumn<T>, row: T, rowIndex: number): ReactNode {
	if (col.cellAt) return col.cellAt(row, rowIndex) ?? null

	return col.cell ? (col.cell(row) ?? null) : null
}

/** The `cellProps` of a column's cell in the row at `rowIndex` of the view. @internal */
export function cellPropsAt<T>(
	col: GridIndexedColumn<T>,
	row: T,
	rowIndex: number,
): Omit<ComponentProps<'td'>, 'children'> | undefined {
	return col.cellPropsAt ? col.cellPropsAt(row, rowIndex) : col.cellProps?.(row)
}
