import { defineScale } from '../../core/density'
import { iro, ji, narabi, omote, sen, textRamp, ugoki } from '../kiso'
import { dan } from '../kiso/dan'

const { text } = iro
const { weight } = ji
const { flex } = narabi
const { popover, glass } = omote
const { ring } = sen
const { tooltip } = ugoki

// Padding, radius, and text follow the nearest density scope. The radius
// equals the padding stop at each step.
const content = [
	'max-w-sm',
	'text-pretty',
	text.default,
	weight.medium,
	`${dan.space.tooltip} ${dan.radius.tooltip}`,
	textRamp,
]

export const k = {
	trigger: {
		// Cloned onto the trigger's child ahead of the child's own `className`, so a
		// child that needs another display box restates it and wins — a truncating
		// child must, an ellipsis paints against a block box rather than a flex
		// container.
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
		cursor: [
			'not-disabled:not-data-disabled:cursor-help',
			'not-disabled:not-data-disabled:*:cursor-help',
		],
	},
	content: {
		base: content,
		surface: {
			default: popover,
			glass: [glass, ring.default],
		},
	},
	motion: tooltip,
} as const

/** The size scale of {@link TooltipContent}: the steps of its padding and radius. */
export const scale = defineScale(dan.space.tooltip, dan.radius.tooltip)
