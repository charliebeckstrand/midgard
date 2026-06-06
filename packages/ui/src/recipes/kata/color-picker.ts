import { defineRecipe } from '../../core/recipe'
import { hannou, iro, kasane } from '../kiso'
import { control } from '../kiso/control'
import { popover } from '../kiso/popover'

const { cursor } = hannou
const { text } = iro
const { rounded } = kasane
const { reset, density, size, surface } = control
const { portal, panel } = popover

const button = defineRecipe({
	base: ['flex items-center gap-2', ...reset, 'text-left', 'appearance-none', ...cursor],
	density,
	size,
	defaults: { density: 'md', size: 'md' },
})

const value = defineRecipe({
	base: ['block'],
	truncate: { true: 'truncate', false: '' },
	defaults: { truncate: true },
})

const swatch = defineRecipe({
	base: [
		'relative shrink-0 overflow-hidden ring-1 ring-inset ring-black/10 dark:ring-white/15',
		rounded.sm,
	],
	size: { sm: 'size-4', md: 'size-5', lg: 'size-5' },
	defaults: { size: 'md' },
})

export const k = {
	surface: {
		default: surface.default,
		glass: [],
	},
	button,
	value,
	swatch,
	/** Chequerboard surfaced behind the trigger swatch when alpha is translucent. */
	checkerboard:
		'[background-image:repeating-conic-gradient(#cbd5e1_0_25%,#fff_0_50%)] [background-size:8px_8px] dark:[background-image:repeating-conic-gradient(#3f3f46_0_25%,#52525b_0_50%)]',
	icon: ['flex items-center', 'pointer-events-none', text.muted],
	placeholder: text.muted,
	content: {
		portal,
		motion: panel.motion,
		text: text.default,
		glass: panel.glass,
	},
}
