import { iro } from '../iro'
import { ji } from '../ji'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { omote } from '../omote'
import { sen } from '../sen'
import { yasumi } from '../yasumi'

export type ListVariant = 'outline' | 'solid' | 'plain'

const itemBase = [
	'group/list-item',
	'flex items-center',
	kumi.gap.md,
	'gap-y-0',
	ji.size.md,
	iro.text.default,
	ki.inset,
	maru.rounded,
	'transition-shadow',
]

const itemVariant = {
	outline: ['p-3', 'bg-white dark:bg-zinc-900', sen.border],
	solid: ['p-3', ...omote.tint, sen.border],
	plain: ['px-2 py-1.5'],
} satisfies Record<ListVariant, unknown>

export const list = {
	base: ['flex flex-col', kumi.gap.md, 'list-none m-0 p-0'],
	horizontal: 'flex-row',
	item: (variant: ListVariant = 'outline') => [...itemBase, ...itemVariant[variant]],
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
