import { cn } from '../../core'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/rating'
import { rangeKeys } from '../../utilities'
import { Placeholder } from '../placeholder'

/** Props for {@link RatingSkeleton}: the star `count` and the `size` step the silhouette draws at. */
export type RatingSkeletonProps = {
	/**
	 * Star placeholders to render.
	 * @defaultValue 5
	 */
	count?: number
	/** @defaultValue 'md' */
	size?: Step
	className?: string
}

/**
 * Rating-shaped placeholder: a row of star-sized squares. Keyed off the star
 * count as well as the size step, so it does not use the size-driven
 * `createSkeleton` factory.
 */
export function RatingSkeleton({ count = 5, size = 'md', className }: RatingSkeletonProps) {
	const stars = rangeKeys(count, 'star')

	return (
		<div className={cn(k({ size }), className)}>
			{stars.map((key) => (
				<Placeholder key={key} className={cn(k.skeleton.base, k.skeleton.size[size])} />
			))}
		</div>
	)
}
