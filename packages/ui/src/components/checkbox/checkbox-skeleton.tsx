import { k } from '../../recipes/kata/checkbox'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link CheckboxSkeleton}. */
export type CheckboxSkeletonProps = SkeletonProps

/** Shimmering placeholder matching a Checkbox's footprint; compose in loading trees. */
export const CheckboxSkeleton = createSkeleton(k.skeleton, 'CheckboxSkeleton')
