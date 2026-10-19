import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/checkbox'
import { k } from '../../recipes/kata/checkbox'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link CheckboxSkeleton}: the placeholder `size` of the checkbox and an optional `className`. */
export type CheckboxSkeletonProps = SkeletonProps<ScaleStep<typeof scale>>

/** A placeholder for a Checkbox while it loads. It has the footprint of the box. */
export const CheckboxSkeleton = createSkeleton<ScaleStep<typeof scale>>(
	k.skeleton,
	'CheckboxSkeleton',
)
