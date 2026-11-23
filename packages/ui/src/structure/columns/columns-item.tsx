import type { ComponentProps } from 'react'
import { cn } from '../../core/cn'
import { item } from '../../recipes/kata/columns'
import type { ResponsiveColumnSpan } from './variants'

/** Props for {@link ColumnsItem}: `span`, plus `<div>` attributes. */
export type ColumnsItemProps = {
	/**
	 * The count of columns that the cell spans, or `'full'` for each column of
	 * its row. `'full'` spans the row at each count of columns, so a cell that
	 * fills its row needs no breakpoint. Supports responsive breakpoints.
	 * @defaultValue One column.
	 */
	span?: ResponsiveColumnSpan
} & ComponentProps<'div'>

/**
 * One cell of {@link Columns} that spans more than one column. Use it in place
 * of a `col-span` class on a child of `Columns`, so the span names no
 * breakpoint and no count of columns by hand. A child that spans one column
 * needs no `ColumnsItem`.
 *
 * @remarks
 * Static leaf with no client boundary: renders in React Server Components.
 */
export function ColumnsItem({ span, className, children, ...props }: ColumnsItemProps) {
	return (
		<div data-slot="columns-item" className={cn(item({ span }).base, className)} {...props}>
			{children}
		</div>
	)
}
