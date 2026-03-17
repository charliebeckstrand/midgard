/**
 * Shared icon slot styles — single source of truth for icon sizing within components.
 *
 * Base size: size-5 (20px) → sm:size-4 (16px)
 * All components use `*:data-[slot=icon]` to target icon children.
 *
 * Components can override with additional specificity or per-use classes.
 */

/** Icon sizing: the standard size-5/sm:size-4 pair used across the system */
export const iconSize = '*:data-[slot=icon]:size-5 sm:*:data-[slot=icon]:size-4'

/** Base icon slot styles: sizing + shrink-0 (prevents icons from compressing in flex containers) */
export const iconSlot = [
	'*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0',
	'sm:*:data-[slot=icon]:size-4',
]

/** Icon slot for icon-only containers: no negative margin, no vertical offset */
export const iconSlotIconOnly = [
	'data-icon-only:*:data-[slot=icon]:mx-0',
	'data-icon-only:*:data-[slot=icon]:my-0',
	'sm:data-icon-only:*:data-[slot=icon]:my-0',
]
