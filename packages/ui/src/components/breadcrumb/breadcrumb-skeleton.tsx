import { Fragment } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/breadcrumb'
import { Placeholder } from '../placeholder'

export type BreadcrumbSkeletonProps = {
	/** Crumb placeholders to render, separated by chevron-sized squares. */
	items?: number
	className?: string
}

/**
 * Breadcrumb-shaped placeholder: crumb lines with chevron-sized
 * separators between them. Keyed off the crumb count rather than a size
 * step; it does not use the size-driven `createSkeleton` factory.
 */
export function BreadcrumbSkeleton({ items = 3, className }: BreadcrumbSkeletonProps) {
	const itemKeys = Array.from({ length: items }, (_, i) => `item-${i}`)

	return (
		<div className={cn(k.list(), className)}>
			{itemKeys.map((itemKey, index) => (
				<Fragment key={itemKey}>
					{index > 0 && <Placeholder className={cn(k.skeleton.separator)} />}
					<Placeholder className={cn(k.skeleton.item)} />
				</Fragment>
			))}
		</div>
	)
}
