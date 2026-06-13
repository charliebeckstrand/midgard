import { k, type SwitchVariants } from '../../recipes/kata/switch'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link SwitchSkeleton}: the placeholder `size` matching the switch's size scale. */
export type SwitchSkeletonProps = SkeletonProps<NonNullable<SwitchVariants['size']>>

/** Switch-shaped loading placeholder sized to the switch's size scale. Compose in loading trees in place of a {@link Switch}. */
export const SwitchSkeleton = createSkeleton(k.skeleton, 'SwitchSkeleton')
