import { k, type StatValueVariants } from '../../recipes/kata/stat'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link StatValueSkeleton}: the `size` variant (sizing the placeholder to match the live value) plus `className`. */
export type StatValueSkeletonProps = SkeletonProps<NonNullable<StatValueVariants['size']>>

/** A placeholder for a StatValue while it loads. Give it the `size` of the real `<StatValue>`. */
export const StatValueSkeleton = createSkeleton<NonNullable<StatValueVariants['size']>>(
	k.skeleton.value,
	'StatValueSkeleton',
)
