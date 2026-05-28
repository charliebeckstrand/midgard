import { hannou, iro, ji, kasane, narabi, sen } from '../kiso'

const { disabled } = hannou
const { text } = iro
const { size } = ji
const { radius } = kasane
const { flex } = narabi
const { border, focus } = sen

export const k = {
	base: [
		'relative isolate overflow-hidden',
		'bg-white',
		border.default,
		radius.rounded.lg,
		focus.ring,
		disabled,
	],
	canvas: ['block w-full h-full', 'cursor-crosshair touch-none select-none'],
	placeholder: [
		'absolute inset-0',
		flex.row,
		'justify-center',
		size.sm,
		text.muted,
		'pointer-events-none',
	],
	actions: ['absolute right-2 bottom-2', flex.row, 'gap-1'],
} as const
