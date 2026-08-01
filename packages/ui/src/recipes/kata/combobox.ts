import { defineRecipe } from '../../core/recipe'
import { iro, ji } from '../kiso'
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
			// drives the sibling `empty` slot below. A virtualized listbox is never
			// CSS `:empty` — `VirtualOptions` keeps a wrapper mounted for its
			// scroll-ancestor walk — so both rules also read that wrapper's
			// `data-empty` signal. Written as literals for Tailwind's scanner.
			list: [
				'peer',
				'space-y-0.5',
				'empty:hidden',
				'has-[[data-slot=virtual-options][data-empty]]:hidden',
			],
			// Sibling empty-state message: shown when the listbox peer holds no options.
			empty: [
				'hidden',
				'peer-empty:block',
				'peer-has-[[data-slot=virtual-options][data-empty]]:block',
				'p-2',
				ji.size.md,
				text.muted,
			],
		},
		defaults: { density: 'md', size: 'md' },
	},
	{
		portal,
	},
)
