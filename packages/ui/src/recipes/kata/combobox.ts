import { defineRecipe } from '../../core/recipe'
import { iro, ji, kara } from '../kiso'
import { control } from '../kiso/control'
import { popover } from '../kiso/popover'

const { text } = iro
const { reset, density, size } = control
const { portal } = popover

export const k = defineRecipe(
	{
		base: ['block', 'truncate', ...reset],
		density,
		size,
		slots: {
			options: 'max-h-60',
			// Inner listbox: spaces its options and collapses when empty. `peer`
			// drives the sibling `empty` slot below; `kara` adds the virtualized
			// case, which `:empty` alone cannot see.
			list: ['peer', 'space-y-0.5', 'empty:hidden', kara.list],
			// Sibling empty-state message: shown when the listbox peer holds no options.
			empty: ['hidden', 'peer-empty:block', kara.message, 'p-2', ji.size.md, text.muted],
		},
		defaults: { density: 'md', size: 'md' },
	},
	{
		portal,
	},
)
