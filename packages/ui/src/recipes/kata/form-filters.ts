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
		clear: {
			// Whether there is nothing to clear, and the bar's layout. They carry no
			// classes of their own and only gate the compounds below.
			idle: { true: '', false: '' },
			rail: { true: '', false: '' },
			compound: [
				// A rail's fields start at the start of a row that scrolls, so a Clear
				// that appears beside it only narrows the row. It takes no space until then.
				{ idle: true, rail: true, class: 'hidden' },
				// A stack is a column on a compact viewport, and Clear sits under the
				// fields. A kept box there is an empty band, so it takes no space. From
				// `sm` the stack is a row whose fields share its width, and a Clear that
				// appears would squeeze them. It keeps its box there, as the inline flex
				// box of a Button, and shows nothing and takes no focus.
				{ idle: true, rail: false, class: 'invisible hidden sm:inline-flex' },
			],
		},
	},
})
