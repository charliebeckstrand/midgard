import { k, type TextVariants } from '../../recipes/kata/text'
import { createSkeleton, type SkeletonProps } from '../placeholder/placeholder-skeleton'

/** Props for {@link TextSkeleton}: the `size` of the text it stands in for, plus `className`. */
export type TextSkeletonProps = SkeletonProps<NonNullable<TextVariants['size']>>

/**
 * A placeholder for a Text while it loads. It is one line at the line height of
 * the text `size`. With no `size`, the line has the line height of the text of
 * its parent, as a Text with no `size` takes the size of its parent.
 * @remarks Static leaf: renders in React Server Components.
 * @see {@link Text}
 */
export const TextSkeleton = createSkeleton<NonNullable<TextVariants['size']>>(
	k.skeleton,
	'TextSkeleton',
)
