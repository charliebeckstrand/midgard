import type { ComponentPropsWithRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'

/** Props for {@link TableRow}: native `<tr>` attributes, including a `ref` to the row. */
export type TableRowProps = {
	className?: string
} & Omit<ComponentPropsWithRef<'tr'>, 'className'>

/**
 * A table row (`<tr>`) holding {@link TableCell}s or {@link TableHeader}s.
 * Static leaf: renders in React Server Components. A body row picks up zebra
 * striping and the hover wash from the parent `<Table striped>` / `<Table
 * hover>` projections.
 *
 * @remarks Forwards `ref` to the underlying `<tr>`, so a client caller can make
 * the row a drag node (e.g. the data table's reorderable rows).
 */
export function TableRow({ className, children, ref, ...props }: TableRowProps) {
	return (
		<tr ref={ref} data-slot="table-row" className={cn(k.row, className)} {...props}>
			{children}
		</tr>
	)
}
