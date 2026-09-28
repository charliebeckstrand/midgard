import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/radio'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link RadioSkeleton}: the placeholder `size` of the radio and an optional `className`. */
export type RadioSkeletonProps = SkeletonProps<Step>

/** Loading placeholder matching the {@link Radio} silhouette. */
export const RadioSkeleton = createSkeleton(k.skeleton, 'RadioSkeleton')
