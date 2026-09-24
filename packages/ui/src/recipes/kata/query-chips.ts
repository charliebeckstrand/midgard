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
	// The remove button's own padding insets its glyph from the trailing edge.
	// So the leading side takes the pill's `px` plus the button's `bare.p`, and
	// the text sits symmetric with the glyph. A read-only chip has no button and
	// keeps the symmetric `px`. The sum is pinned by
	// `tag-input-chip-pad-boundary.test.ts`.
	chip: ['max-w-full', 'data-[has-suffix]:data-[size=sm]:ps-[calc(--spacing(2.75)-1px)]'],
	field: [...text.default],
	operator: [...text.muted],
	value: [weight.semibold, ...text.default],
	combinator: [size.xs, weight.medium, ...text.muted, 'uppercase'],
	bracket: [...text.muted],
	empty: [...text.muted],
} as const
