import { k, type ProgressTrackVariants } from '../../recipes/kata/progress'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link ProgressBarSkeleton}: an optional `size` matching the track scale. */
export type ProgressBarSkeletonProps = SkeletonProps<NonNullable<ProgressTrackVariants['size']>>

/**
 * Loading placeholder matching the {@link ProgressBar} track silhouette.
 * @remarks Static leaf: renders in React Server Components.
 */
export const ProgressBarSkeleton = createSkeleton(k.skeleton.bar, 'ProgressBarSkeleton')
