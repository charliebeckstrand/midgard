import { kage } from '../kage'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'
import { yasumi } from '../yasumi'

export const list = {
	base: ['flex flex-col', take.gap.sm, 'list-none m-0 p-0'],
	horizontal: 'flex-row',
	item: [
		'group/list-item',
		'flex items-center',
		take.gap.md,
		'gap-y-0',
		'p-3',
		take.text.md,
		sumi.text,
		'bg-white dark:bg-zinc-900',
		kage.border,
		maru.rounded,
		ki.inset,
		'transition-shadow',
	],
	itemActive: 'z-10 shadow-lg relative bg-white dark:bg-zinc-900 rounded-md',
	itemLifted: ki.lifted,
	handle: [
		'inline-flex flex-none',
		kumi.center,
		'p-2 -m-2',
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
