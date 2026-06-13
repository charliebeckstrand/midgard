import { type BadgeVariants, k } from '../../recipes/kata/badge'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link BadgeSkeleton}; `size` matches the badge it stands in for. */
export type BadgeSkeletonProps = SkeletonProps<NonNullable<BadgeVariants['size']>>

/** Badge-shaped placeholder; compose in loading trees in place of a {@link Badge}. */
export const BadgeSkeleton = createSkeleton(k.skeleton, 'BadgeSkeleton')
