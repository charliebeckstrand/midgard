import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'

export const passwordStrength = {
	root: ['flex flex-col', take.gap.sm],
	meter: ['flex items-center', 'gap-1'],
	segment: ['flex-1 h-1', maru.roundedFull, 'bg-zinc-200 dark:bg-zinc-700', 'transition-colors'],
	level: {
		weak: 'bg-red-500',
		fair: 'bg-amber-500',
		good: 'bg-blue-500',
		strong: 'bg-green-500',
	},
	label: [take.text.sm, 'font-medium'],
	labelLevel: {
		weak: 'text-red-600 dark:text-red-500',
		fair: 'text-amber-600 dark:text-amber-500',
		good: 'text-blue-600 dark:text-blue-500',
		strong: 'text-green-600 dark:text-green-500',
		empty: sumi.textMuted,
	},
	rules: ['flex flex-col', 'gap-1', 'mt-1'],
	rule: ['inline-flex items-center', take.gap.sm, take.text.sm],
	ruleIcon: 'size-4 shrink-0',
	ruleIconPass: 'text-green-600 dark:text-green-500',
	ruleIconFail: sumi.textMuted,
	ruleText: sumi.textMuted,
	ruleTextPass: sumi.text,
}
