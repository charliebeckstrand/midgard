import { cn } from '../../core'
import type { DensityStep } from '../../core/density'
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
	/**
	 * The density step. Omit it to take the step of the nearest density scope,
	 * as the rating does. A step makes the silhouette a density scope.
	 */
	size?: DensityStep
	className?: string
}

/**
 * Rating-shaped placeholder: a row of star-sized squares. Keyed off the star
 * count as well as the size step, so it does not use the size-driven
 * `createSkeleton` factory. An explicit `size` writes `data-density` on the
 * row, and with no `size` the row follows the nearest density scope.
 */
export function RatingSkeleton({ count = 5, size, className }: RatingSkeletonProps) {
	const stars = rangeKeys(count, 'star')

	return (
		<div data-density={size} className={cn(k(), className)}>
			{stars.map((key) => (
				<Placeholder key={key} className={cn(k.skeleton.base, k.glyph)} />
			))}
		</div>
	)
}
