import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'

export type TableCellProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'td'>, 'className'>

/**
 * Static leaf: renders in React Server Components. Carries md padding;
 * `<Table density>` and `grid` override it through the table's projection.
 */
export function TableCell({ className, children, ...props }: TableCellProps) {
	return (
		<td data-slot="table-cell" className={cn(k.cell(), className)} {...props}>
			{children}
		</td>
	)
}
