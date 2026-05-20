import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { ActiveIndicatorScope } from '../../primitives/active-indicator'
import { paginationList } from '../../recipes/kata/pagination'

export type PaginationListProps = ComponentPropsWithoutRef<'ol'>

export function PaginationList({ className, children, ...props }: PaginationListProps) {
	return (
		<ActiveIndicatorScope>
			<ol data-slot="pagination-list" className={cn(paginationList(), className)} {...props}>
				{children}
			</ol>
		</ActiveIndicatorScope>
	)
}
