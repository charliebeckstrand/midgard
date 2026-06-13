import { type ColorPanelVariants, k } from '../../recipes/kata/color-panel'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link ColorPanelSkeleton}; accepts an optional `size` and `className`. */
export type ColorPanelSkeletonProps = SkeletonProps<NonNullable<ColorPanelVariants['size']>>

/**
 * Loading placeholder matching the {@link ColorPanel} footprint at the given
 * `size`. Compose in loading trees while color state resolves.
 */
export const ColorPanelSkeleton = createSkeleton(k.skeleton, 'ColorPanelSkeleton')
