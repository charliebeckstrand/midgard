import { defineKata } from '../../core/recipe'
import { iro, ji, kara } from '../kiso'
import { popover } from '../kiso/popover'
import { trigger } from '../kumi/control'

export { scale } from '../kumi/control'

const { text } = iro
const { list } = popover

export const k = defineKata(
	{
		extends: trigger,
		slots: {
			/** The text input of the combobox. */
			field: { base: ['block', 'truncate'] },
			options: { base: list.options },
			// Inner listbox: spaces its options and collapses when empty. `peer`
			// drives the sibling `empty` slot below; `kara` adds the virtualized
			// case, which `:empty` alone cannot see.
			list: { base: ['peer', 'space-y-0.5', 'empty:hidden', kara.list] },
			// Sibling empty-state message: shown when the listbox peer holds no options.
			empty: {
				base: ['hidden', 'peer-empty:block', kara.message, 'p-2', ji.size.md, text.muted],
			},
		},
	},
	{
		portal: list.portal,
	},
)
