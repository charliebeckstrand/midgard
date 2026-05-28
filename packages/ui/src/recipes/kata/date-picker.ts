import { defineRecipe } from '../../core/recipe'
import { hannou, iro } from '../kiso'
import { control } from '../kiso/control'
import { popover } from '../kiso/popover'

const { reset, density, size, surface } = control
const { portal, panel } = popover

const button = defineRecipe({
	base: [
		'flex items-center justify-between',
		...reset,
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
