import { mode } from '../../core/recipe'
import { iro, ji, kasane, narabi, sen } from '../kiso'

export const k = {
	base: [narabi.col, 'gap-3 p-3', sen.border.default, kasane.rounded.lg],
	group: 'flex flex-col gap-3',
	groupNested: [
		'p-3',
		...mode('bg-zinc-50', 'dark:bg-zinc-900/40'),
		sen.border.default,
		kasane.rounded.lg,
	],
	rule: ['p-2', sen.border.default, kasane.rounded.lg],
	rowRemove: 'flex-none',
	separator: [ji.xs, ji.weight.medium, ...iro.text.muted, 'uppercase'],
	actions: 'flex items-center gap-2',
} as const
