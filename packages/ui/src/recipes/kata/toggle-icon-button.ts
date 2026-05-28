import { hannou, iro, kasane, narabi } from '../kiso'

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
		hannou.text.hover,
		hannou.text.focus,
	],
	transition:
		'transition-[opacity,filter,scale] duration-300 ease-in-out will-change-[opacity,filter,scale]',
	active: 'scale-100 opacity-100 blur-0',
	inactive: 'blur-xs scale-[0.25] opacity-0',
} as const
