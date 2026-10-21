/**
 * Password-strength kata: object-literal surface for the strength meter and
 * rule checklist. Two `level`-axed sub-recipes (`segment` bar fill, `label`
 * text) keyed by strength tier (weak / fair / good / strong / empty). The
 * rule rows pair a pass/fail icon with pass/fail text color. A tier fills
 * with the `iro.meter` shade of its color, as a progress bar does.
 */
import { defineRecipe } from '../../core/recipe'
import { iro, ji, kasane, narabi, omote } from '../kiso'
import { dan } from '../kiso/dan'

const { meter, palette, text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { bg } = omote

const segment = defineRecipe({
	base: [flex.fill, 'h-1', rounded.full, ...bg.skeleton.base],
	level: {
		weak: meter.red.bg,
		fair: meter.amber.bg,
		good: meter.blue.bg,
		strong: meter.green.bg,
		empty: '',
	},
	defaults: { level: 'empty' },
})

const label = defineRecipe({
	base: [size.sm, weight.medium],
	level: {
		weak: text.error,
		fair: text.warning,
		good: text.primary,
		strong: text.success,
		empty: text.muted,
	},
	defaults: { level: 'empty' },
})

export const k = {
	base: [flex.col, dan.gap.scale.sm],
	meter: [flex.row, dan.gap.scale.xs],
	segment,
	label,
	rules: [flex.col, 'gap-0.5'],
	rule: {
		base: [flex.inline, dan.gap.scale.xs, size.sm],
		icon: {
			base: 'size-4 shrink-0',
			pass: palette.bare.text.green,
			fail: text.muted,
		},
		text: {
			base: text.muted,
			pass: text.default,
		},
	},
} as const
