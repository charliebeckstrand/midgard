import { defineScale } from '../../core/density'
import { defineKata } from '../../core/recipe'
import { shaku } from '../kiso'

// The root slot is the icon scale in a stepped `density-size` class, so an
// icon with no `size` takes the step of its nearest density scope. The slot
// form (`shaku.icon.slot`) sizes the `data-slot="icon"`
// children of a host with the same scale.
export const k = defineKata({ base: shaku.icon.base })

/** The size scale of {@link Icon}: the steps of the icon ramp. */
export const scale = defineScale(shaku.icon.base)
