import type { ComponentPropsWithRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/table'

/** Props for {@link TableHeader}: native `<th>` attributes, including a `ref` to the cell. */
export type TableHeaderProps = {
	className?: string
} & Omit<ComponentPropsWithRef<'th'>, 'className'>

/**
 * A header cell (`<th>`) within a {@link Table}, defaulting `scope="col"`.
 * Static leaf: renders in React Server Components. Carries md padding;
 * `<Table density>` and `grid` override it through the table's projection.
 *
 * @remarks Forwards `ref` to the underlying `<th>`, so a client caller can make
 * the cell a drag node (e.g. the data table's reorderable column headers).
 * @defaultValue scope `'col'`
 */
export function TableHeader({
	className,
	children,
	scope = 'col',
	ref,
	...props
}: TableHeaderProps) {
	return (
		<th
			ref={ref}
			scope={scope}
			data-slot="table-header"
			className={cn(k.header(), className)}
			{...props}
		>
			{children}
		</th>
	)
}
