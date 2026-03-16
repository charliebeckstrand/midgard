/** Popover menu container (Dropdown, Listbox, Combobox) */
export const popoverMenu = [
	'isolate min-w-full rounded-xl p-1 select-none',
	'outline outline-transparent focus:outline-hidden',
	'overflow-y-auto overscroll-contain',
	'bg-white/75 backdrop-blur-xl dark:bg-zinc-800/75',
	'shadow-lg ring-1 ring-zinc-950/10 dark:ring-white/10 dark:ring-inset',
]

/** Anchor position classes for popover placement */
export const anchorPositions: Record<string, string> = {
	bottom: 'top-full left-0 mt-2',
	'bottom start': 'top-full left-0 mt-2',
	'bottom end': 'top-full right-0 mt-2',
	top: 'bottom-full left-0 mb-2',
	'top start': 'bottom-full left-0 mb-2',
	'top end': 'bottom-full right-0 mb-2',
}
