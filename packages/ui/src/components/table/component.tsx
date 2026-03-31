'use client'

import { createContext, useContext } from 'react'
import { cn } from '../../core'
import {
	type TableVariants,
	tableBodyVariants,
	tableCellVariants,
	tableGridVariants,
	tableHeaderVariants,
	tableHeadVariants,
	tableRowVariants,
	tableVariants,
} from './variants'

type TableContextValue = {
	bleed: boolean
	dense: boolean
	grid: boolean
	striped: boolean
}

const TableContext = createContext<TableContextValue>({
	bleed: false,
	dense: false,
	grid: false,
	striped: false,
})

function useTable() {
	return useContext(TableContext)
}

export type TableProps = TableVariants & {
	className?: string
	children?: React.ReactNode
}

export function Table({ bleed, dense, grid, striped, className, children }: TableProps) {
	return (
		<TableContext.Provider
			value={{
				bleed: bleed ?? false,
				dense: dense ?? false,
				grid: grid ?? false,
				striped: striped ?? false,
			}}
		>
			<div data-slot="table" className={cn('overflow-x-auto', bleed && '-mx-4 sm:-mx-6')}>
				<table className={cn(tableVariants({ bleed, dense, grid, striped }), className)}>
					{children}
				</table>
			</div>
		</TableContext.Provider>
	)
}

export type TableHeadProps = {
	className?: string
	children?: React.ReactNode
}

export function TableHead({ className, children }: TableHeadProps) {
	return <thead className={cn(tableHeadVariants(), className)}>{children}</thead>
}

export type TableHeaderProps = {
	className?: string
	children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'th'>, 'className'>

export function TableHeader({ className, children, ...props }: TableHeaderProps) {
	const { grid, dense } = useTable()

	return (
		<th
			className={cn(tableHeaderVariants(), grid && tableGridVariants(), dense && 'py-1', className)}
			{...props}
		>
			{children}
		</th>
	)
}

export type TableBodyProps = {
	className?: string
	children?: React.ReactNode
}

export function TableBody({ className, children }: TableBodyProps) {
	const { striped } = useTable()

	return (
		<tbody
			className={cn(
				tableBodyVariants(),
				striped && '*:odd:bg-zinc-950/2.5 dark:*:odd:bg-white/2.5',
				className,
			)}
		>
			{children}
		</tbody>
	)
}

export type TableRowProps = {
	className?: string
	children?: React.ReactNode
	href?: string
} & Omit<React.ComponentPropsWithoutRef<'tr'>, 'className'>

export function TableRow({ className, children, ...props }: TableRowProps) {
	return (
		<tr className={cn(tableRowVariants(), className)} {...props}>
			{children}
		</tr>
	)
}

export type TableCellProps = {
	className?: string
	children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'td'>, 'className'>

export function TableCell({ className, children, ...props }: TableCellProps) {
	const { grid, dense } = useTable()

	return (
		<td
			className={cn(tableCellVariants(), grid && tableGridVariants(), dense && 'py-1', className)}
			{...props}
		>
			{children}
		</td>
	)
}
