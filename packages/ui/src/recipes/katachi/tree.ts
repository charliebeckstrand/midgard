import { ki } from '../ki'
import { maru } from '../maru'
import { sumi } from '../sumi'

export type TreeColor = 'sky' | 'lime' | 'rose' | 'amber' | 'violet'

export const treeColorMap: Record<TreeColor, string> = {
	sky: 'text-sky-600 group-hover/tree-item:text-sky-800 dark:text-sky-600 dark:group-hover/tree-item:text-sky-400',
	lime: 'text-lime-600 group-hover/tree-item:text-lime-800 dark:text-lime-600 dark:group-hover/tree-item:text-lime-400',
	rose: 'text-rose-600 group-hover/tree-item:text-rose-800 dark:text-rose-600 dark:group-hover/tree-item:text-rose-400',
	amber:
		'text-amber-600 group-hover/tree-item:text-amber-800 dark:text-amber-600 dark:group-hover/tree-item:text-amber-400',
	violet:
		'text-violet-600 group-hover/tree-item:text-violet-800 dark:text-violet-600 dark:group-hover/tree-item:text-violet-400',
}

export const tree = {
	root: '',
	itemContent: [
		'flex w-full items-center gap-1.5 py-1 px-2 text-sm/6',
		sumi.textMuted,
		sumi.textHover,
		maru.rounded,
		ki.inset,
	],
	itemContentActive: sumi.text,
	chevron: 'flex-none transition-transform duration-150',
	label: 'flex-1 truncate text-left',
	group: 'overflow-hidden',
}
