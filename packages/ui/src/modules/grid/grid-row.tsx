'use client'

import { useSortable } from '@dnd-kit/sortable'
import { type HTMLAttributes, memo, type ReactNode, useMemo } from 'react'
import { Checkbox } from '../../components/checkbox'
import { TableCell, TableRow } from '../../components/table'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import { GridRowContext, type GridRowContextValue } from './context'
import { columnDragStyle } from './grid-reorder'
import type { GridColumn } from './types'

/** Props for {@link GridRow}. @internal */
type GridRowProps<T> = {
	row: T
	rowKey: string | number
	columns: GridColumn<T>[]
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
 * One data row: maps `columns` to cells (selection checkbox, actions, or `cell`
 * content) and publishes its datum and flags through {@link GridRowContext}.
 *
 * @internal
 */
function GridRowImpl<T>({
	row,
	rowKey,
	columns,
	loading,
	className,
	rowLabel,
	selected,
	toggleRow,
	reorderable = false,
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
				{columns.map((col, colIdx) => {
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

					const cellExtra = col.cellProps?.(row)

					const content = col.cell ? col.cell(row) : null

					if (reorderable && !col.pinned) {
						return (
							<GridReorderableCell
								key={col.id}
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
							key={col.id}
							aria-colindex={colIndex}
							{...cellExtra}
							data-grid-col={col.id}
							className={cn(col.className, cellExtra?.className)}
						>
							{content}
						</TableCell>
					)
				})}
			</TableRow>
		</GridRowContext>
	)
}

/** Memoized {@link GridRowImpl}; re-renders a row only when its own props change. @internal */
export const GridRow = memo(GridRowImpl) as typeof GridRowImpl

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
