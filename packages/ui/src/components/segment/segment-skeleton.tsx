import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/tabs'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type SegmentSkeletonProps = SkeletonProps<Step>

export const SegmentSkeleton = createSkeleton(k.skeleton.segment, 'SegmentSkeleton')
