/**
 * Query-chips kata: object-literal surface for the `<QueryChips>` filter bar.
 * No variants axis. The flat slots are the wrapping `base` row and the rule
 * `chip` with its `field`, `operator`, and `value` parts. The rest are the AND/OR
 * `combinator`, the nested-group `bracket`, and the `empty` text.
 */
import { iro, ji, narabi } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { flex } = narabi

export const k = {
	base: [flex.row, 'flex-wrap gap-1.5', size.sm],
	chip: 'max-w-full',
	field: [...text.default],
	operator: [...text.muted],
	value: [weight.semibold, ...text.default],
	combinator: [size.xs, weight.medium, ...text.muted, 'uppercase'],
	bracket: [...text.muted],
	empty: [...text.muted],
} as const
