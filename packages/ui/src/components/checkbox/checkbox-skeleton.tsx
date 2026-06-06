'use client'

import { k } from '../../recipes/kata/checkbox'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type CheckboxSkeletonProps = SkeletonProps

export const CheckboxSkeleton = createSkeleton(k.skeleton, 'CheckboxSkeleton')
