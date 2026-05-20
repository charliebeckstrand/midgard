import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { paginationGap } from '../../recipes/kata/pagination'

export type PaginationGapProps = ComponentPropsWithoutRef<'span'>

export function PaginationGap({ className, ...props }: PaginationGapProps) {
	return (
		<li>
			<span data-slot="pagination-gap" className={cn(paginationGap(), className)} {...props}>
				&hellip;
			</span>
		</li>
	)
}
