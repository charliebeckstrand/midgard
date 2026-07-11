'use client'

import { type HTMLAttributes, memo, type ReactNode, useContext } from 'react'
import { TableCell } from '../../components/table'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import { isFrozen } from './engine/grid-pin/overrides'
import { pinnedCellProps } from './engine/grid-pin/styles'
import { columnShiftStyle } from './engine/grid-reorder-compute'
import { type GridCellRovingActivate, resolveCellTooltip } from './engine/grid-row/cell'
import { cellRovingAttrs } from './engine/grid-row/shell'
import { GridCellContent } from './grid-cell-content'
import { GridReorderContext } from './grid-reorder'
import type { GridColumn } from './types'
import type { GridColumnPinning } from './use-grid-table'

/** Props for {@link GridDataCell}. @internal */
export type GridDataCellProps<T> = {
	col: GridColumn<T>
	row: T
	/** The owning row's key, carried so cell roving can build the {@link GridCellClickContext}. */
	rowKey: string | number
	colIndex: number | undefined
	/** 0-based visible column index, matching the header's, so a reorder drag keys the body shift the same way. */
	columnIndex: number
	reorderable: boolean
	truncate: boolean
	/** This column's settled width snapshot; re-renders the cell to re-measure overflow when a resize settles (see {@link GridCellContent}). */
	resizeSettleKey: number | undefined
	pinning: GridColumnPinning | null
	/** Whether the cell is a roving-tabindex item (cell-mode keyboard nav): the focus ring, and Enter / Space activation. @defaultValue false */
	cellRoving?: boolean
	/** Stable focused-cell activation for cell roving (see {@link GridRowsProps.cellActivate}). */
	cellActivate?: GridCellRovingActivate<T>
}

/**
 * One data cell: renders the column's `cell` slot directly against the row,
 * wrapping it in the truncation reveal unless the grid opts out, then in a
 * reorder-aware `<td>`. A column with no `cell` yields null content and stays
 * bare. The direct call — no engine `Cell`, no `flexRender` component boundary —
 * is what lets a body render without materializing the engine row model.
 *
 * @internal
 */
function GridDataCellImpl<T>({
	col,
	row,
	rowKey,
	colIndex,
	columnIndex,
	reorderable,
	truncate,
	resizeSettleKey,
	pinning,
	cellRoving = false,
	cellActivate,
}: GridDataCellProps<T>) {
	const cellExtra = col.cellProps?.(row)

	// Cell-mode roving: the focus ring plus the marker/activation attributes,
	// applied to whichever `<td>` this cell renders (reorder-aware or plain).
	const roving = cellRovingAttrs({ cellRoving, cellActivate, col, row, rowKey })

	const pinned = pinnedCellProps(pinning, col)

	const rovingClass = cellRoving ? k.cell.rovable : undefined

	// Render only columns that declare a `cell`; a bare accessor column stays
	// empty rather than falling back to an engine default renderer.
	const rawContent = col.cell ? (col.cell(row) ?? null) : null

	const content =
		truncate && rawContent != null ? (
			<GridCellContent
				content={rawContent}
				tooltip={resolveCellTooltip(col, row)}
				resizeSettleKey={resizeSettleKey}
			/>
		) : (
			rawContent
		)

	if (reorderable && !isFrozen(col)) {
		return (
			<GridReorderableCell
				id={col.id}
				columnIndex={columnIndex}
				colIndex={colIndex}
				className={cn(rovingClass, col.className)}
				cellProps={roving ? { ...cellExtra, ...roving } : cellExtra}
			>
				{content}
			</GridReorderableCell>
		)
	}

	return (
		<TableCell
			aria-colindex={colIndex}
			{...cellExtra}
			{...roving}
			data-grid-col={col.id}
			className={cn(rovingClass, pinned.className, cellExtra?.className)}
			style={{ ...cellExtra?.style, ...pinned.style }}
		>
			{content}
		</TableCell>
	)
}

/**
 * Memoized {@link GridDataCellImpl}: when a row re-renders, only the cells whose
 * own props (column, row, pinning) changed re-render, so a row-level change
 * (selection, truncation) doesn't re-run the cell renderer and `cellProps` for
 * every cell in the row. @internal
 */
export const GridDataCell = memo(GridDataCellImpl) as typeof GridDataCellImpl

/** Props for {@link GridReorderableCell}. @internal */
type GridReorderableCellProps = {
	id: string | number
	/** 0-based visible column index keying the CSS-variable shift its header writes. */
	columnIndex: number
	colIndex: number | undefined
	className: string | undefined
	cellProps: Omit<HTMLAttributes<HTMLTableCellElement>, 'children'> | undefined
	children: ReactNode
}

/**
 * Body cell for a reordering column. It no longer registers a sortable of its
 * own — that put the column's header id on every body row, a duplicate-id churn
 * dnd-kit re-measures over. Instead the whole column glides via the CSS variable
 * its header writes (see {@link columnShiftStyle}), and this cell only reflects
 * the dragged-column lift from {@link GridReorderContext} — a value that
 * flips just at drag start and end, so a drag re-renders it twice, never per move.
 *
 * @internal
 */
const GridReorderableCell = memo(function GridReorderableCell({
	id,
	columnIndex,
	colIndex,
	className,
	cellProps,
	children,
}: GridReorderableCellProps) {
	const dragging = useContext(GridReorderContext) === String(id)

	return (
		<TableCell
			aria-colindex={colIndex}
			{...cellProps}
			data-dragging={dataAttr(dragging)}
			data-grid-col={id}
			className={cn(k.reorder.cell, k.reorder.shift, className, cellProps?.className)}
			style={{ ...cellProps?.style, ...columnShiftStyle(columnIndex) }}
		>
			{children}
		</TableCell>
	)
})
