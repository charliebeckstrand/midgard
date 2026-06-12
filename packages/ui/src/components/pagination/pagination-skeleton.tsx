import { cn } from '../../core'
import { k } from '../../recipes/kata/pagination'
import { Placeholder } from '../placeholder'

export type PaginationSkeletonProps = {
	/** Page-button placeholders to render, previous and next included. */
	pages?: number
	className?: string
}

/**
 * Pagination-shaped placeholder: a row of page-button squares. Keyed off
 * the button count rather than a size step; it does not use the
 * size-driven `createSkeleton` factory.
 */
export function PaginationSkeleton({ pages = 7, className }: PaginationSkeletonProps) {
	const pageKeys = Array.from({ length: pages }, (_, i) => `page-${i}`)

	return (
		<div className={cn(k(), className)}>
			{pageKeys.map((pageKey) => (
				<Placeholder key={pageKey} className={cn(k.skeleton.item)} />
			))}
		</div>
	)
}
