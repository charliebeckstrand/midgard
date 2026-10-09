import { defineRecipe } from '../../core/recipe'
import { iro, ji, kara } from '../kiso'
import { control } from '../kiso/control'
import { popover } from '../kiso/popover'

const { text } = iro
const { reset, density } = control
const { portal, fit } = popover

export const k = defineRecipe(
	{
		base: ['block', 'truncate', ...reset.base, ...density],
		slots: {
			// Kept in step with the listbox recipe — one dropdown family, one height (see the note
			// there for why 320px).
			options: ['max-h-80', fit.scroll],
			// Inner listbox: spaces its options and collapses when empty. `peer`
			// drives the sibling `empty` slot below; `kara` adds the virtualized
			// case, which `:empty` alone cannot see.
			list: ['peer', 'space-y-0.5', 'empty:hidden', kara.list],
			// Sibling empty-state message: shown when the listbox peer holds no options.
			empty: ['hidden', 'peer-empty:block', kara.message, 'p-2', ji.size.md, text.muted],
		},
	},
	{
		portal: [portal, fit.wrapper],
	},
)

/** The size scale of the control: each step from `xs` to `xl`. */
export const scale = control.scale
