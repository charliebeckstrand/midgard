import { defineRecipe, iro, ji, type VariantPropsOf } from '../../core/recipe'
import { control } from '../genkei/control'

export const k = defineRecipe({
	base: ['block', 'truncate', ...control.field, 'rounded-lg'],
	density: control.density,
	size: control.size,
	slots: {
		options: 'max-h-60',
		empty: ['hidden only:block', 'p-2', ji.size.sm, iro.text.muted],
	},
	defaults: { density: 'md', size: 'md' },
})

export type ComboboxVariants = VariantPropsOf<typeof k>
