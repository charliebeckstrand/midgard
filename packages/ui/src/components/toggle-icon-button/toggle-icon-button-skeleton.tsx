import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/button'
import { k } from '../../recipes/kata/toggle-icon-button'
import type { ButtonVariants } from '../button'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link ToggleIconButtonSkeleton}; `size` matches the resolved button hit area. */
export type ToggleIconButtonSkeletonProps = SkeletonProps<NonNullable<ButtonVariants['size']>>

/** Square loading placeholder matching a {@link ToggleIconButton}'s footprint. Compose in loading trees. */
export const ToggleIconButtonSkeleton = createSkeleton<ScaleStep<typeof scale>>(
	k.skeleton,
	'ToggleIconButtonSkeleton',
)
