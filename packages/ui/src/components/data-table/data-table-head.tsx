'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { type CSSProperties, memo, type ReactElement, type ReactNode } from 'react'
import { cn, dataAttr } from '../../core'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/data-table'
import { isDataColumn } from '../../utilities'
import { Button } from '../button'
import { Checkbox } from '../checkbox'
import { Icon } from '../icon'
import { TableHead, TableHeader, TableRow } from '../table'
import { useDataTable } from './context'
import type { DataTableColumn } from './types'

/** Props for {@link DataTableHead}. @internal */
type DataTableHeadProps<T> = {
	columns: DataTableColumn<T>[]
	hasRows: boolean
	/** When the body is virtualized, the header is row 1 of the full aria-rowcount set. */
	virtualized?: boolean
	/**
	 * Renders each visible non-pinned data column with a drag handle and
	 * registers it as a sortable item. The enclosing {@link DataTable} owns the
	 * dnd context and commits the reorder.
	 * @defaultValue false
	 */
	reorderable?: boolean
}

/**
 * Header row for {@link DataTable}: a select-all checkbox in the selectable
 * column and a sort toggle per sortable column, reading selection and sort state
 * from {@link useDataTable}. When `reorderable`, visible non-pinned data columns
 * also carry a drag handle backed by the data table's column-reorder sortable.
 */
export function DataTableHead<T>({
	columns,
	hasRows,
	virtualized,
	reorderable = false,
}: DataTableHeadProps<T>) {
	const { allSelected, someSelected, toggleAll, sort, toggleSort, stickyHeader } = useDataTable()

	return (
		<TableHead>
			<TableRow aria-rowindex={virtualized ? 1 : undefined}>
				{columns.map((col, colIdx) => {
					// Header column indices accompany the virtualized row-index scheme.
					const colIndex = virtualized ? colIdx + 1 : undefined

					if (col.selectable) {
						return (
							<TableHeader
								key={col.id}
								aria-colindex={colIndex}
								className={cn(k.selectCell, stickyHeader && k.sticky.head, col.headerClassName)}
								style={col.width ? { width: col.width } : undefined}
							>
								{hasRows && (
									<Checkbox
										checked={allSelected}
										indeterminate={someSelected && !allSelected}
										onChange={toggleAll}
										aria-label="Select all rows"
									/>
								)}
							</TableHeader>
						)
					}

					const sorted = sort?.column === col.id

					const direction = sorted ? sort?.direction : undefined

					if (reorderable && isDataColumn(col) && !col.pinned) {
						return (
							<DataTableReorderableColumnHeader
								key={col.id}
								column={col}
								colIndex={colIndex}
								sorted={sorted}
								direction={direction}
								stickyHeader={stickyHeader}
								toggleSort={toggleSort}
							/>
						)
					}

					return (
						<DataTableColumnHeader
							key={col.id}
							column={col}
							colIndex={colIndex}
							sorted={sorted}
							direction={direction}
							stickyHeader={stickyHeader}
							toggleSort={toggleSort}
						/>
					)
				})}
			</TableRow>
		</TableHead>
	)
}

/** Props for the column header cells. @internal */
type DataTableColumnHeaderProps = {
	column: Pick<DataTableColumn<unknown>, 'id' | 'title' | 'sortable' | 'width' | 'headerClassName'>
	colIndex: number | undefined
	sorted: boolean
	direction: 'asc' | 'desc' | undefined
	stickyHeader: boolean
	toggleSort: (column: string | number) => void
}

/** A column's accessible name: its `title` when a string, else the stringified id. @internal */
function headerLabel(column: Pick<DataTableColumn<unknown>, 'id' | 'title'>): string {
	return typeof column.title === 'string' ? column.title : String(column.id)
}

/**
 * `aria-sort` for a column: the active direction, `'none'` when sortable but not
 * the sort column, and `undefined` when not sortable.
 *
 * @internal
 */
function ariaSortValue(
	sortable: boolean | undefined,
	sorted: boolean,
	direction: 'asc' | 'desc' | undefined,
): 'ascending' | 'descending' | 'none' | undefined {
	if (!sortable) return undefined

	if (!sorted) return 'none'

	return direction === 'asc' ? 'ascending' : 'descending'
}

/** Up/down arrow for the active sort column, or `null` when unsorted. @internal */
function sortDirectionIcon(
	sorted: boolean,
	direction: 'asc' | 'desc' | undefined,
): ReactElement | null {
	if (!sorted) return null

	const className = cn(k.sort.icon({ active: true }))

	if (direction === 'asc') return <Icon icon={<ArrowUp />} className={className} />

	if (direction === 'desc') return <Icon icon={<ArrowDown />} className={className} />

	return null
}

/** Title text, wrapped in a sort-toggle button when the column is sortable. @internal */
function ColumnHeaderLabel({
	column,
	sorted,
	direction,
	toggleSort,
}: Omit<DataTableColumnHeaderProps, 'colIndex' | 'stickyHeader'>): ReactNode {
	if (!column.sortable) return column.title

	return (
		<HeadlessProvider>
			<Button
				type="button"
				className={cn(k.sort.button)}
				onClick={() => toggleSort(column.id)}
				aria-label={`Sort by ${headerLabel(column)}`}
			>
				{column.title}
				{sortDirectionIcon(sorted, direction)}
			</Button>
		</HeadlessProvider>
	)
}

/** Single column header cell; renders a sort-toggle button when the column is sortable. @internal */
const DataTableColumnHeader = memo(function DataTableColumnHeader({
	column,
	colIndex,
	sorted,
	direction,
	stickyHeader,
	toggleSort,
}: DataTableColumnHeaderProps) {
	return (
		<TableHeader
			aria-colindex={colIndex}
			aria-sort={ariaSortValue(column.sortable, sorted, direction)}
			className={cn(stickyHeader && k.sticky.head, column.headerClassName)}
			style={column.width ? { width: column.width } : undefined}
		>
			<ColumnHeaderLabel
				column={column}
				sorted={sorted}
				direction={direction}
				toggleSort={toggleSort}
			/>
		</TableHeader>
	)
})

/**
 * Reorderable column header cell: registers the `<th>` as a horizontal sortable
 * item and prefixes the title (and any sort control) with a grip drag handle
 * that carries the pointer/keyboard activator.
 *
 * @internal
 */
const DataTableReorderableColumnHeader = memo(function DataTableReorderableColumnHeader({
	column,
	colIndex,
	sorted,
	direction,
	stickyHeader,
	toggleSort,
}: DataTableColumnHeaderProps) {
	const {
		setNodeRef,
		setActivatorNodeRef,
		attributes,
		listeners,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: String(column.id) })

	const style: CSSProperties = {
		transform: CSS.Transform.toString(transform),
		transition,
		...(column.width ? { width: column.width } : null),
	}

	return (
		<TableHeader
			ref={setNodeRef}
			aria-colindex={colIndex}
			aria-sort={ariaSortValue(column.sortable, sorted, direction)}
			data-dragging={dataAttr(isDragging)}
			className={cn(stickyHeader && k.sticky.head, k.reorder.cell, column.headerClassName)}
			style={style}
		>
			<span className={cn(k.reorder.layout)}>
				<button
					type="button"
					ref={setActivatorNodeRef}
					className={cn(k.reorder.handle)}
					aria-label={`Reorder ${headerLabel(column)}`}
					{...attributes}
					{...listeners}
				>
					<Icon icon={<GripVertical />} />
				</button>
				<ColumnHeaderLabel
					column={column}
					sorted={sorted}
					direction={direction}
					toggleSort={toggleSort}
				/>
			</span>
		</TableHeader>
	)
})
