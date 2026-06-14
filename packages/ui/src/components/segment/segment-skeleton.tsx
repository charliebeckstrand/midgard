import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/tabs'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link SegmentSkeleton}: an optional `size` step. */
export type SegmentSkeletonProps = SkeletonProps<Step>

/**
 * Loading placeholder matching the {@link Segment} control silhouette, sized
 * by the optional `size` step.
 * @remarks Static leaf: renders in React Server Components.
 * @see {@link Segment}
 */
export const SegmentSkeleton = createSkeleton(k.skeleton.segment, 'SegmentSkeleton')
