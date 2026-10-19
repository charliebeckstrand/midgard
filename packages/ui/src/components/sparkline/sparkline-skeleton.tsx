import type { ScaleStep } from '../../core/density'
import { k, type scale } from '../../recipes/kata/sparkline'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link SparklineSkeleton}: an optional `size` matching the chart scale. */
export type SparklineSkeletonProps = SkeletonProps<ScaleStep<typeof scale>>

/**
 * A placeholder for a {@link Sparkline} while it loads.
 * @remarks Static leaf: renders in React Server Components.
 */
export const SparklineSkeleton = createSkeleton<ScaleStep<typeof scale>>(
	k.skeleton,
	'SparklineSkeleton',
)
