import { defineRecipe } from '../../core/recipe'
import { iro, ji } from '../kiso'

const segment = defineRecipe({
	base: ['flex-1 h-1', 'rounded-full', 'bg-zinc-200 dark:bg-zinc-700'],
	level: {
		weak: 'bg-red-600 dark:bg-red-500',
		fair: 'bg-amber-600 dark:bg-amber-500',
		good: 'bg-blue-600 dark:bg-blue-500',
		strong: 'bg-green-600 dark:bg-green-500',
		empty: '',
	},
	defaults: { level: 'empty' },
})

const label = defineRecipe({
	base: [ji.sm, 'font-medium'],
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
	root: ['flex flex-col', 'gap-sm'],
	meter: ['flex items-center', 'gap-xs'],
	segment,
	label,
	rules: ['flex flex-col', 'gap-0.5'],
	rule: ['inline-flex items-center', 'gap-xs', ji.sm],
	ruleIcon: 'size-4 shrink-0',
	ruleIconPass: iro.palette.bare.text.green,
	ruleIconFail: iro.text.muted,
	ruleText: iro.text.muted,
	ruleTextPass: iro.text.default,
}
