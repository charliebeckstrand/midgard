/**
 * Icon slot recipes — single source of truth for icon sizing and behavior.
 *
 * Base size: size-5 (20px) → sm:size-4 (16px)
 * All components target icons via `*:data-[slot=icon]`.
 *
 * Recipes compose: iconSlot is the atom, trailingIcon and iconOnly build on it.
 */

/** Icon sizing: the standard size-5/sm:size-4 pair (string form for direct className use) */
export const iconSize = '*:data-[slot=icon]:size-5 sm:*:data-[slot=icon]:size-4'

/** Base icon slot: sizing + shrink-0 */
export const iconSlot = [
	'*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
	'sm:*:data-[slot=icon]:size-4',
]

/** Icon-only containers: reset margins so icon centers cleanly */
export const iconSlotIconOnly = [
	'data-icon-only:*:data-[slot=icon]:mx-0',
	'data-icon-only:*:data-[slot=icon]:my-0',
	'sm:data-icon-only:*:data-[slot=icon]:my-0',
]

/** Trailing icon slot: last icon pushes to the right (chevrons, arrows) */
export const trailingIcon = [
	'*:last:data-[slot=icon]:ml-auto *:last:data-[slot=icon]:size-5',
	'sm:*:last:data-[slot=icon]:size-4',
]

/**
 * Icon-only auto-detection: square aspect when element has icon but no label.
 * Pure CSS — no prop needed. Requires children to use data-slot="label" for text.
 */
export const iconOnlyDetection = [
	'[&:has([data-slot=icon]):not(:has([data-slot=label]))]:aspect-square',
	'[&:has([data-slot=icon]):not(:has([data-slot=label]))]:justify-center',
	'[&:has([data-slot=icon]):not(:has([data-slot=label]))]:w-auto',
]
