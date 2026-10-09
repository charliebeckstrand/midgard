/**
 * Shaku icon: icon dimension scale. `icon.size` is the scale, and three forms
 * project it. `icon.base` sizes an icon element by the step of its nearest
 * density scope, and Icon reads it. `icon.slot.base` sizes the
 * `data-slot="icon"` children of a parent the same way, and Badge and Button
 * read it. `icon.row` stops at `sm` and `lg`, as the text of a row does, and
 * Nav, Sidebar, and `narabi.item` (Menu and Option) read it.
 * `icon.slot.md` sizes those children at the fixed `md` step, for
 * CommandPalette, where the chrome is fixed. Tailwind's JIT scans for whole
 * class literals, so no form can be interpolated from another. `shaku-icon-ramp.test.ts` pins each form
 * to the scale.
 *
 * Layer: kiso · Concern: icon dimension
 */

import { dan } from '../dan'

export const icon = {
	/** The scale: the size of an icon at each step. */
	size: {
		xs: 'size-3',
		sm: 'size-4',
		md: 'size-5',
		lg: 'size-6',
	},
	/**
	 * `size` in a stepped `density-size` class: an icon with no `size` takes the
	 * step of its nearest density scope.
	 */
	base: dan.size.icon.base,
	/** The forms that size the `data-slot="icon"` children of a host. */
	slot: {
		/** The stepped form: the host sizes its icons by the step of its nearest density scope. */
		base: ['*:data-[slot=icon]:shrink-0', dan.size.icon.slot],
		/** The fixed form at the `md` step, for a host whose chrome is fixed. */
		md: '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
	},
	/**
	 * The forms of a row: a nav item, a sidebar item, a menu item, and an option.
	 * The text, the gap, and the padding of the row stop at `sm` and `lg`, so the
	 * icon stops there too. In an `xs` scope the icon takes `sm`, and in an `xl`
	 * scope it takes `lg`.
	 */
	row: {
		/** The icon element, for the skeleton of a row. */
		base: dan.size.icon.row.base,
		/** The `data-slot="icon"` children of a row. */
		slot: ['*:data-[slot=icon]:shrink-0', dan.size.icon.row.slot],
	},
} as const
