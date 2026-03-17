/** Shared item classes for navbar and sidebar items */
export const navItemBase = [
	// Leading icon/icon-only
	'*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:fill-zinc-500',
	// Avatar
	'*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7 sm:*:data-[slot=avatar]:size-6',
	// Hover
	'group-hover:bg-zinc-950/5 group-hover:*:data-[slot=icon]:fill-zinc-950',
	// Active
	'active:bg-zinc-950/5 active:*:data-[slot=icon]:fill-zinc-950',
	// Dark mode
	'dark:text-white dark:*:data-[slot=icon]:fill-zinc-400',
	'dark:group-hover:bg-white/5 dark:group-hover:*:data-[slot=icon]:fill-white',
	'dark:active:bg-white/5 dark:active:*:data-[slot=icon]:fill-white',
]
