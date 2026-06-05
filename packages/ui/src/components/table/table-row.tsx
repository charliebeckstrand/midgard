import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'

export type TableRowProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'tr'>, 'className'>

export function TableRow({ className, children, ...props }: TableRowProps) {
	return (
		<tr data-slot="table-row" className={cn(k.row, className)} {...props}>
			{children}
		</tr>
	)
}
