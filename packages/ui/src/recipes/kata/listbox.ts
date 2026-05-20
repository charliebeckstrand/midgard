import { defineRecipe, sawari, type VariantPropsOf } from '../../core/recipe'
import { control } from '../waku/control'

export const k = defineRecipe({
	base: [
		'flex items-center',
		'w-full',
		'text-left',
		...control.field,
		'rounded-lg',
		'appearance-none',
		...sawari.cursor,
	],
	density: control.density,
	size: control.size,
	slots: {
		options: 'max-h-60',
		panel: 'relative min-w-full',
	},
	defaults: { density: 'md', size: 'md' },
})

export const value = defineRecipe({
	truncate: {
		true: 'flex-1 min-w-0 truncate',
		false: '',
	},
	defaults: { truncate: true },
})

export type ListboxVariants = VariantPropsOf<typeof k>
