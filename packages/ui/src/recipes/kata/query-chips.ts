/**
 * Query-chips kata: object-literal surface for the `<QueryChips>` filter bar.
 * No variants axis. The flat slots are the wrapping `base` row and the rule
 * `chip` with its `field`, `operator`, and `value` parts. The rest are the AND/OR
 * `combinator` with the pad of its Button (`combinatorButton`), the
 * nested-group `bracket`, and the `empty` text.
 */
import { iro, ji, narabi } from '../kiso'
import { dan } from '../kiso/dan'

const { text } = iro
const { weight } = ji
const { flex } = narabi

/**
 * The row is a density scope one step below the scope around it
 * (`data-density="slot"`), so the chips stay one step below the controls
 * around them. Each part takes the step of the row. Each list thus gives the
 * value of a row in a scope one step above: the `sm` value is for the default
 * `md` step. At `md` the chips are `sm` Badges with `text-sm`, and a
 * combinator is an `xs` Button with `text-xs`.
 */
export const k = {
	// The row caps the hit areas of the chip controls (`TouchTarget`) at the space
	// between them. Along the row, a remove button is the `gap-1.5` and the
	// `density-px-ring` end pad of its pill from the combinator: 13px in all at
	// `sm`, and 2px less or more for each step below or above. The row wraps,
	// and the buttons of two rows are the gap and the `py-ring-1` pad of two
	// chips apart, 12px in all at each step.
	base: [
		flex.row,
		'flex-wrap gap-1.5',
		'density-xs:[--touch-target-gap-x:--spacing(2.75)]',
		'density-sm:[--touch-target-gap-x:--spacing(3.25)]',
		'density-md:[--touch-target-gap-x:--spacing(3.75)]',
		'density-[lg,xl]:[--touch-target-gap-x:--spacing(4.25)]',
		'[--touch-target-gap-y:--spacing(3)]',
		dan.text.chip,
	],
	// The chip is a Badge with no `size`, so it takes the step of the row. The
	// leading pad of the removable chip is `removable` of the Badge kata.
	chip: ['max-w-full'],
	field: [...text.default],
	operator: [...text.muted],
	value: [weight.semibold, ...text.default],
	// The combinator is one step below the chips. No step is below `xs`, so at
	// `xs` the combinator takes the `xs` values.
	combinator: [dan.text.chipCaption, weight.medium, ...text.muted, 'uppercase'],
	/**
	 * The pad of the combinator Button: the values of the Button kata, one step
	 * below the step of the row. The Button has no `size`, so it takes the step
	 * of the row, and these classes replace its own stepped pad.
	 */
	combinatorButton: [dan.space.chipQuery, dan.space.chipQueryLabelY, dan.radius.chipQuery],
	bracket: [...text.muted],
	empty: [...text.muted],
} as const
