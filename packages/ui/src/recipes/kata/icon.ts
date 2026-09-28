import { shaku } from '../kiso'

// `ramp` is the icon scale in a stepped `density-size` class, so an
// icon with no `size` takes the step of its nearest density scope. The slot
// form (`shaku.icon`, `shaku.iconSlotRamp`) sizes the `data-slot="icon"`
// children of a host with the same scale.
export const k = {
	ramp: shaku.iconRamp,
} as const
