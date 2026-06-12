import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'

export type TableHeaderProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'th'>, 'className'>

/**
 * Static leaf: renders in React Server Components. Carries md padding; a
 * non-md `<Table density>` (and `grid`) overrides it through the table's
 * projection.
 */
export function TableHeader({ className, children, scope = 'col', ...props }: TableHeaderProps) {
	return (
		<th scope={scope} data-slot="table-header" className={cn(k.header(), className)} {...props}>
			{children}
		</th>
	)
}
