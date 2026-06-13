import { k } from '../../recipes/kata/radio'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link RadioSkeleton}: an optional `className`. */
export type RadioSkeletonProps = SkeletonProps

/** Loading placeholder matching the {@link Radio} silhouette. */
export const RadioSkeleton = createSkeleton(k.skeleton, 'RadioSkeleton')
