import { cn } from '../../core'
import { k } from '../../recipes/kata/pagination'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'

/** Props for {@link PaginationSkeleton}: the count of page-button placeholders. */
export type PaginationSkeletonProps = {
	/**
	 * Page-button placeholders to render, previous and next included.
	 * @defaultValue 7
	 */
	pages?: number
	className?: string
}

/**
 * Pagination-shaped placeholder: a row of page-button squares. Keyed off
 * the button count rather than a size step; it does not use the
 * size-driven `createSkeleton` factory.
 */
export function PaginationSkeleton({ pages = 7, className }: PaginationSkeletonProps) {
	const pageKeys = rangeKeys(pages, 'page')

	return (
		<div className={cn(k(), className)}>
			{pageKeys.map((pageKey) => (
				<Placeholder key={pageKey} className={cn(k.skeleton.item)} />
			))}
		</div>
	)
}
