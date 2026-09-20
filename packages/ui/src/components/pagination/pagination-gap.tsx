import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/pagination'

/** Props for {@link PaginationGap}: native `<span>` attributes. */
export type PaginationGapProps = ComponentProps<'span'>

/** Ellipsis spacer marking a skipped range of pages; presentational and hidden from assistive tech. */
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
