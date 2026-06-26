'use client'

import { useSortable } from '@dnd-kit/sortable'
import { type Cell, flexRender } from '@tanstack/react-table'
import { type HTMLAttributes, memo, type ReactNode, useMemo } from 'react'
import { Checkbox } from '../../components/checkbox'
import { TableCell, TableRow } from '../../components/table'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import { GridRowContext, type GridRowContextValue } from './context'
import { type CellTooltip, GridCellContent } from './grid-cell-content'
import { columnDragStyle } from './grid-reorder'
import type { GridColumn } from './types'

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
	/**
	 * 1-based position in the full row set (header = 1). Set only when the body
	 * is virtualized; assistive tech reads it to report position in the
	 * windowed DOM. Omitted otherwise.
	 */
	rowIndex?: number
	/**
	 * 0-based index into the full `rows` array, surfaced as `data-row-index`.
	 * Keyboard bridges (e.g. GridEditable) resolve a `<tr>` to its data row
	 * through it; under virtualization, spacer rows and windowing make physical
	 * DOM position diverge from data order.
	 */
	dataRowIndex: number
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
 * content) and publishes its datum and flags through {@link GridRowContext}.
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
	reorderable = false,
	truncate,
	rowIndex,
	dataRowIndex,
}: GridRowProps<T>) {
	const rowContext = useMemo<GridRowContextValue<T>>(
		() => ({ row, rowKey, selected, loading }),
		[row, rowKey, selected, loading],
	)

	return (
		<GridRowContext value={rowContext}>
			<TableRow
				data-selected={dataAttr(selected)}
				data-row-index={dataRowIndex}
				data-grid-row={String(rowKey)}
				aria-rowindex={rowIndex}
				className={cn(loading && k.rowLoading, className)}
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
								className={cn(k.selectCell, col.className)}
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
								className={cn(k.actionsCell, col.className)}
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
						/>
					)
				})}
			</TableRow>
		</GridRowContext>
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
}

/**
 * One data cell: renders its content through the engine (`flexRender`), wrapping
 * it in the truncation reveal unless the grid opts out, then in a reorder-aware
 * `<td>`. A column with no `cell` yields null content and stays bare.
 *
 * @internal
 */
function GridDataCell<T>({
	cell,
	col,
	row,
	colIndex,
	reorderable,
	truncate,
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
			className={cn(col.className, cellExtra?.className)}
		>
			{content}
		</TableCell>
	)
}

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
