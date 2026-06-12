import { k, type SliderVariants } from '../../recipes/kata/slider'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type SliderSkeletonProps = SkeletonProps<NonNullable<SliderVariants['size']>>

export const SliderSkeleton = createSkeleton(k.skeleton, 'SliderSkeleton')
