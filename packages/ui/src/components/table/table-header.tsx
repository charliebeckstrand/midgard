import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'

/** Props for {@link TableHeader}: native `<th>` attributes. */
export type TableHeaderProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'th'>, 'className'>

/**
 * A header cell (`<th>`) within a {@link Table}, defaulting `scope="col"`.
 * Static leaf: renders in React Server Components. Carries md padding;
 * `<Table density>` and `grid` override it through the table's projection.
 *
 * @defaultValue scope `'col'`
 */
export function TableHeader({ className, children, scope = 'col', ...props }: TableHeaderProps) {
	return (
		<th scope={scope} data-slot="table-header" className={cn(k.header(), className)} {...props}>
			{children}
		</th>
	)
}
