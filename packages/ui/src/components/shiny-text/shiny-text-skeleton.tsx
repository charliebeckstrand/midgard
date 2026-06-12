import { k } from '../../recipes/kata/shiny-text'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type ShinyTextSkeletonProps = SkeletonProps

export const ShinyTextSkeleton = createSkeleton(k.skeleton, 'ShinyTextSkeleton')
