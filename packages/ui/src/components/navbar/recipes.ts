import { iconSlot } from '../../recipes/icon'

/** Shared item classes for navbar and sidebar items */
export const navItemBase = [
	// Icon slots — sizing from shared recipe, nav-specific fill color
	...iconSlot,
	'*:data-[slot=icon]:fill-zinc-500',
	'dark:text-white dark:*:data-[slot=icon]:fill-zinc-400',
	// Avatar slots
	'*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7 sm:*:data-[slot=avatar]:size-6',
	// Hover
	'group-hover:bg-zinc-950/5 group-hover:*:data-[slot=icon]:fill-zinc-950',
	'dark:group-hover:bg-white/5 dark:group-hover:*:data-[slot=icon]:fill-white',
	// Active
	'active:bg-zinc-950/5 active:*:data-[slot=icon]:fill-zinc-950',
	'dark:active:bg-white/5 dark:active:*:data-[slot=icon]:fill-white',
]
