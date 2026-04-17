import { kage } from '../kage'
import { maru } from '../maru'

export const queryBuilder = {
	base: ['flex flex-col gap-3 p-3', kage.border, maru.rounded],
	group: 'flex flex-col gap-3',
	groupNested: ['p-3 bg-zinc-50 dark:bg-zinc-900/40', kage.border, maru.rounded],
	rule: ['p-2', kage.border, maru.rounded],
	rowRemove: 'flex-none',
	actions: 'flex items-center gap-2',
}
