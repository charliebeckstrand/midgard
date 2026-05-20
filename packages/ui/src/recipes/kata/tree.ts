import { tv } from 'tailwind-variants'
import { iro, ji, sen, ugoki } from '../../core/recipe'

export type TreeSize = 'sm' | 'md' | 'lg'

const treeItemContent = tv({
	base: [
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
	variants: {
		size: {
			sm: ji.size.sm,
			md: ji.size.md,
			lg: ji.size.lg,
		},
	},
	defaultVariants: { size: 'md' },
})

const treeChevron = tv({
	base: ['flex-none', 'flex items-center justify-center', ugoki.css.transform, ugoki.css.duration],
	variants: {
		size: {
			sm: 'w-4',
			md: 'w-5',
			lg: 'w-6',
		},
	},
	defaultVariants: { size: 'md' },
})

export const k = {
	base: [
		'flex flex-col',
		// Trim outer vertical padding on the edge rows so the k sits flush with its container.
		'[&>[data-slot=k-item]:first-child>[role=treeitem]]:pt-0',
		'[&>[data-slot=k-item]:last-child>[role=treeitem]]:pb-0',
	],
	item: [],
	itemContent: treeItemContent,
	itemContentCurrent: iro.text.default,
	chevron: treeChevron,
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

export { treeItemContent as treeItemContentVariants, treeChevron as treeChevronVariants }
