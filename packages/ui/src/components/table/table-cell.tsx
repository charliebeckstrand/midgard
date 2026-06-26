import type { ComponentPropsWithRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'

/** Props for {@link TableCell}: native `<td>` attributes, including a `ref` to the cell. */
export type TableCellProps = {
	className?: string
} & Omit<ComponentPropsWithRef<'td'>, 'className'>

/**
 * A data cell (`<td>`) within a {@link TableRow}. Static leaf: renders in
 * React Server Components. Carries md padding; `<Table density>` and `outline`
 * override it through the table's projection.
 *
 * @remarks Forwards `ref` to the underlying `<td>`, so a client caller can make
 * the cell a drag node (e.g. the data table's reorderable columns).
 */
export function TableCell({ className, children, ref, ...props }: TableCellProps) {
	return (
		<td ref={ref} data-slot="table-cell" className={cn(k.cell(), className)} {...props}>
			{children}
		</td>
	)
}
