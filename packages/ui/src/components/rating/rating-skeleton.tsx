import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/rating'
import { k } from '../../recipes/kata/rating'
import { renderRowSkeleton } from '../placeholder/placeholder-skeleton'

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
	size?: ScaleStep<typeof scale>
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
	return renderRowSkeleton({
		count,
		root: [k(), className],
		item: [k.skeleton.base, k.glyph],
		density: size,
		as: 'span',
	})
}
