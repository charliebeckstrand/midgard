import type { ControlStep } from '../../core/density'
import { k } from '../../recipes/kata/checkbox'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link CheckboxSkeleton}: the placeholder `size` of the checkbox and an optional `className`. */
export type CheckboxSkeletonProps = SkeletonProps<ControlStep>

/** Shimmering placeholder matching a Checkbox's footprint; compose in loading trees. */
export const CheckboxSkeleton = createSkeleton<ControlStep>(k.skeleton, 'CheckboxSkeleton')
