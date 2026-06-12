import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'

export type TableBodyProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'tbody'>, 'className'>

/**
 * Static leaf: renders in React Server Components. Striping comes from the
 * parent `<Table striped>` projection.
 */
export function TableBody({ className, children, ...props }: TableBodyProps) {
	return (
		<tbody data-slot="table-body" className={cn(className)} {...props}>
			{children}
		</tbody>
	)
}
