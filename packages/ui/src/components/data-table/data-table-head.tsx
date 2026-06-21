'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
import { memo, type ReactElement } from 'react'
import { cn } from '../../core'
import { HeadlessProvider } from '../../providers/headless'
import { k } from '../../recipes/kata/data-table'
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
}

/**
 * Header row for {@link DataTable}: a select-all checkbox in the selectable
 * column and a sort toggle per sortable column, reading selection and sort state
 * from {@link useDataTable}.
 */
export function DataTableHead<T>({ columns, hasRows, virtualized }: DataTableHeadProps<T>) {
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

					return (
						<DataTableColumnHeader
							key={col.id}
							column={col}
							colIndex={colIndex}
							sorted={sorted}
							direction={sorted ? sort?.direction : undefined}
							stickyHeader={stickyHeader}
							toggleSort={toggleSort}
						/>
					)
				})}
			</TableRow>
		</TableHead>
	)
}

/** Props for {@link DataTableColumnHeader}. @internal */
type DataTableColumnHeaderProps = {
	column: Pick<DataTableColumn<unknown>, 'id' | 'title' | 'sortable' | 'width' | 'headerClassName'>
	colIndex: number | undefined
	sorted: boolean
	direction: 'asc' | 'desc' | undefined
	stickyHeader: boolean
	toggleSort: (column: string | number) => void
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
			{column.sortable ? (
				<HeadlessProvider>
					<Button
						type="button"
						className={cn(k.sort.button)}
						onClick={() => toggleSort(column.id)}
						aria-label={`Sort by ${typeof column.title === 'string' ? column.title : column.id}`}
					>
						{column.title}
						{sortDirectionIcon(sorted, direction)}
					</Button>
				</HeadlessProvider>
			) : (
				column.title
			)}
		</TableHeader>
	)
})
