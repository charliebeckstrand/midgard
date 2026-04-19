'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
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
						<TableHeader
							key={col.id}
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
									{isSorted && sort?.direction === 'asc' ? (
										<Icon icon={<ArrowUp />} className={cn(k.sortIconActive)} />
									) : isSorted && sort?.direction === 'desc' ? (
										<Icon icon={<ArrowDown />} className={cn(k.sortIconActive)} />
									) : null}
								</button>
							) : (
								col.title
							)}
						</TableHeader>
					)
				})}
			</TableRow>
		</TableHead>
	)
}
