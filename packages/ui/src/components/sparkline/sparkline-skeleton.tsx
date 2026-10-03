import type { ScaleStep } from '../../core/density'
import { k, type scale } from '../../recipes/kata/sparkline'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link SparklineSkeleton}: an optional `size` matching the chart scale. */
export type SparklineSkeletonProps = SkeletonProps<ScaleStep<typeof scale>>

/**
 * Loading placeholder on the {@link Sparkline} silhouette.
 * @remarks Static leaf: renders in React Server Components.
 */
export const SparklineSkeleton = createSkeleton<ScaleStep<typeof scale>>(
	k.skeleton,
	'SparklineSkeleton',
)
