import { iro } from '../iro'
import { ji } from '../ji'
import { kumi } from '../kumi'
import { maru } from '../maru'
import { sen } from '../sen'

export const kanban = {
	base: ['overflow-x-auto flex gap-4 items-stretch', 'min-h-0'],
	column: [
		'flex flex-col min-w-0',
		kumi.gap.md,
		'w-72 shrink-0',
		'p-4',
		'bg-zinc-50 dark:bg-zinc-900/50',
		sen.border,
		maru.rounded.lg,
	],
	columnOver: '',
	columnHeader: ['flex items-center', kumi.gap.md, ji.size.md, iro.text.default, 'font-semibold'],
	columnTitle: 'flex-1 min-w-0 truncate',
	columnBody: ['flex flex-col flex-1', kumi.gap.sm, 'overflow-y-auto'],
	columnEmpty: ['flex', kumi.center, 'min-h-16', ji.size.sm, iro.text.muted],
	card: [
		'group/kanban-card',
		'flex flex-col',
		kumi.gap.sm,
		'p-2',
		'bg-white dark:bg-zinc-950',
		sen.border,
		ji.size.sm,
		iro.text.default,
		maru.rounded.md,
		'transition-shadow',
		sen.focus.inset,
		'data-disabled:opacity-75 data-disabled:cursor-not-allowed',
	],
	cardDraggable: 'cursor-grab touch-none select-none',
	cardLifted: sen.focus.lifted,
	cardActive: 'z-10 shadow-lg relative opacity-95',
	cardDragging: 'cursor-grabbing',
}
