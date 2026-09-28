/**
 * Shaku icon: icon dimension scale. One scale, four projections.
 * `iconSize` sizes an icon element directly. `icon` sizes the
 * `data-slot="icon"` children of a parent at one fixed step (the slot form
 * that Nav and CommandPalette read, where the chrome is fixed). `iconRamp` and
 * `iconSlotRamp` are the same two forms in stepped `density-size` classes: Icon
 * reads `iconRamp`, and Badge, Button, Sidebar, and `narabi.item` (Menu and
 * Option) read `iconSlotRamp`. Tailwind's JIT scans for
 * whole class literals, so no form can be interpolated from another.
 * `shaku-icon-ramp.test.ts` pins each stepped form to its fixed form.
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
	xs: '*:data-[slot=icon]:size-3 *:data-[slot=icon]:shrink-0',
	sm: '*:data-[slot=icon]:size-4 *:data-[slot=icon]:shrink-0',
	md: '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
	lg: '*:data-[slot=icon]:size-6 *:data-[slot=icon]:shrink-0',
}

/**
 * `iconSize` in a stepped `density-size` class: an icon with no
 * `size` takes the step of its nearest density scope. `shaku-icon-ramp.test.ts`
 * pins it to `iconSize`.
 */
export const iconRamp = 'density-size-[3,4,5,6,6]'

/**
 * `icon` in a stepped `density-size` class: a density host sizes its
 * `data-slot="icon"` children by the step of its nearest density scope.
 * `shaku-icon-ramp.test.ts` pins it to `icon`.
 */
export const iconSlotRamp = [
	'*:data-[slot=icon]:shrink-0',
	'*:data-[slot=icon]:density-size-[3,4,5,6,6]',
]
