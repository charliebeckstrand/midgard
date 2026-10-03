import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/button'
import { type ButtonVariants, k } from '../../recipes/kata/button'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link ButtonSkeleton}; the size-stepped skeleton surface. */
export type ButtonSkeletonProps = SkeletonProps<NonNullable<ButtonVariants['size']>>

/**
 * Button-shaped loading placeholder; size-driven via the `createSkeleton`
 * factory. Compose in loading trees in place of `<Button>`.
 */
export const ButtonSkeleton = createSkeleton<ScaleStep<typeof scale>>(k.skeleton, 'ButtonSkeleton')
