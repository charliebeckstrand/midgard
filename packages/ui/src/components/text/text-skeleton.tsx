import { k } from '../../recipes/kata/text'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link TextSkeleton}: the base {@link SkeletonProps} surface (`className` only; fixed silhouette, no `size`). */
export type TextSkeletonProps = SkeletonProps

/**
 * Text-line placeholder for loading trees. Fixed single-line silhouette from
 * the text recipe's base-only skeleton form; takes no `size` prop.
 * @remarks Static leaf: renders in React Server Components.
 * @see {@link Text}
 */
export const TextSkeleton = createSkeleton(k.skeleton, 'TextSkeleton')
