import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/calendar'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link CalendarSkeleton}; the size-stepped skeleton surface. */
export type CalendarSkeletonProps = SkeletonProps<Step>

/** Calendar-shaped loading placeholder; size-driven via the `createSkeleton` factory. Compose in loading trees in place of `<Calendar>`. */
export const CalendarSkeleton = createSkeleton(k.skeleton, 'CalendarSkeleton')
