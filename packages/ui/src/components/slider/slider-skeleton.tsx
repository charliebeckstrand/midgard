import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/slider'
import { k, type SliderVariants } from '../../recipes/kata/slider'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link SliderSkeleton}, including the `size` step to match the real control. */
export type SliderSkeletonProps = SkeletonProps<NonNullable<SliderVariants['size']>>

/**
 * A placeholder for a {@link Slider} while it loads. It has the shape of the
 * track; pass the same `size`.
 */
export const SliderSkeleton = createSkeleton<ScaleStep<typeof scale>>(k.skeleton, 'SliderSkeleton')
