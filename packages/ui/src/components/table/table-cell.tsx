import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'

/** Props for {@link TableCell}: native `<td>` attributes. */
export type TableCellProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'td'>, 'className'>

/**
 * A data cell (`<td>`) within a {@link TableRow}. Static leaf: renders in
 * React Server Components. Carries md padding; `<Table density>` and `grid`
 * override it through the table's projection.
 */
export function TableCell({ className, children, ...props }: TableCellProps) {
	return (
		<td data-slot="table-cell" className={cn(k.cell(), className)} {...props}>
			{children}
		</td>
	)
}
