import { hannou, iro, kasane, narabi } from '../kiso'

const { text } = iro
const { radius } = kasane
const { flex } = narabi

export const k = {
	base: [
		'relative',
		flex.row,
		'justify-center',
		radius.rounded.lg,
		text.muted,
		hannou.text.hover,
		hannou.text.focus,
		'disabled:text-green-600 disabled:opacity-100 disabled:cursor-default',
	],
} as const
