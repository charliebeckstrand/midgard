import { hannou, iro, kasane, narabi } from '../kiso'

export const k = {
	base: [
		'relative',
		narabi.flex.row,
		'justify-center',
		kasane.radius.rounded.lg,
		iro.text.muted,
		hannou.text.hover,
		hannou.text.focus,
		'disabled:text-green-600 disabled:opacity-100 disabled:cursor-default',
	],
} as const
