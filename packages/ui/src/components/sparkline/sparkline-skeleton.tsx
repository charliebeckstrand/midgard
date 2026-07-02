import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/sparkline'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link SparklineSkeleton}: an optional `size` matching the chart scale. */
export type SparklineSkeletonProps = SkeletonProps<Step>

/**
 * Loading placeholder on the {@link Sparkline} silhouette.
 * @remarks Static leaf: renders in React Server Components.
 */
export const SparklineSkeleton = createSkeleton(k.skeleton, 'SparklineSkeleton')
