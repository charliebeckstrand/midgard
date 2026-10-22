import { defineKata } from '../../core/recipe'
import { dan, omote } from '../kiso'

const { rail } = omote

export const k = defineKata({
	/** The `<fieldset>` of `FormFilters`: a column of its rows. */
	base: ['flex min-w-auto flex-col', dan.gap.scale.lg],
	slots: {
		row: {
			// An `equal` row shares its width among its fields.
			equal: { true: '*:flex-1', false: '' },
			// The scroll container of a `rail` row. While it overflows, the edge with
			// more fields behind it fades, and the row is a tab stop with an inset ring.
			rail: { true: [...rail], false: '' },
		},
	},
})
