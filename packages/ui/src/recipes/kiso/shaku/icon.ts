/**
 * Shaku icon: icon dimension scale. One scale, two projections:
 * `iconSize` sizes an icon element directly (the `<Icon>` self form).
 * `icon` sizes a parent's `data-slot="icon"` descendants (the slot form
 * read by Button, Badge, Nav, Sidebar, the control affix slots, and
 * `narabi.item`). Tailwind's JIT scans for whole class
 * literals; the slot form can't be interpolated from `iconSize`. Keep
 * the two in step by hand; edit both rows together.
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
 * `size` takes the step of its nearest density scope. Keep it in step with
 * `iconSize`.
 */
export const iconRamp = 'density-xs:size-3 density-sm:size-4 density-md:size-5 density-lg:size-6'

/**
 * `icon` with each step under a `density-*` variant: a density host sizes its
 * `data-slot="icon"` children by the step of its nearest density scope. Keep it
 * in step with `icon`.
 */
export const iconSlotRamp = [
	'*:data-[slot=icon]:shrink-0',
	'density-xs:*:data-[slot=icon]:size-3 density-sm:*:data-[slot=icon]:size-4 density-md:*:data-[slot=icon]:size-5 density-lg:*:data-[slot=icon]:size-6',
]
