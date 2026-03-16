/** Base styles for selectable menu items (Dropdown, Listbox, Combobox) */
export const menuItemBase = [
	'cursor-default rounded-lg py-2.5 sm:py-1.5',
	'text-base/6 text-zinc-950 sm:text-sm/6 dark:text-white forced-colors:text-[CanvasText]',
	'outline-hidden focus:bg-blue-500 focus:text-white hover:bg-blue-500 hover:text-white',
	'forced-color-adjust-none forced-colors:focus:bg-[Highlight] forced-colors:focus:text-[HighlightText]',
	'data-disabled:opacity-50',
]

/** Icon and avatar slot styles shared by menu items */
export const menuItemSlots = [
	'*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 sm:*:data-[slot=icon]:size-4',
	'*:data-[slot=icon]:text-zinc-500 group-focus/option:*:data-[slot=icon]:text-white dark:*:data-[slot=icon]:text-zinc-400',
	'forced-colors:*:data-[slot=icon]:text-[CanvasText] forced-colors:group-focus/option:*:data-[slot=icon]:text-[Canvas]',
	'*:data-[slot=avatar]:-mx-0.5 *:data-[slot=avatar]:size-6 sm:*:data-[slot=avatar]:size-5',
]
