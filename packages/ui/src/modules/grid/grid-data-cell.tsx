'use client'

import { type ComponentProps, memo, type ReactNode, use } from 'react'
import { TableCell } from '../../components/table'
import { cn, dataAttr } from '../../core'
import { k } from '../../recipes/kata/grid'
import { isFrozen } from './engine/grid-pin/overrides'
import { pinnedCellProps } from './engine/grid-pin/styles'
import { columnShiftStyle } from './engine/grid-reorder-compute'
import {
	cellPropsAt,
	type GridCellRovingActivate,
	type GridIndexedColumn,
} from './engine/grid-row/cell'
import { cellRovingAttrs } from './engine/grid-row/shell'
import { cellBody } from './grid-cell-content'
import { GridReorderContext } from './grid-reorder'
import type { GridColumnPinning } from './use-grid-table'

/** Props for {@link GridDataCell}. @internal */
type GridDataCellProps<T> = {
	col: GridIndexedColumn<T>
	row: T
	/**
	 * The row's 0-based place in the view. A cursor cell reads it for its id and
	 * its seat, so a sort or an insert above renders the moved cells again.
	 */
	rowIndex: number
	/** The owning row's key, carried so cell roving can build the {@link GridCellClickContext}. */
	rowKey: string | number
	colIndex: number | undefined
	/** 0-based visible column index, matching the header's, so a reorder drag keys the body shift the same way. */
	columnIndex: number
	reorderable: boolean
	truncate: boolean
	pinning: GridColumnPinning | null
	/** Whether the cell is a roving-tabindex item (cell-mode keyboard nav): the focus ring, and Enter / Space activation. @defaultValue false */
	cellRoving?: boolean
	/** Stable focused-cell activation for cell roving (see {@link GridRowsProps.cellActivate}). */
	cellActivate?: GridCellRovingActivate<T>
}

/**
 * One data cell: renders the column's `cell` slot directly against the row. It
 * marks the matches of the highlight search, and wraps that in the truncation
 * reveal unless the grid opts out, then in a reorder-aware `<td>`. A column with no `cell` yields null content and stays
 * bare. The direct call — no engine `Cell`, no `flexRender` component boundary —
 * is what lets a body render with no engine row, because the engine builds none.
 *
 * @internal
 */
function GridDataCellImpl<T>({
	col,
	row,
	rowIndex,
	rowKey,
	colIndex,
	columnIndex,
	reorderable,
	truncate,
	pinning,
	cellRoving = false,
	cellActivate,
}: GridDataCellProps<T>) {
	const cellExtra = cellPropsAt(col, row, rowIndex)

	// Cell-mode roving: the focus ring plus the marker/activation attributes,
	// applied to whichever `<td>` this cell renders (reorder-aware or plain).
	const roving = cellRovingAttrs({
		cellRoving,
		cellActivate,
		col,
		row,
		rowKey,
		keyDown: cellExtra?.onKeyDown,
	})

	const rovingClass = cellRoving ? k.cell.rovable : undefined

	const content = cellBody(col, row, rowIndex, truncate)

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

	// Pinned chrome resolves only on the plain path — the reorderable cell above
	// glides via `columnShiftStyle` and never reads it.
	const pinned = pinnedCellProps(pinning, col)

	return (
		<TableCell
			aria-colindex={colIndex}
			{...cellExtra}
			{...roving}
			data-grid-col={col.id}
			className={cn(rovingClass, pinned.className, cellExtra?.className)}
			style={{ ...cellExtra?.style, ...pinned.style }}
			data-grid-pin={pinned.pin}
		>
			{content}
		</TableCell>
	)
}

/**
 * Memoized {@link GridDataCellImpl}. When a row re-renders, only the cells whose
 * own props (column, row, place in the view, pinning) changed re-render. A row-level change
 * (selection, truncation) therefore doesn't re-run the cell renderer and
 * `cellProps` for every cell in the row. @internal
 */
export const GridDataCell = memo(GridDataCellImpl) as typeof GridDataCellImpl

/** Props for {@link GridReorderableCell}. @internal */
type GridReorderableCellProps = {
	id: string | number
	/** 0-based visible column index keying the CSS-variable shift its header writes. */
	columnIndex: number
	colIndex: number | undefined
	className: string | undefined
	cellProps: Omit<ComponentProps<'td'>, 'children'> | undefined
	children: ReactNode
}

/**
 * Body cell for a reordering column. It no longer registers a sortable of its
 * own — that put the column's header id on every body row, a duplicate-id churn
 * dnd-kit re-measures over. Instead the whole column glides via the CSS variable
 * its header writes (see {@link columnShiftStyle}). This cell only reflects
 * the dragged-column lift from {@link GridReorderContext}, a value that
 * flips just at drag start and end. A drag therefore re-renders it twice, never per move.
 *
 * It has no `memo`. Its `children` and `cellProps` are new on each render of
 * the memoized {@link GridDataCell}, so a `memo` could never hold.
 *
 * @internal
 */
function GridReorderableCell({
	id,
	columnIndex,
	colIndex,
	className,
	cellProps,
	children,
}: GridReorderableCellProps) {
	const dragging = use(GridReorderContext) === String(id)

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
}
