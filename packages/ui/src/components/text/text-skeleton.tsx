'use client'

import { k } from '../../recipes/kata/text'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type TextSkeletonProps = SkeletonProps

export const TextSkeleton = createSkeleton(k.skeleton, 'TextSkeleton')
