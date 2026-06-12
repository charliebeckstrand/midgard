import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/calendar'
import { createSkeleton, type SkeletonProps } from '../placeholder'

export type CalendarSkeletonProps = SkeletonProps<Step>

export const CalendarSkeleton = createSkeleton(k.skeleton, 'CalendarSkeleton')
