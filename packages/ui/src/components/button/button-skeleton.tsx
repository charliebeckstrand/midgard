import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/button'
import { type ButtonVariants, k } from '../../recipes/kata/button'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link ButtonSkeleton}; the size-stepped skeleton surface. */
export type ButtonSkeletonProps = SkeletonProps<NonNullable<ButtonVariants['size']>>

/**
 * A placeholder for a Button while it loads. It is size-driven through the
 * `createSkeleton` factory.
 */
export const ButtonSkeleton = createSkeleton<ScaleStep<typeof scale>>(k.skeleton, 'ButtonSkeleton')
