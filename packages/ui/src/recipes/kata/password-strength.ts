import { defineRecipe, mode } from '../../core/recipe'
import { iro, ji, kasane, narabi, omote } from '../kiso'

const segment = defineRecipe({
	base: [narabi.fill, 'h-1', kasane.rounded.full, ...omote.bg.skeleton],
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
	base: [ji.sm, ji.weight.medium],
	level: {
		weak: iro.text.error,
		fair: iro.text.warning,
		good: iro.text.primary,
		strong: iro.text.success,
		empty: iro.text.muted,
	},
	defaults: { level: 'empty' },
})

export const k = {
	root: [narabi.col, 'gap-2'],
	meter: [narabi.row, 'gap-1'],
	segment,
	label,
	rules: [narabi.col, 'gap-0.5'],
	rule: [narabi.inlineRow, 'gap-1', ji.sm],
	ruleIcon: 'size-4 shrink-0',
	ruleIconPass: iro.palette.bare.text.green,
	ruleIconFail: iro.text.muted,
	ruleText: iro.text.muted,
	ruleTextPass: iro.text.default,
} as const
