import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'

export const passwordStrength = {
	root: ['flex flex-col', 'gap-sm'],
	meter: ['flex items-center', 'gap-xs'],
	segment: ['flex-1 h-1', 'rounded-full', 'bg-zinc-200 dark:bg-zinc-700'],
	level: {
		weak: 'bg-red-600 dark:bg-red-500',
		fair: 'bg-amber-600 dark:bg-amber-500',
		good: 'bg-blue-600 dark:bg-blue-500',
		strong: 'bg-green-600 dark:bg-green-500',
	},
	label: [ji.size.sm, 'font-medium'],
	labelLevel: {
		weak: 'text-red-600 dark:text-red-500',
		fair: 'text-amber-600 dark:text-amber-500',
		good: 'text-blue-600 dark:text-blue-500',
		strong: 'text-green-600 dark:text-green-500',
		empty: iro.text.muted,
	},
	rules: ['flex flex-col', 'gap-0.5'],
	rule: ['inline-flex items-center', 'gap-xs', ji.size.sm],
	ruleIcon: 'size-4 shrink-0',
	ruleIconPass: 'text-green-600 dark:text-green-500',
	ruleIconFail: iro.text.muted,
	ruleText: iro.text.muted,
	ruleTextPass: iro.text.default,
}
