import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { k } from '../../recipes/kata/pagination'

/** Props for {@link PaginationList}: native `<ol>` attributes. */
export type PaginationListProps = ComponentProps<'ol'>

/** Ordered list of pagination items; establishes an active-indicator scope so the current page animates between siblings. */
export function PaginationList({ className, children, ...props }: PaginationListProps) {
	return (
		<ActiveIndicatorScope>
			<ol data-slot="pagination-list" className={cn(k.list(), className)} {...props}>
				{children}
			</ol>
		</ActiveIndicatorScope>
	)
}
