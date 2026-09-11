import { defineRecipe } from '../../core/recipe'
import { hannou, iro, narabi } from '../kiso'
import { control } from '../kiso/control'
import { popover } from '../kiso/popover'

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
			// 320px ≈ 8 rows. The old 240px (the classic Tailwind-example value, never a reasoned one)
			// forced a scrollbar at seven options — the dashboard picker hit it with screen to spare.
			// The cap only binds on lists that exceed it, and a panel that no longer fits below its
			// trigger flips above (the floating middleware chain), so short lists and tight viewports
			// are unaffected. Kept in step with the combobox recipe: one dropdown family, one height.
			options: 'max-h-80',
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
