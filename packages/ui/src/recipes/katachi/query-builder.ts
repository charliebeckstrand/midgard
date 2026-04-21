import { maru } from '../maru'
import { sen } from '../sen'

export const queryBuilder = {
	base: ['flex flex-col gap-3 p-3', sen.border, maru.rounded],
	group: 'flex flex-col gap-3',
	groupNested: ['p-3 bg-zinc-50 dark:bg-zinc-900/40', sen.border, maru.rounded],
	rule: ['p-2', sen.border, maru.rounded],
	rowRemove: 'flex-none',
	separator: 'text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase',
	actions: 'flex items-center gap-2',
}
