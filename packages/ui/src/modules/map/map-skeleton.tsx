import { createSkeleton, type SkeletonProps } from '../../components/placeholder'
import { k } from '../../recipes/kata/map'

/** Props for {@link MapSkeleton}. */
export type MapSkeletonProps = SkeletonProps

/**
 * Map-shaped loading placeholder filling its container. Compose it in
 * loading trees that stand in for a {@link MapPlat} — a Suspense fallback
 * while geography data fetches, for instance.
 */
export const MapSkeleton = createSkeleton(k.skeleton, 'MapSkeleton')
