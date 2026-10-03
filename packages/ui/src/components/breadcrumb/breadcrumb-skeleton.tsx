import { k } from '../../recipes/kata/breadcrumb'
import { renderRowSkeleton } from '../placeholder/placeholder-skeleton'

/** Props for {@link BreadcrumbSkeleton}; the placeholder crumb count. */
export type BreadcrumbSkeletonProps = {
	/** Crumb placeholders to render. @defaultValue 3 */
	crumbs?: number
	className?: string
}

/**
 * Breadcrumb-shaped placeholder: crumb lines with chevron-sized
 * separators between them. Keyed off the crumb count rather than a size
 * step; it does not use the size-driven `createSkeleton` factory.
 */
export function BreadcrumbSkeleton({ crumbs = 3, className }: BreadcrumbSkeletonProps) {
	return renderRowSkeleton({
		count: crumbs,
		root: [k.list(), className],
		item: k.skeleton.item,
		separator: k.skeleton.separator,
	})
}
