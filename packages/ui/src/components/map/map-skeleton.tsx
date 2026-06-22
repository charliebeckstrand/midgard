import { k } from '../../recipes/kata/map'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link MapSkeleton}. */
export type MapSkeletonProps = SkeletonProps

/**
 * Map-shaped loading placeholder filling its container. {@link Map} renders it
 * internally while MapLibre loads; compose it directly in loading trees that
 * stand in for a map.
 */
export const MapSkeleton = createSkeleton(k.skeleton, 'MapSkeleton')
