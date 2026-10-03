import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/radio'
import { k } from '../../recipes/kata/radio'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link RadioSkeleton}: the placeholder `size` of the radio and an optional `className`. */
export type RadioSkeletonProps = SkeletonProps<ScaleStep<typeof scale>>

/** Loading placeholder matching the {@link Radio} silhouette. */
export const RadioSkeleton = createSkeleton<ScaleStep<typeof scale>>(k.skeleton, 'RadioSkeleton')
