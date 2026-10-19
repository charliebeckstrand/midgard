import { k, type ProgressGaugeVariants } from '../../recipes/kata/progress'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link ProgressGaugeSkeleton}: an optional `size` matching the gauge scale. */
export type ProgressGaugeSkeletonProps = SkeletonProps<NonNullable<ProgressGaugeVariants['size']>>

/**
 * A placeholder for a {@link ProgressGauge} while it loads. It has the shape of the ring.
 * @remarks Static leaf: renders in React Server Components.
 */
export const ProgressGaugeSkeleton = createSkeleton<NonNullable<ProgressGaugeVariants['size']>>(
	k.skeleton.gauge,
	'ProgressGaugeSkeleton',
)
