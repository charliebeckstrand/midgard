import { k } from '../../recipes/kata/shiny-text'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link ShinyTextSkeleton}; the shared size-driven {@link SkeletonProps} surface. */
export type ShinyTextSkeletonProps = SkeletonProps

/**
 * Placeholder standing in for {@link ShinyText} while its content loads.
 * @remarks Static leaf: renders in React Server Components.
 */
export const ShinyTextSkeleton = createSkeleton(k.skeleton, 'ShinyTextSkeleton')
