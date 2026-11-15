/**
 * Shaku icon: the forms of the icon scale. The scale is the text size of each
 * step plus 4 px (`iconSize` in `core/density/geometry.ts`). An icon element
 * reads the ramp `dan.size.icon.base`. `icon.slot.base` sizes the
 * `data-slot="icon"` children of a parent by the step of its nearest density
 * scope, and Badge, Button, Nav, Sidebar, and `narabi.item` (Menu and Option)
 * read it. `icon.slot.md` sizes those children at the fixed `md` step, for
 * CommandPalette, where the chrome is fixed. Tailwind's JIT scans for whole
 * class literals, so no form can be interpolated from another.
 * `density-geometry.test.ts` pins the ramps to the scale, and
 * `shaku-icon-ramp.test.ts` pins the `md` form.
 *
 * Layer: kiso · Concern: icon dimension
 */

import { dan } from '../dan'

export const icon = {
	/** The forms that size the `data-slot="icon"` children of a host. */
	slot: {
		/** The stepped form: the host sizes its icons by the step of its nearest density scope. */
		base: ['*:data-[slot=icon]:shrink-0', dan.size.icon.slot],
		/** The fixed form at the `md` step, for a host whose chrome is fixed. */
		md: '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
	},
} as const
