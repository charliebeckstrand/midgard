import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/checkbox'
import { k } from '../../recipes/kata/checkbox'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link CheckboxSkeleton}: the placeholder `size` of the checkbox and an optional `className`. */
export type CheckboxSkeletonProps = SkeletonProps<ScaleStep<typeof scale>>

/** Shimmering placeholder matching a Checkbox's footprint; compose in loading trees. */
export const CheckboxSkeleton = createSkeleton<ScaleStep<typeof scale>>(
	k.skeleton,
	'CheckboxSkeleton',
)
