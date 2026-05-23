import { defineRecipe, type VariantPropsOf } from '../../core/recipe'
import { control } from '../genkei/control'
import { popover } from '../genkei/popover'
import { iro, ji } from '../kiso'

const { input, density, size } = control
const { portal } = popover

export const k = defineRecipe(
	{
		base: ['block', 'truncate', ...input],
		density,
		size,
		slots: {
			options: 'max-h-60',
			empty: ['hidden only:block', 'p-2', ji.md, iro.text.muted],
		},
		defaults: { density: 'md', size: 'md' },
	},
	{
		portal,
	},
)

export type ComboboxVariants = VariantPropsOf<typeof k>
