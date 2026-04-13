'use client'

import { cn, createContext } from '../../core'
import { katachi } from '../../recipes'

const k = katachi.table

export type TableVariants = {
	dense?: boolean
	bleed?: boolean
	grid?: boolean
	striped?: boolean
}

type TableContextValue = {
	bleed: boolean
	dense: boolean
	grid: boolean
	striped: boolean
}

const [TableProvider, useTable] = createContext<TableContextValue>('Table')

export type TableProps = TableVariants & {
	className?: string
	children?: React.ReactNode
}

export function Table({ bleed, dense, grid, striped, className, children }: TableProps) {
	return (
		<TableProvider
			value={{
				bleed: bleed ?? false,
				dense: dense ?? false,
				grid: grid ?? false,
				striped: striped ?? false,
			}}
		>
			<div data-slot="table" className={cn('overflow-x-auto', bleed && '-mx-4 sm:-mx-6')}>
				<table className={cn(k.base, className)}>{children}</table>
			</div>
		</TableProvider>
	)
}

export type TableHeadProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'thead'>, 'className'>

export function TableHead({ className, children, ...props }: TableHeadProps) {
	return (
		<thead className={cn(k.head, className)} {...props}>
			{children}
		</thead>
	)
}

export type TableHeaderProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'th'>, 'className'>

export function TableHeader({ className, children, ...props }: TableHeaderProps) {
	const { grid, dense } = useTable()

	return (
		<th className={cn(k.header, grid && k.grid, dense && 'py-1', className)} {...props}>
			{children}
		</th>
	)
}

export type TableBodyProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'tbody'>, 'className'>

export function TableBody({ className, children, ...props }: TableBodyProps) {
	const { striped } = useTable()

	return (
		<tbody className={cn(striped && k.striped, className)} {...props}>
			{children}
		</tbody>
	)
}

export type TableRowProps = {
	className?: string
	href?: string
} & Omit<React.ComponentPropsWithoutRef<'tr'>, 'className'>

export function TableRow({ className, children, ...props }: TableRowProps) {
	return (
		<tr className={cn(k.row, className)} {...props}>
			{children}
		</tr>
	)
}

export type TableCellProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'td'>, 'className'>

export function TableCell({ className, children, ...props }: TableCellProps) {
	const { grid, dense } = useTable()

	return (
		<td className={cn(k.cell, grid && k.grid, dense && 'py-1', className)} {...props}>
			{children}
		</td>
	)
}
