import { kage } from '../kage'
import { ki } from '../ki'
import { maru } from '../maru'
import { sumi } from '../sumi'
export const kanban = {
	base: ['flex gap-4 items-stretch', 'min-h-0'],
	column: [
		'flex flex-col min-w-0',
		'w-72 shrink-0',
		'bg-zinc-50 dark:bg-zinc-900/50',
		kage.border,
		maru.rounded,
	],
	columnOver: 'ring-2 ring-blue-600 dark:ring-blue-500',
	columnHeader: ['flex items-center gap-2', 'px-3 pt-3 pb-2', 'text-sm/5 font-medium', sumi.text],
	columnTitle: 'flex-1 min-w-0 truncate',
	columnBody: ['flex flex-col gap-2 flex-1', 'px-3 pb-3 pt-1', 'overflow-y-auto'],
	columnEmpty: [
		'flex items-center justify-center',
		'min-h-16 px-3 py-4',
		'text-sm/5',
		sumi.textMuted,
	],
	card: [
		'group/kanban-card',
		'flex flex-col gap-1',
		'px-3 py-2',
		'text-sm/5',
		sumi.text,
		'bg-white dark:bg-zinc-950',
		kage.border,
		maru.roundedMd,
		'transition-shadow',
		ki.ring,
		'data-disabled:opacity-75 data-disabled:cursor-not-allowed',
	],
	cardDraggable: 'cursor-grab touch-none select-none',
	cardActive: 'shadow-lg ring-1 ring-zinc-300 dark:ring-zinc-700 relative z-10 opacity-95',
	cardGrabbed: 'ring-2 ring-blue-600 dark:ring-blue-500',
	cardDragging: 'cursor-grabbing',
}
