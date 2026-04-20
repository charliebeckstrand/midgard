import { kage } from '../kage'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'
import { yasumi } from '../yasumi'

export type ListVariant = 'outline' | 'plain'

const itemBase = [
	'group/list-item',
	'flex items-center',
	take.gap.md,
	'gap-y-0',
	take.text.md,
	sumi.text,
	ki.inset,
	maru.rounded,
	'transition-shadow',
]

const itemVariant = {
	outline: ['p-3', 'bg-white dark:bg-zinc-900', kage.border],
	plain: ['px-2 py-1.5'],
} satisfies Record<ListVariant, unknown>

export const list = {
	base: ['flex flex-col', take.gap.sm, 'list-none m-0 p-0'],
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
	description: ['min-w-0 truncate', take.text.sm, sumi.textMuted],
}
