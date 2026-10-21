import { dan, omote } from '../kiso'

const { rail } = omote

export const k = {
	/** The `<fieldset>` of `FormFilters`: a column of its rows. */
	base: ['flex min-w-auto flex-col', dan.gap.scale.lg],
	// The scroll container of a `rail` row. While it overflows, the edge with
	// more fields behind it fades, and the row is a tab stop with an inset ring.
	rail: [...rail],
} as const
