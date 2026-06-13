import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'

/** Props for {@link TableBody}: native `<tbody>` attributes. */
export type TableBodyProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'tbody'>, 'className'>

/**
 * The `<tbody>` of a {@link Table}, grouping its data rows. Static leaf:
 * renders in React Server Components. Striping comes from the parent
 * `<Table striped>` projection.
 */
export function TableBody({ className, children, ...props }: TableBodyProps) {
	return (
		<tbody data-slot="table-body" className={cn(className)} {...props}>
			{children}
		</tbody>
	)
}
