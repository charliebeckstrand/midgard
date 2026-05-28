import { hannou, iro, kasane, narabi } from '../kiso'

export const k = {
	base: [
		'relative',
		narabi.row,
		'justify-center',
		kasane.radius.rounded.lg,
		iro.text.muted,
		hannou.text.hover,
		hannou.text.focus,
	],
	transition:
		'transition-[opacity,filter,scale] duration-300 ease-in-out will-change-[opacity,filter,scale]',
	active: 'scale-100 opacity-100 blur-0',
	inactive: 'blur-xs scale-[0.25] opacity-0',
} as const
