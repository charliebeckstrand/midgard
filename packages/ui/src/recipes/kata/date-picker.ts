import { defineRecipe, iro, sawari, type VariantPropsOf } from '../../core/recipe'
import { control } from '../waku/control'

const button = defineRecipe({
	base: [
		'flex items-center justify-between',
		...control.field,
		'text-left',
		'rounded-lg',
		'appearance-none',
		...sawari.cursor,
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
