import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/pagination'

export type PaginationGapProps = ComponentPropsWithoutRef<'span'>

export function PaginationGap({ className, ...props }: PaginationGapProps) {
	return (
		<li>
			<span
				data-slot="pagination-gap"
				aria-hidden="true"
				className={cn(k.gap(), className)}
				{...props}
			>
				&hellip;
			</span>
		</li>
	)
}
