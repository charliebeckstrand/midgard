'use client'

import { k, type SwitchVariants } from '../../recipes/kata/switch'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type SwitchSkeletonProps = SkeletonProps<NonNullable<SwitchVariants['size']>>

export const SwitchSkeleton = createSkeleton(k.skeleton, 'SwitchSkeleton')
