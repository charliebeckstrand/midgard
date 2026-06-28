'use client'

import { useSortable } from '@dnd-kit/sortable'
import { type Cell, flexRender, type Table } from '@tanstack/react-table'
import {
	type HTMLAttributes,
	memo,
	type ReactElement,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
} from 'react'
import { Checkbox } from '../../components/checkbox'
import { TableCell, TableRow } from '../../components/table'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import { type CellTooltip, GridCellContent } from './grid-cell-content'
import { pinnedClassName, pinnedOffsetStyle } from './grid-pinning'
import { columnDragStyle } from './grid-reorder'
import type { GridColumn } from './types'
import type { GridColumnPinning } from './use-grid-table'

/**
 * Row-click handler: the row datum and the originating pointer or keyboard
 * event. @internal
 */
export type GridRowClick<T> = (
	row: T,
	event: ReactMouseEvent<HTMLTableRowElement> | ReactKeyboardEvent<HTMLTableRowElement>,
) => void

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
 * Per-row wiring shared by the plain and virtualized bodies: the engine, the
 * row/key sources, and the flags every {@link GridRow} reads. Both bodies
 * extend this with their own layout props and render rows through
 * {@link renderGridRow}.
 *
 * @internal
 */
export type GridRowsProps<T> = {
	/** The engine; rows read their cells from it. */
	table: Table<T>
	rows: T[]
	rowKeys: (string | number)[]
	/** Visible columns, kept for the loading/empty/spacer column spans. */
	visibleColumns: GridColumn<T>[]
	rowLoading?: (row: T) => boolean
	rowClassName?: (row: T) => string | undefined
	rowLabel?: (row: T) => string
	/** Stable per-row click handler; rows are inert when omitted. */
	onRowClick?: GridRowClick<T>
	selection: Set<string | number>
	toggleRow: (key: string | number) => void
	/** Whether the grid renders a selection column, so each row exposes its `aria-selected` state. */
	selectable: boolean
	/** Registers each non-pinned data cell against the column sortable for whole-column reorder drags. */
	reorderable: boolean
	/** Truncate overflowing cell content with an ellipsis and an on-hover tooltip. */
	truncate: boolean
	/** Frozen-column controls; pinned cells stick to an edge. `null` when none. */
	pinning: GridColumnPinning | null
	/** When the rendered body is a window onto a larger set (virtualization/pagination), rows carry global `aria-rowindex`. */
	gridSemantics: boolean
	/** Global row-index base added to each rendered row's index (the page offset under pagination, else 0). */
	rowIndexOffset: number
}

/**
 * Renders one engine row through {@link GridRow}, resolving its cells, key, and
 * per-row flags from the shared body wiring. `rowIndex` is the 1-based aria
 * position, set only when the body is virtualized.
 *
 * @internal
 */
export function renderGridRow<T>(
	props: GridRowsProps<T>,
	row: T,
	dataRowIndex: number,
	rowIndex?: number,
): ReactElement {
	// `rowKeys` is built parallel to `rows` (see `Grid`), so the index is always present.
	const key = props.rowKeys[dataRowIndex] as string | number

	return (
		<GridRow<T>
			key={key}
			cells={props.table.getRow(String(key)).getVisibleCells()}
			row={row}
			rowKey={key}
			loading={props.rowLoading?.(row) ?? false}
			className={props.rowClassName?.(row)}
			rowLabel={props.rowLabel?.(row)}
			onRowClick={props.onRowClick}
			selected={props.selection.has(key)}
			toggleRow={props.toggleRow}
			selectable={props.selectable}
			reorderable={props.reorderable}
			truncate={props.truncate}
			pinning={props.pinning}
			dataRowIndex={dataRowIndex}
			rowIndex={rowIndex}
		/>
	)
}

/** Props for {@link GridRow}. @internal */
type GridRowProps<T> = {
	row: T
	rowKey: string | number
	/**
	 * This row's visible cells from the engine (`row.getVisibleCells()`), rendered
	 * through `flexRender`. Passed in (not pulled off a stable `table`) so the
	 * memoized row re-renders when the cell set changes — the array's identity
	 * shifts on a column-def rebuild but holds across cursor navigation.
	 */
	cells: Cell<T, unknown>[]
	loading: boolean
	className: string | undefined
	/** Human-readable name for the selection checkbox ("Select {label}"); falls back to the row key. */
	rowLabel?: string
	/**
	 * This row's selected state. Passed as a prop, not read from context;
	 * `memo` re-renders only this row when its selection flips.
	 */
	selected: boolean
	/** Stable reference from the selection hook, safe to pass through `memo`. */
	toggleRow: (key: string | number) => void
	/**
	 * Whether the grid renders a selection column. When true the row's `<tr>`
	 * carries `aria-selected`; a grid with no selection column omits it rather
	 * than asserting selectability on rows that can't be selected.
	 */
	selectable: boolean
	/**
	 * When true, each non-pinned data cell registers against the table's column
	 * sortable (matching its header's id) so the whole column drags as one.
	 * @defaultValue false
	 */
	reorderable?: boolean
	/**
	 * Truncate overflowing cell content to one line with an ellipsis and a
	 * tooltip; a column's {@link GridColumn.cellTooltip} customizes or disables
	 * the tooltip.
	 */
	truncate: boolean
	/** Invoked when the row is clicked or activated by keyboard; `undefined` makes the row inert. */
	onRowClick?: GridRowClick<T>
	/**
	 * 1-based position in the full row set (header = 1). Set when the rendered
	 * body is a window onto a larger set — virtualization or pagination — so
	 * assistive tech reports position in the full set, not the rendered slice.
	 * Omitted for a plain, whole-set table.
	 */
	rowIndex?: number
	/**
	 * 0-based index into the full `rows` array, surfaced as `data-row-index`.
	 * Keyboard bridges (e.g. GridEditable) resolve a `<tr>` to its data row
	 * through it; under virtualization, spacer rows and windowing make physical
	 * DOM position diverge from data order.
	 */
	dataRowIndex: number
	/** Frozen-column controls; pinned cells stick to an edge over the scrolling ones. `null` when none. */
	pinning: GridColumnPinning | null
}

/**
 * Resolves a column's truncation tooltip: `auto` (the cell's own content) when
 * the column declares no `cellTooltip`, a `custom` node when it returns one, or
 * `none` when it returns null/undefined.
 *
 * @internal
 */
function resolveCellTooltip<T>(col: GridColumn<T>, row: T): CellTooltip {
	if (col.cellTooltip == null) return { kind: 'auto' }

	const node = col.cellTooltip(row)

	return node == null ? { kind: 'none' } : { kind: 'custom', node }
}

/**
 * One data row: maps `columns` to cells (selection checkbox, actions, or `cell`
 * content).
 *
 * @internal
 */
function GridRowImpl<T>({
	row,
	rowKey,
	cells,
	loading,
	className,
	rowLabel,
	selected,
	toggleRow,
	selectable,
	reorderable = false,
	truncate,
	onRowClick,
	rowIndex,
	dataRowIndex,
	pinning,
}: GridRowProps<T>) {
	return (
		<TableRow
			// Selectable rows expose their checkbox state to assistive tech; a grid
			// with no selection column omits the attribute entirely.
			aria-selected={selectable ? selected : undefined}
			data-selected={dataAttr(selected)}
			data-row-index={dataRowIndex}
			data-grid-row={String(rowKey)}
			data-clickable={dataAttr(onRowClick != null)}
			aria-rowindex={rowIndex}
			// A clickable row is keyboard-focusable and activates on Enter / Space;
			// a click on interactive cell content defers to that content. Activation
			// from the keyboard is gated to the row itself so inner controls keep
			// their own Enter / Space behaviour.
			tabIndex={onRowClick ? 0 : undefined}
			onClick={
				onRowClick
					? (event) => {
							if (!fromInteractiveContent(event.target)) onRowClick(row, event)
						}
					: undefined
			}
			onKeyDown={
				onRowClick
					? (event) => {
							if (
								(event.key === 'Enter' || event.key === ' ') &&
								event.target === event.currentTarget
							) {
								event.preventDefault()

								onRowClick(row, event)
							}
						}
					: undefined
			}
			// A clickable row carries the pointer cursor and a keyboard focus ring (see
			// `k.row.clickable`); its hover wash is the shared `<Table hover>` variant
			// that `GridData` enables for a row-click handler.
			className={cn(loading && k.rowLoading, onRowClick && k.row.clickable, className)}
		>
			{cells.map((cell, colIdx) => {
				// Every engine column carries its source column on `meta`; the guard
				// narrows the optional type (it is always set in `toColumnDef`).
				const col = cell.column.columnDef.meta?.gridColumn

				if (!col) return null

				// Cell column indices accompany aria-rowindex under virtualization
				// (rowIndex is only set then).
				const colIndex = rowIndex !== undefined ? colIdx + 1 : undefined

				if (col.selectable) {
					return (
						<TableCell
							key={col.id}
							aria-colindex={colIndex}
							className={cn(k.selectCell, pinnedClassName(pinning, col.id), col.className)}
							style={pinnedOffsetStyle(pinning, col.id)}
						>
							<Checkbox
								checked={selected}
								onChange={() => toggleRow(rowKey)}
								aria-label={`Select ${rowLabel ?? `row ${rowKey}`}`}
							/>
						</TableCell>
					)
				}

				if (col.actions) {
					return (
						<TableCell
							key={col.id}
							aria-colindex={colIndex}
							className={cn(k.actionsCell, pinnedClassName(pinning, col.id), col.className)}
							style={pinnedOffsetStyle(pinning, col.id)}
						>
							{col.actions(row)}
						</TableCell>
					)
				}

				return (
					<GridDataCell<T>
						key={col.id}
						cell={cell}
						col={col}
						row={row}
						colIndex={colIndex}
						reorderable={reorderable}
						truncate={truncate}
						pinning={pinning}
					/>
				)
			})}
		</TableRow>
	)
}

/** Memoized {@link GridRowImpl}; re-renders a row only when its own props change. @internal */
export const GridRow = memo(GridRowImpl) as typeof GridRowImpl

/** Props for {@link GridDataCell}. @internal */
type GridDataCellProps<T> = {
	cell: Cell<T, unknown>
	col: GridColumn<T>
	row: T
	colIndex: number | undefined
	reorderable: boolean
	truncate: boolean
	pinning: GridColumnPinning | null
}

/**
 * One data cell: renders its content through the engine (`flexRender`), wrapping
 * it in the truncation reveal unless the grid opts out, then in a reorder-aware
 * `<td>`. A column with no `cell` yields null content and stays bare.
 *
 * @internal
 */
function GridDataCellImpl<T>({
	cell,
	col,
	row,
	colIndex,
	reorderable,
	truncate,
	pinning,
}: GridDataCellProps<T>) {
	const cellExtra = col.cellProps?.(row)

	// Render only columns that declare a `cell`; a bare accessor column stays empty
	// rather than falling back to TanStack's default value renderer.
	const rawContent = col.cell ? flexRender(cell.column.columnDef.cell, cell.getContext()) : null

	const content =
		truncate && rawContent != null ? (
			<GridCellContent content={rawContent} tooltip={resolveCellTooltip(col, row)} />
		) : (
			rawContent
		)

	if (reorderable && !col.pinned) {
		return (
			<GridReorderableCell
				id={col.id}
				colIndex={colIndex}
				className={col.className}
				cellProps={cellExtra}
			>
				{content}
			</GridReorderableCell>
		)
	}

	return (
		<TableCell
			aria-colindex={colIndex}
			{...cellExtra}
			data-grid-col={col.id}
			className={cn(pinnedClassName(pinning, col.id), col.className, cellExtra?.className)}
			style={{ ...cellExtra?.style, ...pinnedOffsetStyle(pinning, col.id) }}
		>
			{content}
		</TableCell>
	)
}

/**
 * Memoized {@link GridDataCellImpl}: when a row re-renders, only the cells whose
 * own props (cell, column, row, pinning) changed re-render, so a row-level change
 * (selection, truncation) doesn't re-run `flexRender` and `cellProps` for every
 * cell in the row. @internal
 */
const GridDataCell = memo(GridDataCellImpl) as typeof GridDataCellImpl

/** Props for {@link GridReorderableCell}. @internal */
type GridReorderableCellProps = {
	id: string | number
	colIndex: number | undefined
	className: string | undefined
	cellProps: Omit<HTMLAttributes<HTMLTableCellElement>, 'children'> | undefined
	children: ReactNode
}

/**
 * Body cell for a reordering column: registers the `<td>` against the data
 * table's column sortable under the same id as the column's header, so the
 * whole column glides together while its header handle is dragged. Carries no
 * activator of its own — the drag is initiated from the header grip.
 *
 * @internal
 */
const GridReorderableCell = memo(function GridReorderableCell({
	id,
	colIndex,
	className,
	cellProps,
	children,
}: GridReorderableCellProps) {
	const { setNodeRef, transform, transition, isDragging } = useSortable({ id: String(id) })

	return (
		<TableCell
			ref={setNodeRef}
			aria-colindex={colIndex}
			{...cellProps}
			data-dragging={dataAttr(isDragging)}
			data-grid-col={id}
			className={cn(k.reorder.cell, k.reorder.shift, className, cellProps?.className)}
			style={{ ...cellProps?.style, ...columnDragStyle(transform, transition) }}
		>
			{children}
		</TableCell>
	)
})
