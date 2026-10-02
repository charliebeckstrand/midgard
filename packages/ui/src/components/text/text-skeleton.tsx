import { k, type TextVariants } from '../../recipes/kata/text'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link TextSkeleton}: the `size` of the text it stands in for, plus `className`. */
export type TextSkeletonProps = SkeletonProps<NonNullable<TextVariants['size']>>

/**
 * Text-line placeholder for loading trees: one line at the line height of the
 * text `size`. With no `size`, the line has the height of `md` text, the size
 * that text inherits by default.
 * @remarks Static leaf: renders in React Server Components.
 * @see {@link Text}
 */
export const TextSkeleton = createSkeleton(k.skeleton, 'TextSkeleton')
