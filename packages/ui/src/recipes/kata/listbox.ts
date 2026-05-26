import { defineRecipe } from '../../core/recipe'
import { control } from '../genkei/control'
import { popover } from '../genkei/popover'
import { hannou, iro } from '../kiso'

const { input, density, size } = control
const { portal } = popover

export const k = defineRecipe(
	{
		base: [
			'flex items-center',
			'w-full',
			'text-left',
			...input,
			'appearance-none',
			...hannou.cursor,
		],
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
