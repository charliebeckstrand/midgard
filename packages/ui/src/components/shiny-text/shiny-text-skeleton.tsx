import { k } from '../../recipes/kata/shiny-text'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link ShinyTextSkeleton}. */
export type ShinyTextSkeletonProps = SkeletonProps

/** Placeholder standing in for {@link ShinyText} while its content loads. */
export const ShinyTextSkeleton = createSkeleton(k.skeleton, 'ShinyTextSkeleton')
