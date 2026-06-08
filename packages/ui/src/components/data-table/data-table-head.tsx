'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
import { memo } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/data-table'
import { Button } from '../button'
import { Checkbox } from '../checkbox'
import { Headless } from '../headless'
import { Icon } from '../icon'
import { TableHead, TableHeader, TableRow } from '../table'
import { useDataTable } from './context'
import type { DataTableColumn } from './types'

type DataTableHeadProps<T> = {
	columns: DataTableColumn<T>[]
	hasRows: boolean
	/** When the body is virtualized, the header is row 1 of the full aria-rowcount set. */
	virtualized?: boolean
}

export function DataTableHead<T>({ columns, hasRows, virtualized }: DataTableHeadProps<T>) {
	const { allSelected, someSelected, toggleAll, sort, toggleSort, stickyHeader } = useDataTable()

	return (
		<TableHead>
			<TableRow aria-rowindex={virtualized ? 1 : undefined}>
				{columns.map((col) => {
					if (col.selectable) {
						return (
							<TableHeader
								key={col.id}
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

type DataTableColumnHeaderProps = {
	column: Pick<DataTableColumn<unknown>, 'id' | 'title' | 'sortable' | 'width' | 'headerClassName'>
	sorted: boolean
	direction: 'asc' | 'desc' | undefined
	stickyHeader: boolean
	toggleSort: (column: string | number) => void
}

const DataTableColumnHeader = memo(function DataTableColumnHeader({
	column,
	sorted,
	direction,
	stickyHeader,
	toggleSort,
}: DataTableColumnHeaderProps) {
	return (
		<TableHeader
			aria-sort={
				column.sortable
					? sorted
						? direction === 'asc'
							? 'ascending'
							: 'descending'
						: 'none'
					: undefined
			}
			className={cn(stickyHeader && k.sticky.head, column.headerClassName)}
			style={column.width ? { width: column.width } : undefined}
		>
			{column.sortable ? (
				<Headless>
					<Button
						type="button"
						className={cn(k.sortButton)}
						onClick={() => toggleSort(column.id)}
						aria-label={`Sort by ${typeof column.title === 'string' ? column.title : column.id}`}
					>
						{column.title}
						{sorted && direction === 'asc' ? (
							<Icon icon={<ArrowUp />} className={cn(k.sortIconActive)} />
						) : sorted && direction === 'desc' ? (
							<Icon icon={<ArrowDown />} className={cn(k.sortIconActive)} />
						) : null}
					</Button>
				</Headless>
			) : (
				column.title
			)}
		</TableHeader>
	)
})
