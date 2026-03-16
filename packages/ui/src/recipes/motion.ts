/** Popover enter/exit (Dropdown, Listbox, Combobox menus) */
export const popoverAnimation = {
	initial: { opacity: 0, scale: 0.95 },
	animate: { opacity: 1, scale: 1 },
	exit: { opacity: 0, scale: 0.95 },
	transition: { duration: 0.1, ease: 'easeOut' as const },
}

/** Overlay backdrop (Dialog, Alert, MobileSidebar) */
export const overlayAnimation = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
	transition: { duration: 0.15 },
}

/** Slide panel (MobileSidebar) */
export const slidePanelAnimation = {
	initial: { x: '-100%' },
	animate: { x: 0 },
	exit: { x: '-100%' },
	transition: { duration: 0.3, ease: 'easeInOut' as const },
}
