import { kasane, kokkaku, narabi } from '../kiso'

const { rounded } = kasane
const { flex } = narabi

export const k = {
	base: ['relative', flex.row, 'justify-center', rounded.lg],
	// The two icons cross-fade. Each icon takes `icon.base` and the class of its state.
	icon: {
		base: 'transition-[opacity,filter,scale] duration-300 ease-in-out will-change-[opacity,filter,scale] motion-reduce:transition-none',
		active: 'scale-100 opacity-100 blur-none',
		inactive: 'blur-xs scale-[0.25] opacity-0',
	},
	skeleton: kokkaku.toggleIconButton,
} as const
