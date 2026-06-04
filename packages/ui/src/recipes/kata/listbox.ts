import { defineRecipe } from '../../core/recipe'
import { control } from '../katakana/control'
import { popover } from '../katakana/popover'
import { hannou, iro, narabi } from '../kiso'

const { cursor } = hannou
const { text } = iro
const { flex } = narabi
const { reset, density, size } = control
const { portal } = popover

export const k = defineRecipe(
	{
		base: [flex.row, 'w-full', 'text-left', ...reset, 'appearance-none', ...cursor],
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
		placeholder: text.muted,
	},
)
