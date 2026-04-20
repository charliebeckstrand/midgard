import { kage } from '../kage'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'

export const columnManager = {
	root: ['flex flex-col', take.gap.md],
	list: 'flex flex-col',
	item: [
		'group flex items-center',
		take.gap.sm,
		'px-2 py-1.5',
		maru.rounded,
		'data-dragging:opacity-60',
		'data-pinned:opacity-75',
	],
	handle: [
		'inline-flex items-center justify-center shrink-0',
		'size-6',
		maru.rounded,
		sumi.textMuted,
		'cursor-grab active:cursor-grabbing',
		'group-data-pinned:cursor-default',
		'touch-none select-none',
		'focus-visible:outline-2 focus-visible:outline-blue-600',
		'disabled:cursor-not-allowed disabled:opacity-50',
	],
	handleIcon: 'size-4',
	title: ['flex-1 min-w-0 truncate', take.text.sm, ...sumi.text],
	footer: [
		'flex items-center justify-end',
		take.gap.sm,
		'pt-2',
		'border-t',
		...kage.borderSubtleColor,
	],
}
