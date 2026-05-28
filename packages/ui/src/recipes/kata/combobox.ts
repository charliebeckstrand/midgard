import { defineRecipe } from '../../core/recipe'
import { iro, ji } from '../kiso'
import { control } from '../kiso/control'
import { popover } from '../kiso/popover'

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
