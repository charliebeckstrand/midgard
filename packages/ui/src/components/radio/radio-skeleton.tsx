import { k } from '../../recipes/kata/radio'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type RadioSkeletonProps = SkeletonProps

export const RadioSkeleton = createSkeleton(k.skeleton, 'RadioSkeleton')
