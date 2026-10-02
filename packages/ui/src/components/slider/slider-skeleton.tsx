import type { ControlStep } from '../../core/density'
import { k, type SliderVariants } from '../../recipes/kata/slider'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link SliderSkeleton}, including the `size` step to match the real control. */
export type SliderSkeletonProps = SkeletonProps<NonNullable<SliderVariants['size']>>

/** Track-shaped placeholder standing in for a {@link Slider} while its value loads; pass the same `size`. */
export const SliderSkeleton = createSkeleton<ControlStep>(k.skeleton, 'SliderSkeleton')
