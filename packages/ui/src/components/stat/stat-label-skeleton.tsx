import { k } from '../../recipes/kata/stat'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link StatLabelSkeleton}: an optional `className`. */
export type StatLabelSkeletonProps = SkeletonProps

/** Label-shaped placeholder. */
export const StatLabelSkeleton = createSkeleton(k.skeleton.label, 'StatLabelSkeleton')
