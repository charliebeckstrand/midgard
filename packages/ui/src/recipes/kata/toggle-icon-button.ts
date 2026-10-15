import { kokkaku } from '../kiso'

// Button gives the box, the layout, and the stepped radius. The recipe sets none of them: a plain
// utility in `className` comes after the recipe of Button and wins.
export const k = {
	// The two icons cross-fade. Each icon takes `icon.base` and the class of its state.
	icon: {
		base: 'transition-[opacity,filter,scale] duration-300 ease-in-out will-change-[opacity,filter,scale] motion-reduce:transition-none',
		active: 'scale-100 opacity-100 blur-none',
		inactive: 'blur-xs scale-[0.25] opacity-0',
	},
	skeleton: kokkaku.toggleIconButton,
} as const
