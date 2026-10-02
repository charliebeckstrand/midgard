import { k } from '../../recipes/kata/stat'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link StatDeltaSkeleton}: an optional `className`. */
export type StatDeltaSkeletonProps = SkeletonProps

/** Delta-shaped placeholder. */
export const StatDeltaSkeleton = createSkeleton(k.skeleton.delta, 'StatDeltaSkeleton')
