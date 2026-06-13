import { k } from '../../recipes/kata/text'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link TextSkeleton}; the shared size-driven {@link SkeletonProps} surface. */
export type TextSkeletonProps = SkeletonProps

/** Text-line placeholder for loading trees, sized from the text recipe's skeleton scale. */
export const TextSkeleton = createSkeleton(k.skeleton, 'TextSkeleton')
