import { k, type StatValueVariants } from '../../recipes/kata/stat'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link StatValueSkeleton}: the `size` variant (sizing the placeholder to match the live value) plus `className`. */
export type StatValueSkeletonProps = SkeletonProps<NonNullable<StatValueVariants['size']>>

/** Value-shaped placeholder; pair with the real `<StatValue size>`. */
export const StatValueSkeleton = createSkeleton<NonNullable<StatValueVariants['size']>>(
	k.skeleton.value,
	'StatValueSkeleton',
)
