'use client'

import { type ColorPanelVariants, k } from '../../recipes/kata/color-panel'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type ColorPanelSkeletonProps = SkeletonProps<NonNullable<ColorPanelVariants['size']>>

export const ColorPanelSkeleton = createSkeleton(k.skeleton, 'ColorPanelSkeleton')
