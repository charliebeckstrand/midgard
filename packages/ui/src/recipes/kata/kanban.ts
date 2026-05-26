import { hannou, iro, ji, sen } from '../kiso'

export const k = {
	base: ['overflow-x-auto flex gap-4 items-stretch', 'min-h-0'],
	column: {
		base: [
			'flex flex-col min-w-0',
			'gap-2',
			'w-72 shrink-0',
			'p-4',
			'bg-zinc-50 dark:bg-zinc-900/50',
			sen.border,
			'rounded-lg',
		],
		over: '',
		header: ['flex items-center', 'gap-2', ji.md, iro.text.default, 'font-semibold'],
		title: 'flex-1 min-w-0 truncate',
		body: ['flex flex-col flex-1', 'gap-1', 'overflow-y-auto'],
		empty: ['flex items-center justify-center', 'min-h-16', ji.sm, iro.text.muted],
	},
	card: {
		base: [
			'group/kanban-card',
			'flex flex-col',
			'gap-1',
			'p-2',
			'bg-white dark:bg-zinc-950',
			sen.border,
			ji.sm,
			iro.text.default,
			'rounded-md',
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
}
