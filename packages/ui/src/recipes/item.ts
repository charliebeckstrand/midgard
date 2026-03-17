/** Base styles for selectable menu items (Dropdown, Listbox, Combobox) */
export const menuItemBase = [
	// Layout
	'cursor-default rounded-lg py-2.5 sm:py-1.5',
	'outline-hidden',
	// Text
	'text-base/6 text-zinc-950',
	'dark:text-white',
	// Focus
	'focus:bg-blue-600 focus:text-white',
	// Hover
	'hover:bg-blue-600 hover:text-white',
	// Disabled
	'data-disabled:opacity-50',
	// Forced colors
	'forced-colors:text-[CanvasText]',
	'forced-color-adjust-none forced-colors:focus:bg-[Highlight] forced-colors:focus:text-[HighlightText]',
]

/** Icon and avatar slot styles shared by menu items */
export const menuItemSlots = [
	// Icon sizing
	'*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 sm:*:data-[slot=icon]:size-4',
	// Icon colors
	'*:data-[slot=icon]:text-zinc-500',
	'dark:*:data-[slot=icon]:text-zinc-400',
	// Icon colors — focus
	'group-focus/option:*:data-[slot=icon]:text-white',
	// Icon colors — forced colors
	'forced-colors:*:data-[slot=icon]:text-[CanvasText]',
	'forced-colors:group-focus/option:*:data-[slot=icon]:text-[Canvas]',
	// Avatar sizing
	'*:data-[slot=avatar]:-mx-0.5 *:data-[slot=avatar]:size-6 sm:*:data-[slot=avatar]:size-5',
]
