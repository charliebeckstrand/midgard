import { kokkaku } from '../../recipes/kiso'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type ShinyTextSkeletonProps = SkeletonProps

export const ShinyTextSkeleton = createSkeleton(kokkaku.text, 'ShinyTextSkeleton')
