import { iro } from '../iro'
import { ji } from '../ji'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { omote } from '../omote'
import { sen } from '../sen'
import { yasumi } from '../yasumi'

export type ListVariant = 'separated' | 'outline' | 'plain' | 'solid'

const rootBase = ['flex flex-col', 'list-none m-0 p-0']

const rootVariant = {
	separated: [kumi.gap.md],
	outline: [
		'overflow-hidden',
		maru.rounded.lg,
		...sen.border,
		'divide-y divide-zinc-950/10',
		'dark:divide-white/10',
	],
	plain: ['divide-y divide-zinc-950/10', 'dark:divide-white/10'],
	solid: [kumi.gap.md],
} satisfies Record<ListVariant, unknown>

const itemBase = [
	'group/list-item',
	'flex items-center',
	kumi.gap.md,
	'gap-y-0',
	ji.size.md,
	iro.text.default,
	ki.inset,
	'transition-shadow',
]

const itemVariant = {
	separated: ['p-3', 'bg-white dark:bg-zinc-900', sen.border, maru.rounded.lg],
	outline: ['p-3'],
	plain: ['px-2 py-1.5'],
	solid: ['p-3', ...omote.tint, sen.border, maru.rounded.lg],
} satisfies Record<ListVariant, unknown>

export const list = {
	base: rootBase,
	root: (variant: ListVariant = 'separated') => [...rootBase, ...rootVariant[variant]],
	horizontal: 'flex-row',
	item: (variant: ListVariant = 'separated') => [...itemBase, ...itemVariant[variant]],
	itemActive: 'z-10 relative bg-white dark:bg-zinc-900 rounded-md',
	itemLifted: ki.lifted,
	handle: [
		'inline-flex flex-none',
		kumi.center,
		'px-3 -mx-3',
		'cursor-grab touch-none select-none',
		'text-zinc-400 not-data-disabled:hover:text-zinc-700',
		'dark:text-zinc-500 dark:not-data-disabled:hover:text-zinc-200',
		'active:cursor-grabbing',
		yasumi.disabled,
	],
	content: 'flex flex-col flex-1 min-w-0',
	label: 'min-w-0 truncate',
	description: ['min-w-0 truncate', ji.size.sm, iro.text.muted],
}
