import { defineRecipe, hannou, iro, type VariantPropsOf } from '..'
import { control } from '../genkei/control'

const button = defineRecipe({
	base: [
		'flex items-center justify-between',
		...control.field,
		'text-left',
		'rounded-lg',
		'appearance-none',
		...hannou.cursor,
	],
	density: control.density,
	size: control.size,
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
	control: {
		default: control.surface.default,
		glass: [],
	},
	button,
	value,
	icon: ['flex items-center', 'pointer-events-none', iro.text.muted],
}

export type DatePickerButtonVariants = VariantPropsOf<typeof button>
