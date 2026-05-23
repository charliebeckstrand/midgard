import { defineRecipe } from '../../core/recipe'
import { control } from '../genkei/control'
import { popover } from '../genkei/popover'
import { hannou, iro } from '../kiso'

const { input, density, size, surface } = control
const { portal, panel } = popover

const button = defineRecipe({
	base: [
		'flex items-center justify-between',
		...input,
		'text-left',
		'appearance-none',
		...hannou.cursor,
	],
	density,
	size,
	defaults: { density: 'md', size: 'md' },
})

const value = defineRecipe({
	base: ['block'],
	truncate: {
		true: 'truncate',
		false: '',
	},
	defaults: { truncate: true },
})

export const k = {
	surface: {
		default: surface.default,
		glass: [],
	},
	button,
	value,
	icon: ['flex items-center', 'pointer-events-none', iro.text.muted],
	placeholder: iro.text.muted,
	content: {
		portal,
		motion: panel.motion,
		text: iro.text.default,
		glass: panel.glass,
	},
}
