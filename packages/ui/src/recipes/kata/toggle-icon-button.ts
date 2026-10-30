import { defineKata } from '../../core/recipe'
import { kokkaku } from '../kiso'

// Button gives the box, the layout, and the stepped radius. The recipe sets none of them: a plain
// utility in `className` comes after the recipe of Button and wins.
export const k = defineKata(
	{
		slots: {
			// The two icons cross-fade. The icon of the state of the button is `active`.
			icon: {
				base: 'transition-[opacity,filter,scale] duration-300 ease-in-out motion-reduce:transition-none',
				active: {
					true: 'scale-100 opacity-100 blur-none',
					false: 'blur-xs scale-[0.25] opacity-0',
				},
			},
		},
	},
	{ skeleton: kokkaku.toggleIconButton },
)
