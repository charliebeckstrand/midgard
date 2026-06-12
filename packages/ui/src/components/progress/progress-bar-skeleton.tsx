import { k, type ProgressTrackVariants } from '../../recipes/kata/progress'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type ProgressBarSkeletonProps = SkeletonProps<NonNullable<ProgressTrackVariants['size']>>

export const ProgressBarSkeleton = createSkeleton(k.skeleton.bar, 'ProgressBarSkeleton')
