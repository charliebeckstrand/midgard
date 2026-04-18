import { kage } from '../kage'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { yasumi } from '../yasumi'

export const list = {
	base: ['flex flex-col gap-1', 'list-none m-0 p-0'],
	horizontal: 'flex-row',
	item: [
		'group/list-item',
		'flex items-center gap-2',
		'px-3 py-2',
		'text-sm/6',
		sumi.text,
		'bg-white dark:bg-zinc-900',
		kage.border,
		maru.rounded,
		'transition-shadow',
	],
	itemActive: 'shadow-lg ring-1 ring-zinc-300 dark:ring-zinc-700 relative z-10',
	itemGrabbed: 'ring-2 ring-blue-600 dark:ring-blue-500',
	handle: [
		'inline-flex flex-none',
		kumi.center,
		'size-6 -m-1',
		'cursor-grab touch-none select-none',
		'text-zinc-400 not-disabled:hover:text-zinc-700',
		'dark:text-zinc-500 dark:not-disabled:hover:text-zinc-200',
		maru.rounded,
		ki.ring,
		'active:cursor-grabbing',
		yasumi.disabled,
	],
	label: 'flex-1 min-w-0 truncate',
}
