import { defineKata } from '../../core/recipe'
import { iro, ji, kara } from '../kiso'
import { list } from '../kumi/control'

export { scale } from '../kumi/control'

const { text } = iro

export const k = defineKata({
	extends: list,
	slots: {
		/** The text input of the combobox. */
		field: ['block', 'truncate'],
		// Inner listbox: spaces its options and collapses when empty. `peer`
		// drives the sibling `empty` slot below; `kara` adds the virtualized
		// case, which `:empty` alone cannot see.
		list: ['peer', 'space-y-0.5', 'empty:hidden', kara.list],
		// Sibling empty-state message: shown when the listbox peer holds no options.
		empty: ['hidden', 'peer-empty:block', kara.message, 'p-2', ji.size.md, text.muted],
	},
})
