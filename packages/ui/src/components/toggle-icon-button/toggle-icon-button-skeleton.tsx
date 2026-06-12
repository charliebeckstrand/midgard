import { k } from '../../recipes/kata/toggle-icon-button'
import type { Size } from '../../types'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type ToggleIconButtonSkeletonProps = SkeletonProps<Size>

export const ToggleIconButtonSkeleton = createSkeleton(k.skeleton, 'ToggleIconButtonSkeleton')
