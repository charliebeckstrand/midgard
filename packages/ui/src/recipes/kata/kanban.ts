import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen } from '../kiso'

const { cursor, disabled } = hannou
const { text } = iro
const { size, weight } = ji
const { radius } = kasane
const { flex } = narabi
const { border, focus } = sen

export const k = {
	base: ['overflow-x-auto flex gap-4 items-stretch', 'min-h-0'],
	column: {
		base: [
			flex.col,
			'min-w-0',
			'gap-2',
			'w-72 shrink-0',
			'p-4',
			...mode('bg-zinc-50', 'dark:bg-zinc-900/50'),
			border.default,
			radius.rounded.lg,
		],
		over: '',
		header: [flex.row, 'gap-2', size.md, text.default, weight.semibold],
		title: [flex.fill, 'min-w-0 truncate'],
		body: [flex.col, flex.fill, 'gap-1', 'overflow-y-auto'],
		empty: [flex.row, 'justify-center', 'min-h-16', size.sm, text.muted],
	},
	card: {
		base: [
			'group/kanban-card',
			flex.col,
			'gap-1',
			'p-2',
			...mode('bg-white', 'dark:bg-zinc-950'),
			border.default,
			size.sm,
			text.default,
			radius.rounded.md,
			'transition-shadow',
			focus.inset,
			...disabled,
			...cursor,
		],
		draggable: 'cursor-grab touch-none select-none',
		dragging: '',
		lifted: focus.lifted,
		active: 'z-10 shadow-lg relative opacity-95',
	},
} as const
