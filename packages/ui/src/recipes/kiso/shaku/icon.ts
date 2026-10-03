/**
 * Shaku icon: icon dimension scale. `iconSize` is the scale, and three forms
 * project it. `iconRamp` sizes an icon element by the step of its nearest
 * density scope, and Icon reads it. `iconSlotRamp` sizes the
 * `data-slot="icon"` children of a parent the same way, and Badge, Button,
 * Nav, and `narabi.item` (Menu and Option) read it. `icon.md` sizes those
 * children at the fixed `md` step, for CommandPalette, where the chrome is
 * fixed. Tailwind's JIT scans for whole class literals, so no form
 * can be interpolated from another. `shaku-icon-ramp.test.ts` pins each form
 * to the scale.
 *
 * Layer: kiso · Concern: icon dimension
 */

import { dan } from '../dan'

export const iconSize = {
	xs: 'size-3',
	sm: 'size-4',
	md: 'size-5',
	lg: 'size-6',
} as const

export const icon = {
	md: '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
}

/**
 * `iconSize` in a stepped `density-size` class: an icon with no
 * `size` takes the step of its nearest density scope. `shaku-icon-ramp.test.ts`
 * pins it to `iconSize`.
 */
export const iconRamp = dan.size.icon

/**
 * The slot form in a stepped `density-size` class: a density host sizes its
 * `data-slot="icon"` children by the step of its nearest density scope.
 * `shaku-icon-ramp.test.ts` pins it to `iconSize`.
 */
export const iconSlotRamp = ['*:data-[slot=icon]:shrink-0', dan.size.iconSlot]
