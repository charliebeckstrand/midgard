import { defineKata } from '../../core/recipe'
import { dan, narabi, omote } from '../kiso'

const { flex } = narabi
const { rail } = omote

export const k = defineKata({
	/** The `<fieldset>` of `FormFilters`: a column of its rows. */
	base: [flex.col, 'min-w-auto', dan.gap.scale.lg],
	slots: {
		row: {
			// An `equal` row shares its width among its fields.
			equal: { true: '*:flex-1', false: '' },
			// The scroll container of a `rail` row. While it overflows, the edge with
			// more fields behind it fades, and the row is a tab stop with an inset ring.
			rail: { true: [...rail], false: '' },
		},
		clear: {
			// A Clear over an unfiltered bar takes no space. The fields fill the line
			// until it appears, and then share the line with it.
			idle: { true: 'hidden', false: '' },
		},
	},
})
