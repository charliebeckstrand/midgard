/**
 * Shaku icon: icon dimension scale. `iconSize` is the scale, and three forms
 * project it. `iconRamp` sizes an icon element by the step of its nearest
 * density scope, and Icon reads it. `iconSlotRamp` sizes the
 * `data-slot="icon"` children of a parent the same way, and Badge, Button,
 * and `narabi.item` (Menu and Option) read it. `icon.md` sizes those
 * children at the fixed `md` step, for Nav and CommandPalette, where the
 * chrome is fixed. Tailwind's JIT scans for whole class literals, so no form
 * can be interpolated from another. `shaku-icon-ramp.test.ts` pins each form
 * to the scale.
 *
 * Layer: kiso · Concern: icon dimension
 */

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
export const iconRamp = 'density-size-[3,4,5,6,6]'

/**
 * The slot form in a stepped `density-size` class: a density host sizes its
 * `data-slot="icon"` children by the step of its nearest density scope.
 * `shaku-icon-ramp.test.ts` pins it to `iconSize`.
 */
export const iconSlotRamp = [
	'*:data-[slot=icon]:shrink-0',
	'*:data-[slot=icon]:density-size-[3,4,5,6,6]',
]
