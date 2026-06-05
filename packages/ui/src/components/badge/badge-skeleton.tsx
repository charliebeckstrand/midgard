'use client'

import { type BadgeVariants, k } from '../../recipes/kata/badge'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type BadgeSkeletonProps = SkeletonProps<NonNullable<BadgeVariants['size']>>

export const BadgeSkeleton = createSkeleton(k.skeleton, 'BadgeSkeleton')
