import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'

/** Props for {@link TableRow}: native `<tr>` attributes. */
export type TableRowProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'tr'>, 'className'>

/**
 * A table row (`<tr>`) holding {@link TableCell}s or {@link TableHeader}s.
 * Static leaf: renders in React Server Components. Picks up zebra striping
 * from the parent `<Table striped>` projection.
 */
export function TableRow({ className, children, ...props }: TableRowProps) {
	return (
		<tr data-slot="table-row" className={cn(k.row, className)} {...props}>
			{children}
		</tr>
	)
}
