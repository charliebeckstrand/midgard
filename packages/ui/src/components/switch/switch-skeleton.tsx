import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/switch'
import { k, type SwitchVariants } from '../../recipes/kata/switch'
import { createSkeleton, type SkeletonProps } from '../placeholder'

/** Props for {@link SwitchSkeleton}: the placeholder `size` matching the switch's size scale. */
export type SwitchSkeletonProps = SkeletonProps<NonNullable<SwitchVariants['size']>>

/** A placeholder for a {@link Switch} while it loads. It is sized to the switch's size scale. */
export const SwitchSkeleton = createSkeleton<ScaleStep<typeof scale>>(k.skeleton, 'SwitchSkeleton')
