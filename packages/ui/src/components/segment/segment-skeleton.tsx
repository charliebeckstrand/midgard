import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/tabs'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link SegmentSkeleton}: an optional `size` step. */
export type SegmentSkeletonProps = SkeletonProps<Step>

/** Loading placeholder matching the {@link Segment} control silhouette. */
export const SegmentSkeleton = createSkeleton(k.skeleton.segment, 'SegmentSkeleton')
