export const toast = {
	viewport: [
		'fixed z-[100] top-0 bottom-0 flex flex-col',
		'max-sm:inset-x-0 max-sm:justify-end',
		'p-4',
		'pointer-events-none',
	],
	scroll: [
		'flex flex-col max-h-full overflow-y-auto overscroll-contain',
		'w-fit max-sm:w-full',
		'pointer-events-auto',
	],
	position: {
		'top-right': 'justify-start right-0',
		'top-left': 'justify-start left-0',
		'bottom-right': 'justify-end right-0',
		'bottom-left': 'justify-end left-0',
	},
	card: 'w-80 max-sm:w-full',
	defaults: { position: 'bottom-right' as const },
}
