import type { ScaleStep } from '../../core/density/scale'
import type { ButtonVariants, scale } from '../../recipes/kata/button'
import { k } from '../../recipes/kata/icon-button'
import { createSkeleton, type SkeletonProps } from '../placeholder/placeholder-skeleton'

/** Props for {@link IconButtonSkeleton}; `size` matches the resolved button hit area. */
export type IconButtonSkeletonProps = SkeletonProps<NonNullable<ButtonVariants['size']>>

/**
 * A placeholder for an {@link IconButton} while it loads. It is a square with
 * the footprint of the button.
 */
export const IconButtonSkeleton = createSkeleton<ScaleStep<typeof scale>>(
	k.skeleton,
	'IconButtonSkeleton',
)
