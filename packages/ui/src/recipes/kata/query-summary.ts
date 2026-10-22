/**
 * Query-summary kata: the unit of the read-only `<QuerySummary>` line, with no
 * axis. The slots are the inline `base` container, the `field`, `operator`,
 * and `value` parts of a rule, the muted AND/OR `combinator`, and the
 * nested-group `bracket`.
 */
import { defineKata } from '../../core/recipe'
import { iro, ji } from '../kiso'

const { text } = iro
const { size, weight } = ji

export const k = defineKata({
	base: [size.sm],
	slots: {
		field: [...text.default],
		operator: [...text.muted],
		value: [weight.medium, ...text.default],
		combinator: [size.xs, weight.medium, ...text.muted, 'uppercase'],
		bracket: [...text.muted],
	},
})
