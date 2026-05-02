import { iro } from '../ryu/iro'
import { ji } from '../ryu/ji'
import { omote } from '../ryu/omote'
import { sawari } from '../ryu/sawari'
import { sen } from '../ryu/sen'

export type ListVariant = 'separated' | 'outline' | 'plain' | 'solid'

const rootBase = ['flex flex-col', 'list-none m-0 p-0']

const rootVariant = {
	separated: ['gap-sm'],
	outline: [
		'overflow-hidden',
		'rounded-lg',
		...sen.border,
		'divide-y divide-zinc-950/10',
		'dark:divide-white/10',
	],
	plain: ['divide-y divide-zinc-950/10', 'dark:divide-white/10'],
	solid: ['gap-sm'],
} satisfies Record<ListVariant, unknown>

const itemBase = [
	'group/list-item',
	'flex items-center',
	'gap-sm',
	'gap-y-0',
	ji.size.md,
	iro.text.default,
	sen.focus.inset,
]

const itemVariant = {
	separated: ['p-md', 'bg-white dark:bg-zinc-900', sen.border, 'rounded-lg'],
	outline: ['p-md'],
	plain: ['px-sm', 'py-1.5'],
	solid: ['p-md', ...omote.tint, sen.border, 'rounded-lg'],
} satisfies Record<ListVariant, unknown>

export const list = {
	base: rootBase,
	root: (variant: ListVariant = 'separated') => [...rootBase, ...rootVariant[variant]],
	horizontal: 'flex-row',
	item: (variant: ListVariant = 'separated') => [...itemBase, ...itemVariant[variant]],
	itemActive: ['z-10 relative bg-white dark:bg-zinc-900', 'rounded-md'],
	itemLifted: sen.focus.lifted,
	handle: [
		'inline-flex flex-none items-center justify-center',
		'px-3 -mx-3',
		'cursor-grab touch-none select-none',
		'text-zinc-400 not-data-disabled:hover:text-zinc-700',
		'dark:text-zinc-500 dark:not-data-disabled:hover:text-zinc-200',
		sawari.disabled,
	],
	content: 'flex flex-col flex-1 min-w-0',
	label: 'min-w-0 truncate',
	description: ['min-w-0 truncate', ji.size.sm, iro.text.muted],
}
