import { defineRecipe } from '../../core/recipe'
import { hannou, iro, narabi } from '../kiso'
import { control } from '../kiso/control'
import { popover } from '../kiso/popover'

const { reset, density, size } = control
const { portal } = popover

export const k = defineRecipe(
	{
		base: [narabi.flex.row, 'w-full', 'text-left', ...reset, 'appearance-none', ...hannou.cursor],
		density,
		size,
		slots: {
			options: 'max-h-60',
			panel: 'relative min-w-full',
		},
		defaults: { density: 'md', size: 'md' },
	},
	{
		value: defineRecipe({
			truncate: {
				true: 'flex-1 min-w-0 truncate',
				false: '',
			},
			defaults: { truncate: true },
		}),
		portal,
		placeholder: iro.text.muted,
	},
)
