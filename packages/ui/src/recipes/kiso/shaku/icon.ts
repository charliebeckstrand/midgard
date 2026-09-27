/**
 * Shaku icon: icon dimension scale. One scale, four projections.
 * `iconSize` sizes an icon element directly (the Option check mark).
 * `icon` sizes the `data-slot="icon"` children of a parent (the slot form
 * read by Button, Nav, Sidebar, the control affix slots, and
 * `narabi.item`). `iconRamp` and `iconSlotRamp` are the same two forms under
 * the `density-*` variants: Icon and LoadingSpinner read `iconRamp`, and Badge
 * reads `iconSlotRamp`. Tailwind's JIT scans for whole class literals, so no
 * form can be interpolated from another. `shaku-icon-ramp.test.ts` pins the
 * four forms together.
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
 * `iconSize` with each step under a `density-*` variant: an icon with no
 * `size` takes the step of its nearest density scope. `shaku-icon-ramp.test.ts`
 * pins it to `iconSize`.
 */
export const iconRamp = 'density-xs:size-3 density-sm:size-4 density-md:size-5 density-lg:size-6'

/**
 * `icon` with each step under a `density-*` variant: a density host sizes its
 * `data-slot="icon"` children by the step of its nearest density scope.
 * `shaku-icon-ramp.test.ts` pins it to `icon`.
 */
export const iconSlotRamp = [
	'*:data-[slot=icon]:shrink-0',
	'density-xs:*:data-[slot=icon]:size-3 density-sm:*:data-[slot=icon]:size-4 density-md:*:data-[slot=icon]:size-5 density-lg:*:data-[slot=icon]:size-6',
]
