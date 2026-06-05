'use client'

import { type ButtonVariants, k } from '../../recipes/kata/button'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type ButtonSkeletonProps = SkeletonProps<NonNullable<ButtonVariants['size']>>

export const ButtonSkeleton = createSkeleton(k.skeleton, 'ButtonSkeleton')
