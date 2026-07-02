import { createSkeleton, type SkeletonProps } from '../../components/placeholder'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/chart'

/** Props for {@link ChartSkeleton}: an optional `size` matching the chart scale. */
export type ChartSkeletonProps = SkeletonProps<Step>

/**
 * Loading placeholder on the chart frame's silhouette — full width at the
 * size step's height, standing in for any of the chart kinds.
 * @remarks Static leaf: renders in React Server Components.
 */
export const ChartSkeleton = createSkeleton(k.skeleton, 'ChartSkeleton')
