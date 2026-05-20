import { iro, ji, sawari, sen } from '../../core/recipe'

export const k = {
	base: [
		'overflow-hidden',
		'relative isolate',
		'bg-white',
		sen.border,
		'rounded-lg',
		sen.focus.ring,
		sawari.disabled,
	],
	canvas: ['block w-full h-full', 'cursor-crosshair touch-none select-none'],
	placeholder: [
		'absolute inset-0',
		'flex items-center justify-center',
		ji.size.sm,
		iro.text.muted,
		'pointer-events-none',
	],
	actions: ['absolute right-2 bottom-2', 'flex items-center', 'gap-xs'],
}
