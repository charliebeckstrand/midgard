/**
 * Tooltip kata: the unit of `<Tooltip>`. The root slot `base` is the content
 * bubble, and the `surface` axis gives it the opaque popover fill or the glass
 * chrome. The `trigger` slot is cloned onto the child of `<TooltipTrigger>`.
 */
import { defineScale } from '../../core/density'
import { defineKata } from '../../core/recipe'
import { dan, iro, narabi, omote, sen, ugoki } from '../kiso'

const { text } = iro
const { flex } = narabi
const { popover, glass } = omote
const { ring } = sen
const { duration, ease } = ugoki

/**
 * The tooltip fade with a small scale, tuned for a quick show and hide.
 *
 * The scale sets `transform` directly, so the browser runs it off the main
 * thread. Under reduced motion, the tooltip shows the `still` copy.
 *
 * The bubble rests at `scale(1)`, not at `transform: none` (see the rule in
 * `ugoki/index.ts`). An exit from `none` grows the bubble from `scale(0)` to
 * 95% while it fades. The positioned wrapper of the tooltip has a `transform`
 * already, so the rest scale adds no containing block.
 */
const tooltip = {
	initial: { opacity: 0, transform: 'scale(0.95)' },
	animate: { opacity: 1, transform: 'scale(1)' },
	exit: { opacity: 0, transform: 'scale(0.95)' },
	transition: { duration: duration[100], ease: ease.out },
} as const

export const k = defineKata(
	{
		// Padding, radius, and text follow the nearest density scope. The radius
		// equals the padding stop at each step.
		base: [
			'max-w-sm',
			'text-pretty',
			text.default,
			'font-medium',
			dan.space.tooltip,
			dan.radius.tooltip,
			dan.text.body,
		],
		surface: {
			flat: popover,
			glass: [glass, ring.default],
		},
		slots: {
			trigger: {
				// Cloned onto the trigger's child ahead of the child's own `className`, so
				// a child that needs another display box restates it and wins. A truncating
				// child must, because an ellipsis paints against a block box rather than a
				// flex container.
				base: flex.inline,
				/**
				 * The help cursor, and only while there is something to ask.
				 *
				 * `*:` as well as the element, because a trigger is usually a control with an icon in it.
				 * The icon is most of what the pointer is actually over. Without it the cursor changed
				 * on the padding and not on the glyph.
				 *
				 * Which is also why the disabled guard has to be here rather than left to the control.
				 * `hannou.cursor` gives a disabled control `cursor-not-allowed`, and `cursor` inherits, so
				 * the children would take it for free. But `*:cursor-help` set it on them explicitly and
				 * won, and a refused action offered the reader help instead of saying it was refused.
				 * Stated as `not-*` rather than as a louder override so there is one rule per state
				 * instead of two competing on specificity.
				 */
				enabled: {
					true: [
						'not-disabled:not-data-disabled:cursor-help',
						'not-disabled:not-data-disabled:*:cursor-help',
					],
					false: '',
				},
			},
		},
		defaults: { surface: 'flat', enabled: true },
	},
	{
		motion: tooltip,
		/** The motion under reduced motion: the fade with no scale. */
		still: ugoki.still(tooltip),
	},
)

/** The size scale of {@link TooltipContent}: the steps of its padding and radius. */
export const scale = defineScale(dan.space.tooltip, dan.radius.tooltip)
