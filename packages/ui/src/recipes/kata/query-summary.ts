/**
 * Query-summary kata: object-literal surface for the read-only `<QuerySummary>`
 * line. No variants axis — flat slots for the inline `base` container, the
 * `field`/`operator`/`value` parts of a rule, the muted AND/OR `combinator`, and
 * the nested-group `bracket`.
 */
import { iro, ji } from '../kiso'

const { text } = iro
const { size, weight } = ji

export const k = {
	base: [size.sm],
	field: [...text.default],
	operator: [...text.muted],
	value: [weight.medium, ...text.default],
	combinator: [size.xs, weight.medium, ...text.muted, 'uppercase'],
	bracket: [...text.muted],
} as const
