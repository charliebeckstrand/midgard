import { defineKata } from '../../core/recipe'
import { dan, iro } from '../kiso'
import { list } from '../kumi/control'

export { scale } from '../kumi/control'

const { text } = iro

export const k = defineKata({
	extends: list,
	slots: {
		/** The text input of the combobox. */
		field: ['block', 'truncate'],
		// Inner listbox: spaces its options and collapses when empty. `peer`
		// drives the sibling `empty` slot below. A listbox whose options come
		// from `VirtualOptions` is never `:empty`: the primitive keeps a wrapper
		// mounted at zero items, because its scroll-ancestor walk needs the ref.
		// The wrapper stamps `data-empty` instead (`primitives/virtual-options`),
		// so each slot reads it beside the plain `:empty` rule.
		list: [
			'peer',
			'space-y-0.5',
			'empty:hidden',
			'has-[[data-slot=virtual-options][data-empty]]:hidden',
		],
		// Sibling empty-state message: shown when the listbox peer holds no options.
		// Its text takes the step of the panel, as the text of an option does.
		empty: [
			'hidden',
			'peer-empty:block',
			'peer-has-[[data-slot=virtual-options][data-empty]]:block',
			'p-2',
			dan.text.body,
			text.muted,
		],
	},
})
