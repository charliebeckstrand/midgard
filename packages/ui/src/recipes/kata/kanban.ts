import { mode } from '../../core/recipe'
import { hannou, iro, ji, kasane, narabi, sen } from '../kiso'

export const k = {
	base: ['overflow-x-auto flex gap-4 items-stretch', 'min-h-0'],
	column: {
		base: [
			narabi.col,
			'min-w-0',
			'gap-2',
			'w-72 shrink-0',
			'p-4',
			...mode('bg-zinc-50', 'dark:bg-zinc-900/50'),
			sen.border.default,
			kasane.radius.rounded.lg,
		],
		over: '',
		header: [narabi.row, 'gap-2', ji.size.md, iro.text.default, ji.weight.semibold],
		title: [narabi.fill, 'min-w-0 truncate'],
		body: [narabi.col, narabi.fill, 'gap-1', 'overflow-y-auto'],
		empty: [narabi.row, 'justify-center', 'min-h-16', ji.size.sm, iro.text.muted],
	},
	card: {
		base: [
			'group/kanban-card',
			narabi.col,
			'gap-1',
			'p-2',
			...mode('bg-white', 'dark:bg-zinc-950'),
			sen.border.default,
			ji.size.sm,
			iro.text.default,
			kasane.radius.rounded.md,
			'transition-shadow',
			sen.focus.inset,
			...hannou.disabled,
			...hannou.cursor,
		],
		draggable: 'cursor-grab touch-none select-none',
		dragging: '',
		lifted: sen.focus.lifted,
		active: 'z-10 shadow-lg relative opacity-95',
	},
} as const
