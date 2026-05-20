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

					const sorted = sort?.column === col.id

					return (
						<DataTableColumnHeader
							key={col.id}
							col={col}
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
	col: Pick<DataTableColumn<unknown>, 'id' | 'title' | 'sortable' | 'width' | 'headerClassName'>
	sorted: boolean
	direction: 'asc' | 'desc' | undefined
	stickyHeader: boolean
	toggleSort: (column: string | number) => void
}

const DataTableColumnHeader = memo(function DataTableColumnHeader({
	col,
	sorted,
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
				<Headless>
					<Button
						type="button"
						className={cn(k.sortButton)}
						onClick={() => toggleSort(col.id)}
						aria-label={`Sort by ${typeof col.title === 'string' ? col.title : col.id}`}
					>
						{col.title}
						{sorted && direction === 'asc' ? (
							<Icon icon={<ArrowUp />} className={cn(k.sortIconActive)} />
						) : sorted && direction === 'desc' ? (
							<Icon icon={<ArrowDown />} className={cn(k.sortIconActive)} />
						) : null}
					</Button>
				</Headless>
			) : (
				col.title
			)}
		</TableHeader>
	)
})
