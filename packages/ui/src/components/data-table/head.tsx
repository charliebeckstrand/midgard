'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
import { memo } from 'react'
import { cn } from '../../core'
import { Checkbox } from '../checkbox'
import { Icon } from '../icon'
import { TableHead, TableHeader, TableRow } from '../table'
import type { DataTableColumn } from './component'
import { useDataTable } from './context'
import { k } from './variants'

type DataTableHeadProps<T> = {
	columns: DataTableColumn<T>[]
}

export function DataTableHead<T>({ columns }: DataTableHeadProps<T>) {
	const { allSelected, someSelected, toggleAll, sort, toggleSort, stickyHeader } = useDataTable()

	return (
		<TableHead>
			<TableRow>
				{columns.map((col) => {
					if (col.selectable) {
						return (
							<TableHeader
								key={col.id}
								className={cn(k.selectCell, stickyHeader && k.stickyHead, col.headerClassName)}
								style={col.width ? { width: col.width } : undefined}
							>
								<Checkbox
									checked={allSelected}
									indeterminate={someSelected && !allSelected}
									onChange={toggleAll}
									aria-label="Select all rows"
								/>
							</TableHeader>
						)
					}

					const isSorted = sort?.column === col.id

					return (
						<DataTableColumnHeader
							key={col.id}
							col={col as DataTableColumn<unknown>}
							isSorted={isSorted}
							direction={isSorted ? sort?.direction : undefined}
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
	col: DataTableColumn<unknown>
	isSorted: boolean
	direction: 'asc' | 'desc' | undefined
	stickyHeader: boolean
	toggleSort: (column: string | number) => void
}

const DataTableColumnHeader = memo(function DataTableColumnHeader({
	col,
	isSorted,
	direction,
	stickyHeader,
	toggleSort,
}: DataTableColumnHeaderProps) {
	return (
		<TableHeader
			className={cn(stickyHeader && k.stickyHead, col.headerClassName)}
			style={col.width ? { width: col.width } : undefined}
		>
			{col.sortable ? (
				<button
					type="button"
					className={cn(k.sortButton)}
					onClick={() => toggleSort(col.id)}
					aria-label={`Sort by ${typeof col.title === 'string' ? col.title : col.id}`}
				>
					{col.title}
					{isSorted && direction === 'asc' ? (
						<Icon icon={<ArrowUp />} className={cn(k.sortIconActive)} />
					) : isSorted && direction === 'desc' ? (
						<Icon icon={<ArrowDown />} className={cn(k.sortIconActive)} />
					) : null}
				</button>
			) : (
				col.title
			)}
		</TableHeader>
	)
})
