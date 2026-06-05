/**
 * Shaku icon — icon dimension scale. One scale, two projections:
 * `iconSize` sizes an icon element directly (the `<Icon>` self form);
 * `icon` sizes a parent's `data-slot="icon"` descendants (the slot form
 * read by Button, Badge, Sidebar). Tailwind's JIT scans for whole class
 * literals, so the slot form can't be interpolated from `iconSize` — keep
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
