/**
 * Password-strength kata: the unit of the strength meter and the rule
 * checklist. The `level` axis of the `segment` bar fill and of the `label`
 * text is the strength tier (weak / fair / good / strong / empty). The
 * `passed` axis of the `rule.icon` and `rule.text` slots pairs a pass/fail
 * icon with a pass/fail text color. A tier fills with the `iro.meter` shade of
 * its color, as a progress bar does.
 */
import { defineKata } from '../../core/recipe'
import { dan, iro, ji, kasane, narabi, omote } from '../kiso'

const { meter, palette, text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { bg } = omote

export const k = defineKata({
	base: [flex.col, dan.gap.scale.sm],
	slots: {
		meter: [flex.row, dan.gap.scale.xs],
		segment: {
			base: [flex.fill, 'h-1', rounded.full, ...bg.skeleton.base],
			level: {
				weak: meter.red.bg,
				fair: meter.amber.bg,
				good: meter.blue.bg,
				strong: meter.green.bg,
				empty: '',
			},
		},
		label: {
			base: [size.sm, weight.medium],
			level: {
				weak: text.error,
				fair: text.warning,
				good: text.primary,
				strong: text.success,
				empty: text.muted,
			},
		},
		rules: [flex.col, 'gap-0.5'],
		rule: {
			base: [flex.inline, dan.gap.scale.xs, size.sm],
			slots: {
				icon: {
					base: 'size-4 shrink-0',
					passed: { true: palette.bare.green, false: text.muted },
				},
				text: { passed: { true: text.default, false: text.muted } },
			},
		},
	},
	defaults: { level: 'empty' },
})
