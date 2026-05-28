import { defineRecipe, mode } from '../../core/recipe'
import { iro, ji, kasane, narabi, omote } from '../kiso'

const { palette, text } = iro
const { size, weight } = ji
const { rounded } = kasane
const { flex } = narabi
const { bg } = omote

const segment = defineRecipe({
	base: [flex.fill, 'h-1', rounded.full, ...bg.skeleton],
	level: {
		weak: mode('bg-red-600', 'dark:bg-red-500'),
		fair: mode('bg-amber-600', 'dark:bg-amber-500'),
		good: mode('bg-blue-600', 'dark:bg-blue-500'),
		strong: mode('bg-green-600', 'dark:bg-green-500'),
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
	root: [flex.col, 'gap-2'],
	meter: [flex.row, 'gap-1'],
	segment,
	label,
	rules: [flex.col, 'gap-0.5'],
	rule: [flex.inline, 'gap-1', size.sm],
	ruleIcon: 'size-4 shrink-0',
	ruleIconPass: palette.bare.text.green,
	ruleIconFail: text.muted,
	ruleText: text.muted,
	ruleTextPass: text.default,
} as const
