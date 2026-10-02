import { k } from '../../recipes/kata/stat'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link StatDescriptionSkeleton}: an optional `className`. */
export type StatDescriptionSkeletonProps = SkeletonProps

/** Description-shaped placeholder. */
export const StatDescriptionSkeleton = createSkeleton(
	k.skeleton.description,
	'StatDescriptionSkeleton',
)
