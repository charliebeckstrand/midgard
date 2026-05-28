import { hannou, iro, ji, kasane, narabi, sen } from '../kiso'

export const k = {
	base: [
		'relative isolate overflow-hidden',
		'bg-white',
		sen.border.default,
		kasane.rounded.lg,
		sen.focus.ring,
		hannou.disabled,
	],
	canvas: ['block w-full h-full', 'cursor-crosshair touch-none select-none'],
	placeholder: [
		'absolute inset-0',
		narabi.row,
		'justify-center',
		ji.size.sm,
		iro.text.muted,
		'pointer-events-none',
	],
	actions: ['absolute right-2 bottom-2', narabi.row, 'gap-1'],
} as const
