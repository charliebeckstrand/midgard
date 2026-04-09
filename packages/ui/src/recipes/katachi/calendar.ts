import { maru } from '../maru'
import { nuri } from '../nuri'
import { sumi } from '../sumi'

export const calendar = {
	root: 'inline-flex flex-col p-3 select-none',
	header: 'flex items-center justify-between mb-2',
	title: [sumi.text, 'text-sm font-semibold'],
	nav: [
		sumi.textMuted,
		maru.rounded,
		'inline-flex items-center justify-center size-8 cursor-default',
		'hover:bg-zinc-950/5 dark:hover:bg-white/5',
		'outline-none focus-visible:ring-2 focus-visible:ring-blue-600',
	],
	navIcon: 'size-4',
	grid: 'grid grid-cols-7',
	weekday: [sumi.textMuted, 'flex items-center justify-center size-9 text-xs font-medium'],
	day: {
		base: [
			sumi.text,
			maru.rounded,
			'flex items-center justify-center size-9 text-sm cursor-default',
			'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600',
		],
		hover: 'hover:bg-zinc-950/5 dark:hover:bg-white/5',
		active: 'ring-2 ring-inset ring-blue-600',
		today: ['font-semibold', ...nuri.buttonSoft.blue],
		selected: 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950',
		disabled: 'opacity-40 pointer-events-none',
		outside: 'opacity-0 pointer-events-none',
		inRange: 'bg-zinc-950/5 dark:bg-white/5 rounded-none',
		rangeEdge: 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950',
	},
}
