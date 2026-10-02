import { cn } from '../../core'
import type { ControlStep } from '../../core/density'
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
	size?: ControlStep
	className?: string
}

/**
 * Rating-shaped placeholder: a row of star-sized squares. Keyed off the star
 * count as well as the size step, so it does not use the size-driven
 * `createSkeleton` factory. An explicit `size` writes `data-density` on the
 * row, and with no `size` the row follows the nearest density scope.
 *
 * @remarks A `<span>` row of `<span>` stars, as the rating itself is, so it stands in for one
 * anywhere a rating can go, a line of text included.
 */
export function RatingSkeleton({ count = 5, size, className }: RatingSkeletonProps) {
	const stars = rangeKeys(count, 'star')

	return (
		<span data-density={size} className={cn(k(), className)}>
			{stars.map((key) => (
				<Placeholder key={key} as="span" className={cn(k.skeleton.base, k.glyph)} />
			))}
		</span>
	)
}
