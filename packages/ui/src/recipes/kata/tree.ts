import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { sen } from '../ryu/sen'
import { ugoki } from '../ryu/ugoki'

export type TreeSize = 'sm' | 'md' | 'lg'

export const tree = {
	base: [
		'flex flex-col',
		// Trim outer vertical padding on the edge rows so the tree sits flush with its container.
		'[&>[data-slot=tree-item]:first-child>[role=treeitem]]:pt-0',
		'[&>[data-slot=tree-item]:last-child>[role=treeitem]]:pb-0',
	],
	item: [],
	itemContent: [
		'flex w-full items-center',
		'py-1 px-2',
		'gap-2',
		iro.text.muted,
		iro.text.hover,
		'rounded-lg',
		sen.focus.inset,
		'cursor-pointer',
		'select-none',
		'data-[open]:text-zinc-950 dark:data-[open]:text-white',
	],
	itemContentSize: {
		sm: ji.size.sm,
		md: ji.size.md,
		lg: ji.size.lg,
	},
	itemContentActive: iro.text.default,
	chevron: [
		'flex-none',
		'flex items-center justify-center',
		ugoki.css.transform,
		ugoki.css.duration,
	],
	chevronWidth: {
		sm: 'w-4',
		md: 'w-5',
		lg: 'w-6',
	},
	label: 'flex-1 truncate text-left',
	group: 'overflow-hidden',
	iconSize: {
		sm: 'sm',
		md: 'md',
		lg: 'lg',
	},
	/** Per-depth indent in rem when `indent` is enabled. Equals chevron width + row gap. */
	indentStep: {
		sm: 1.5,
		md: 1.75,
		lg: 2,
	},
} as const

export { tree as k }
