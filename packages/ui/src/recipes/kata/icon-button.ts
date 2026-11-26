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
					false: 'blur-xs scale-25 opacity-0',
				},
				// A mirror writes the x scale of the icon. The mirror class of `Icon` would replace
				// the x scale of the hidden icon, so each scale step gets its own mirror here.
				mirror: { true: '', false: '' },
				compound: [
					{ active: true, mirror: true, class: 'rtl:-scale-x-100' },
					{ active: false, mirror: true, class: 'rtl:-scale-x-25' },
				],
			},
		},
	},
	{ skeleton: kokkaku.iconButton },
)
