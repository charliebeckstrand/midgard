import { maru } from '../maru'

export const popover = {
	trigger: 'inline-flex',
	portal: 'z-100',
	panel: [
		maru.rounded.lg,
		'absolute isolate z-50 min-w-full',
		'p-1 space-y-0.5',
		'outline outline-transparent focus:outline-hidden',
		'overflow-y-auto overscroll-contain',
		'cursor-pointer select-none',
	],
}
