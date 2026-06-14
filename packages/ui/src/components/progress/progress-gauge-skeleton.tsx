import { k, type ProgressGaugeVariants } from '../../recipes/kata/progress'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link ProgressGaugeSkeleton}: an optional `size` matching the gauge scale. */
export type ProgressGaugeSkeletonProps = SkeletonProps<NonNullable<ProgressGaugeVariants['size']>>

/**
 * Loading placeholder matching the {@link ProgressGauge} ring silhouette.
 * @remarks Static leaf: renders in React Server Components.
 */
export const ProgressGaugeSkeleton = createSkeleton(k.skeleton.gauge, 'ProgressGaugeSkeleton')
