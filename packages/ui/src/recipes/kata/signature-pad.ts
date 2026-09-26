import { hannou, ji, kasane, narabi, sen } from '../kiso'

const { disabled } = hannou
const { size } = ji
const { rounded } = kasane
const { flex } = narabi
const { border, focus } = sen

// The pad keeps a white surface in both themes, so the ink and the placeholder
// take the light-theme shades. A `dark:` foreground would paint light on white.
// The canvas reads its own computed `color` as the default stroke color.
export const k = {
	base: [
		'relative isolate overflow-hidden',
		'bg-white text-zinc-950',
		border.default,
		rounded.lg,
		focus.ring,
		...disabled,
	],
	canvas: ['block w-full h-full', 'cursor-crosshair touch-none select-none'],
	placeholder: [
		'absolute inset-0',
		flex.row,
		'justify-center',
		size.sm,
		'text-zinc-500',
		'pointer-events-none',
	],
	actions: ['absolute right-2 bottom-2', flex.row, 'gap-1'],
} as const
