import { type AvatarVariants, k } from '../../recipes/kata/avatar'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link AvatarSkeleton}; `size` matches the avatar it stands in for. */
export type AvatarSkeletonProps = SkeletonProps<NonNullable<AvatarVariants['size']>>

/** Avatar-shaped placeholder; compose in loading trees in place of an {@link Avatar}. */
export const AvatarSkeleton = createSkeleton(k.skeleton, 'AvatarSkeleton')
