import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { paginationGapVariants } from './variants'

export type PaginationGapProps = ComponentPropsWithoutRef<'span'>

export function PaginationGap({ className, ...props }: PaginationGapProps) {
	return (
		<li>
			<span
				data-slot="pagination-gap"
				className={cn(paginationGapVariants(), className)}
				{...props}
			>
				&hellip;
			</span>
		</li>
	)
}
