import { k } from '../../recipes/kata/stat'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link StatDeltaSkeleton}: an optional `className`. */
export type StatDeltaSkeletonProps = SkeletonProps

/** A placeholder for a StatDelta while it loads. */
export const StatDeltaSkeleton = createSkeleton(k.skeleton.delta, 'StatDeltaSkeleton')
