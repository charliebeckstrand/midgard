'use client'

import { Checkbox } from '../../components/checkbox'
import { TableHeader } from '../../components/table'
import { cn } from '../../core'
import { k } from '../../recipes/kata/grid'
import { useGrid } from './context'
import { isNewRowAddColumn, NEW_ROW_ADD_COLUMN_LABEL } from './engine/grid-new-row-column'
import { pinnedHeaderProps } from './engine/grid-pin/styles'
import type { GridColumn } from './types'
import type { GridColumnPinning } from './use-grid-table'

/** The place of a static header cell: its column, index, and frozen edge. @internal */
type GridStaticHeaderPlace<T> = {
	column: GridColumn<T>
	colIndex: number | undefined
	stickyHeader: boolean
	pinning: GridColumnPinning | null
}

/**
 * The `<th>` props of a static header cell that can freeze: the column index,
 * the class of the cell with the sticky and pinned classes, the pinned inset,
 * and the pin side. @internal
 */
function pinnedHeaderCellProps<T>(place: GridStaticHeaderPlace<T>, className: string) {
	const pinned = pinnedHeaderProps(place.pinning, place.column, place.column.width || undefined)

	return {
		'aria-colindex': place.colIndex,
		className: cn(className, place.stickyHeader && k.sticky.head, pinned.className),
		style: pinned.style,
		'data-grid-pin': pinned.pin,
	}
}

/**
 * Header cell for the selection column: the select-all checkbox, shown only
 * when the grid has rows. It sticks and freezes like any header.
 *
 * @internal
 */
function GridSelectHeaderCell<T>({
	showCheckbox,
	label,
	...place
}: GridStaticHeaderPlace<T> & {
	/** Whether the checkbox shows. An empty grid has nothing to select. */
	showCheckbox: boolean
	/** The accessible name of the checkbox. */
	label: string
}) {
	const { allSelected, someSelected, toggleAll } = useGrid()

	return (
		<TableHeader {...pinnedHeaderCellProps(place, k.cell.select)}>
			{showCheckbox && (
				<Checkbox
					checked={allSelected}
					indeterminate={someSelected && !allSelected}
					onChange={toggleAll}
					aria-label={label}
				/>
			)}
		</TableHeader>
	)
}

/**
 * Header cell for the row drag-handle column: an empty, grip-width `<th>`, since
 * the handles live in the body rows. It carries a screen-reader label, so the
 * column still names itself. Sticky/pinned like any header.
 *
 * @internal
 */
function GridDragHandleHeaderCell<T>({
	column,
	colIndex,
	stickyHeader,
	pinning,
}: {
	column: GridColumn<T>
	colIndex: number | undefined
	stickyHeader: boolean
	pinning: GridColumnPinning | null
}) {
	return (
		<TableHeader
			{...pinnedHeaderCellProps({ column, colIndex, stickyHeader, pinning }, k.row.reorder.cell)}
		>
			<span className="sr-only">Reorder rows</span>
		</TableHeader>
	)
}

/**
 * Header cell for the Add column of the new-row slot: an empty `<th>` at the
 * column's fixed width, since the control lives in the slot. It carries a
 * screen-reader label, so the column still names itself. It does not stick
 * to the inline end (see `buildColumnPinning`).
 *
 * @internal
 */
function GridNewRowAddHeaderCell<T>({
	column,
	colIndex,
	stickyHeader,
}: {
	column: GridColumn<T>
	colIndex: number | undefined
	stickyHeader: boolean
}) {
	return (
		<TableHeader
			aria-colindex={colIndex}
			className={cn(k.cell.actions, stickyHeader && k.sticky.head)}
			style={{ width: column.width }}
		>
			<span className="sr-only">{NEW_ROW_ADD_COLUMN_LABEL}</span>
		</TableHeader>
	)
}

/** Whether a column takes a {@link GridStaticHeaderCell}: selection, drag handle, or Add. @internal */
export function isStaticHeaderColumn<T>(column: GridColumn<T>): boolean {
	return Boolean(column.selectable || column.dragHandle) || isNewRowAddColumn(column.id)
}

/**
 * The header cell of a column with no title, sort, or filter: the selection
 * checkbox, the row drag handle, or the Add control of the new-row slot. See
 * {@link isStaticHeaderColumn}.
 *
 * @internal
 */
export function GridStaticHeaderCell<T>({
	showCheckbox,
	label,
	...place
}: GridStaticHeaderPlace<T> & {
	/** Whether the select-all checkbox shows. An empty grid has nothing to select. */
	showCheckbox: boolean
	/** The accessible name of the select-all checkbox. */
	label: string
}) {
	const { column } = place

	if (column.selectable) {
		return <GridSelectHeaderCell {...place} showCheckbox={showCheckbox} label={label} />
	}

	if (column.dragHandle) return <GridDragHandleHeaderCell {...place} />

	return (
		<GridNewRowAddHeaderCell
			column={column}
			colIndex={place.colIndex}
			stickyHeader={place.stickyHeader}
		/>
	)
}
