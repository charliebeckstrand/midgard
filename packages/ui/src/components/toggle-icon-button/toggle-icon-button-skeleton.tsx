import { k } from '../../recipes/kata/toggle-icon-button'
import type { Size } from '../../types'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link ToggleIconButtonSkeleton}; `size` matches the resolved button hit area. */
export type ToggleIconButtonSkeletonProps = SkeletonProps<Size>

/** Square loading placeholder matching a {@link ToggleIconButton}'s footprint. Compose in loading trees. */
export const ToggleIconButtonSkeleton = createSkeleton(k.skeleton, 'ToggleIconButtonSkeleton')
