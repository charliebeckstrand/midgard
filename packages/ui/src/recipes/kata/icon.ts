import type { DensityStep } from '../../core/density'
import { shaku } from '../kiso'

/** Named step of the icon scale: a step of {@link shaku.iconRamp}. */
export type IconSize = Exclude<DensityStep, 'xl'>

// `ramp` is the icon scale with each step under a `density-*` variant, so an
// icon with no `size` takes the step of its nearest density scope. The slot
// form (`shaku.icon`, `shaku.iconSlotRamp`) sizes the `data-slot="icon"`
// children of a host with the same scale.
export const k = {
	ramp: shaku.iconRamp,
} as const
