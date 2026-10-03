import { type BadgeVariants, k } from '../../recipes/kata/badge'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link BadgeSkeleton}; `size` matches the badge it stands in for. */
export type BadgeSkeletonProps = SkeletonProps<NonNullable<BadgeVariants['size']>>

/**
 * Badge-shaped placeholder; compose in loading trees in place of a {@link Badge}.
 *
 * @remarks A `<span>` flowing inline, as the badge itself does, so it stands in for one
 * anywhere a badge can go, a line of text included. A `div` there would be invalid inside a
 * `<p>` and break hydration of a server-rendered tree.
 */
export const BadgeSkeleton = createSkeleton<NonNullable<BadgeVariants['size']>>(
	k.skeleton,
	'BadgeSkeleton',
)
