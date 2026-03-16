/** Shared item classes for navbar and sidebar items */
export const navItemBase = [
	// Leading icon/icon-only
	'*:data-[slot=icon]:size-6 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:fill-zinc-500 sm:*:data-[slot=icon]:size-5',
	// Avatar
	'*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-7 sm:*:data-[slot=avatar]:size-6',
	// Focus
	'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:rounded-lg',
	// Hover
	'hover:bg-zinc-950/5 hover:*:data-[slot=icon]:fill-zinc-950',
	// Active
	'active:bg-zinc-950/5 active:*:data-[slot=icon]:fill-zinc-950',
	// Dark mode
	'dark:text-white dark:*:data-[slot=icon]:fill-zinc-400',
	'dark:hover:bg-white/5 dark:hover:*:data-[slot=icon]:fill-white',
	'dark:active:bg-white/5 dark:active:*:data-[slot=icon]:fill-white',
]
