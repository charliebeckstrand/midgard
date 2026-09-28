import type { DensityStep } from '../../core/density'
import { k } from '../../recipes/kata/tabs'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link SegmentSkeleton}: an optional `size` step. */
export type SegmentSkeletonProps = SkeletonProps<DensityStep>

/**
 * Loading placeholder matching the {@link Segment} control silhouette, sized
 * by the optional `size` step.
 * @remarks Static leaf: renders in React Server Components.
 * @see {@link Segment}
 */
export const SegmentSkeleton = createSkeleton(k.skeleton.segment, 'SegmentSkeleton')
