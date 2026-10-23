/**
 * Nav kata: the unit of the `<Nav>` family. The root slot `base` is the
 * `<NavList>`, and the `orientation` axis sets its axis. `bar` is the
 * `<NavBar>` landmark frame, and `rail` is the row of items inside it.
 *
 * Two extras hold the other parts. `item` is the unit of a row, which extends
 * the nav group: the `<li>` wrapper, the inner `button`, the focus projection
 * `indicator`, and the `prefix` and `suffix` slots. `skeleton` is the form of
 * the `<NavSkeleton>` rows.
 */
import { defineKata, type VariantProps } from '../../core/recipe'
import { dan, kasane, kokkaku, narabi, omote, sen } from '../kiso'
import { box, nav } from '../kumi/nav'

const { rounded } = kasane
const { flex } = narabi
const { border } = sen
const { bg, rail } = omote

/**
 * The box of the inner button: at `md` it is `p-2` with `gap-2`, `text-base`,
 * and `rounded-lg`. The skeleton row takes the same box, so the two boxes match.
 */
const padding = dan.space.nav.item

/** A row of the nav: the axed `<li>` wrapper and the inner button. */
const item = defineKata(
	{
		extends: nav,
		affix: { true: dan.gap.scale.xs, false: '' },
		slots: { button: padding },
	},
	{
		/** The box of the inner button, with no interaction surface, for the skeleton row. */
		box: [...box, padding],
	},
)

export const k = defineKata(
	{
		base: 'flex',
		// The gap also caps the hit areas of the items (`TouchTarget`) along the
		// list, so two adjacent items split the gap and do not overlap.
		orientation: {
			vertical: ['flex-col', 'gap-0.5', '[--touch-target-gap-y:--spacing(0.5)]'],
			horizontal: ['flex-row', dan.gap.scale.xs, dan.gap.touch.x.xs],
		},
		slots: {
			/**
			 * The {@link NavBar} landmark frame, with an optional border. The row of
			 * items scrolls in the `rail` inside it. The edge fade of the rail masks
			 * the whole box, so the frame keeps its border and fill.
			 */
			bar: {
				base: ['px-4 py-2.5', rounded.lg, 'border'],
				variant: {
					solid: [...border.color.default, ...bg.tint],
					outline: [...border.color.default],
					plain: [...border.color.transparent],
				},
				slots: {
					/** The row of items in a `<NavBar>`. While it overflows, the edge with more items behind it fades. */
					rail: [flex.row, dan.gap.scale.lg, ...rail],
				},
			},
		},
		defaults: { variant: 'solid' },
	},
	{ item, skeleton: kokkaku.nav },
)

/** Recipe variant props for {@link NavBar}: the `variant` style (`solid` | `outline` | `plain`). */
export type NavBarVariants = {
	/** The frame of the bar: a border and a tinted fill, a border alone, or neither. @defaultValue 'solid' */
	variant?: VariantProps<typeof k>['variant']
}
