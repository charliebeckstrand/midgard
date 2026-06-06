'use client'

import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/card'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type CardSkeletonProps = SkeletonProps<Step>

export const CardSkeleton = createSkeleton(k.skeleton, 'CardSkeleton')
