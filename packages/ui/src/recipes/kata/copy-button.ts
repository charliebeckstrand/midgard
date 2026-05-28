import { hannou, iro, kasane, narabi } from '../kiso'

const { fg } = hannou
const { text } = iro
const { rounded } = kasane
const { flex } = narabi

export const k = {
	base: [
		'relative',
		flex.row,
		'justify-center',
		rounded.lg,
		text.muted,
		fg.hover,
		fg.focus,
		'disabled:text-green-600 disabled:opacity-100 disabled:cursor-default',
	],
} as const
