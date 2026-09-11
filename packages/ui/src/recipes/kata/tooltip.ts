import { defineRecipe } from '../../core/recipe'
import { iro, ji, kasane, narabi, omote, sen, ugoki } from '../kiso'

const { text } = iro
const { size, weight } = ji
const { padding, radius } = kasane
const { flex } = narabi
const { popover, glass } = omote
const { ring } = sen
const { tooltip } = ugoki

const content = defineRecipe({
	base: ['max-w-sm', 'text-pretty', text.default, weight.medium],
	size: {
		sm: [padding.p('1'), radius.r('1'), size.sm],
		md: [padding.p('2'), radius.r('2'), size.md],
		lg: [padding.p('3'), radius.r('3'), size.lg],
	},
	defaults: { size: 'md' },
})

export const k = {
	// Cloned onto the trigger's child ahead of the child's own `className`, so a child
	// that needs another display box restates it and wins — a truncating child must, an
	// ellipsis paints against a block box rather than a flex container.
	trigger: flex.inline,
	/*
	 * The help cursor, and only while there is something to ask.
	 *
	 * `*:` as well as the element, because a trigger is usually a control with an icon in it
	 * and the icon is most of what the pointer is actually over — without it the cursor changed
	 * on the padding and not on the glyph.
	 *
	 * Which is also why the disabled guard has to be here rather than left to the control.
	 * `hannou.cursor` gives a disabled control `cursor-not-allowed`, and `cursor` inherits, so
	 * the children would take it for free — but `*:cursor-help` set it on them explicitly and
	 * won, and a refused action offered the reader help instead of saying it was refused.
	 * Stated as `not-*` rather than as a louder override so there is one rule per state
	 * instead of two competing on specificity.
	 */
	cursor: [
		'not-disabled:not-data-disabled:cursor-help',
		'not-disabled:not-data-disabled:*:cursor-help',
	],
	content,
	surface: {
		default: popover,
		glass: [glass, ring.default],
	},
	motion: tooltip,
} as const
