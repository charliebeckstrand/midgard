import { iro } from '../iro'
import { ji } from '../ji'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { nagare } from '../nagare'

export type TreeColor = 'sky' | 'lime' | 'rose' | 'amber' | 'violet'

export const treeColorMap: Record<TreeColor, string | string[]> = {
	sky: [
		'text-sky-600 group-hover/tree-item:text-sky-700',
		'dark:text-sky-600 dark:group-hover/tree-item:text-sky-500',
	],
	lime: [
		'text-lime-600 group-hover/tree-item:text-lime-700',
		'dark:text-lime-600 dark:group-hover/tree-item:text-lime-500',
	],
	rose: [
		'text-rose-600 group-hover/tree-item:text-rose-700',
		'dark:text-rose-600 dark:group-hover/tree-item:text-rose-500',
	],
	amber: [
		'text-amber-600 group-hover/tree-item:text-amber-700',
		'dark:text-amber-600 dark:group-hover/tree-item:text-amber-500',
	],
	violet: [
		'text-violet-600 group-hover/tree-item:text-violet-700',
		'dark:text-violet-600 dark:group-hover/tree-item:text-violet-500',
	],
}

export const tree = {
	base: ['flex flex-col', kumi.gap.xs],
	itemContent: [
		'flex w-full items-center',
		'py-1 px-2',
		ji.size.sm,
		kumi.gap[1.5],
		iro.text.muted,
		iro.text.hover,
		maru.rounded.lg,
		ki.inset,
		'data-[open]:text-zinc-950 dark:data-[open]:text-white',
		'data-[open]:cursor-pointer',
	],
	itemContentActive: iro.text.default,
	chevron: ['flex-none', nagare.transform],
	label: 'flex-1 truncate text-left',
	group: 'overflow-hidden',
}
