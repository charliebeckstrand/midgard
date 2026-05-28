import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, omote, sen } from '../kiso'

export type ListVariant = 'separated' | 'outline' | 'plain' | 'solid'

const rootBase = [narabi.flex.col, 'm-0 p-0', 'k-none']

const rootVariant = {
	separated: ['gap-2'],
	outline: [
		'overflow-hidden',
		kasane.radius.rounded.lg,
		...sen.border.default,
		...sen.divider.between,
	],
	plain: sen.divider.between,
	solid: ['gap-2'],
} satisfies Record<ListVariant, unknown>

const itemBase = [
	'group/k-item',
	narabi.flex.row,
	'gap-2',
	'gap-y-0',
	ji.size.md,
	iro.text.default,
	sen.focus.inset,
]

const itemVariant = {
	separated: ['p-3', ...omote.bg.surface, sen.border.default, kasane.radius.rounded.lg],
	outline: ['p-3'],
	plain: ['px-2', 'py-1.5'],
	solid: ['p-3', ...omote.bg.tint, sen.border.default, kasane.radius.rounded.lg],
} satisfies Record<ListVariant, unknown>

export const k = {
	base: rootBase,
	root: (variant: ListVariant = 'separated') => [...rootBase, ...rootVariant[variant]],
	horizontal: 'flex-row',
	item: (variant: ListVariant = 'separated') => [...itemBase, ...itemVariant[variant]],
	itemActive: ['z-10 relative', ...omote.bg.surface, kasane.radius.rounded.md],
	itemLifted: sen.focus.lifted,
	handle: [
		narabi.flex.inline,
		'flex-none justify-center',
		'px-3 -mx-3',
		'cursor-grab data-readonly:cursor-default data-disabled:cursor-not-allowed',
		'touch-none select-none',
		...mode(
			'text-zinc-400 not-data-disabled:not-data-readonly:hover:text-zinc-700',
			'dark:text-zinc-500 dark:not-data-disabled:not-data-readonly:hover:text-zinc-200',
		),
		hannou.disabled,
	],
	content: 'flex flex-col flex-1 min-w-0',
	label: 'min-w-0 truncate',
	description: ['min-w-0 truncate', ji.size.sm, iro.text.muted],
} as const
