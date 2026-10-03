import { type AvatarVariants, k } from '../../recipes/kata/avatar'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link AvatarSkeleton}; `size` matches the avatar it stands in for. */
export type AvatarSkeletonProps = SkeletonProps<NonNullable<AvatarVariants['size']>>

/**
 * Avatar-shaped placeholder; compose in loading trees in place of an {@link Avatar}.
 *
 * @remarks A `<span>` flowing inline, as the avatar itself does, so it stands in for one
 * anywhere an avatar can go, a line of text included.
 */
export const AvatarSkeleton = createSkeleton<NonNullable<AvatarVariants['size']>>(
	k.skeleton,
	'AvatarSkeleton',
)
