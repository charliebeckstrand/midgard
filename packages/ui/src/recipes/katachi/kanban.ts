import { kage } from '../kage'
import { ki } from '../ki'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sumi } from '../sumi'
import { take } from '../take'

export const kanban = {
	base: ['overflow-x-auto flex gap-4 items-stretch', 'min-h-0'],
	column: [
		'flex flex-col min-w-0',
		take.gap.md,
		'w-72 shrink-0',
		'p-4',
		'bg-zinc-50 dark:bg-zinc-900/50',
		kage.border,
		maru.rounded,
	],
	columnOver: '',
	columnHeader: ['flex items-center', take.gap.md, take.text.md, sumi.text, 'font-semibold'],
	columnTitle: 'flex-1 min-w-0 truncate',
	columnBody: ['flex flex-col flex-1', take.gap.sm, 'overflow-y-auto'],
	columnEmpty: ['flex', kumi.center, 'min-h-16', take.text.sm, sumi.textMuted],
	card: [
		'group/kanban-card',
		'flex flex-col',
		take.gap.sm,
		'p-2',
		'bg-white dark:bg-zinc-950',
		kage.border,
		take.text.sm,
		sumi.text,
		maru.roundedMd,
		'transition-shadow',
		ki.inset,
		'data-disabled:opacity-75 data-disabled:cursor-not-allowed',
	],
	cardDraggable: 'cursor-grab touch-none select-none',
	cardLifted: ki.lifted,
	cardActive: 'z-10 shadow-lg relative opacity-95',
	cardDragging: 'cursor-grabbing',
}
