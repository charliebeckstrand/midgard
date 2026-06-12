import { k, type ProgressGaugeVariants } from '../../recipes/kata/progress'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type ProgressGaugeSkeletonProps = SkeletonProps<NonNullable<ProgressGaugeVariants['size']>>

export const ProgressGaugeSkeleton = createSkeleton(k.skeleton.gauge, 'ProgressGaugeSkeleton')
