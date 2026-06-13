import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'

/** Props for {@link TableHead}: native `<thead>` attributes. */
export type TableHeadProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'thead'>, 'className'>

/**
 * The `<thead>` of a {@link Table}, grouping its header row(s). Static leaf:
 * renders in React Server Components.
 */
export function TableHead({ className, children, ...props }: TableHeadProps) {
	return (
		<thead data-slot="table-head" className={cn(k.head, className)} {...props}>
			{children}
		</thead>
	)
}
