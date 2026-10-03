import { k } from '../../recipes/kata/pagination'
import { renderRowSkeleton } from '../placeholder/placeholder-skeleton'

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
 * Pagination-shaped placeholder: a row of page-button squares between the
 * squares of the Previous and Next buttons. Keyed off
 * the button count rather than a size step; it does not use the
 * size-driven `createSkeleton` factory.
 */
export function PaginationSkeleton({ pages = 7, className }: PaginationSkeletonProps) {
	return renderRowSkeleton({
		count: pages,
		root: [k(), className],
		item: (index) => (index === 0 || index === pages - 1 ? k.skeleton.nav : k.skeleton.item),
	})
}
