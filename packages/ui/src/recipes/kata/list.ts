import { hannou, iro, ji, omote, sen } from '../kiso'
export type ListVariant = 'separated' | 'outline' | 'plain' | 'solid'

const rootBase = ['flex flex-col', 'm-0 p-0', 'k-none']

const rootVariant = {
	separated: ['gap-2'],
	outline: [
		'overflow-hidden',
		'rounded-lg',
		...sen.border.default,
		'divide-y divide-zinc-950/10',
		'dark:divide-white/10',
	],
	plain: ['divide-y divide-zinc-950/10', 'dark:divide-white/10'],
	solid: ['gap-2'],
} satisfies Record<ListVariant, unknown>

const itemBase = [
	'group/k-item',
	'flex items-center',
	'gap-2',
	'gap-y-0',
	ji.md,
	iro.text.default,
	sen.focus.inset,
]

const itemVariant = {
	separated: ['p-3', ...omote.surface, sen.border.default, 'rounded-lg'],
	outline: ['p-3'],
	plain: ['px-2', 'py-1.5'],
	solid: ['p-3', ...omote.tint, sen.border.default, 'rounded-lg'],
} satisfies Record<ListVariant, unknown>

export const k = {
	base: rootBase,
	root: (variant: ListVariant = 'separated') => [...rootBase, ...rootVariant[variant]],
	horizontal: 'flex-row',
	item: (variant: ListVariant = 'separated') => [...itemBase, ...itemVariant[variant]],
	itemActive: ['z-10 relative', ...omote.surface, 'rounded-md'],
	itemLifted: sen.focus.lifted,
	handle: [
		'inline-flex flex-none items-center justify-center',
		'px-3 -mx-3',
		'cursor-grab data-readonly:cursor-default data-disabled:cursor-not-allowed',
		'touch-none select-none',
		'text-zinc-400 not-data-disabled:not-data-readonly:hover:text-zinc-700',
		'dark:text-zinc-500 dark:not-data-disabled:not-data-readonly:hover:text-zinc-200',
		hannou.disabled,
	],
	content: 'flex flex-col flex-1 min-w-0',
	label: 'min-w-0 truncate',
	description: ['min-w-0 truncate', ji.sm, iro.text.muted],
}
