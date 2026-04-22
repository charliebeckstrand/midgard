import { cn } from '../../core'
import { paginationGapVariants } from './variants'

export type PaginationGapProps = React.ComponentPropsWithoutRef<'span'>

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
