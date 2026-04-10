import { nuri } from '../nuri'
import { sumi } from '../sumi'

export const calendar = {
	root: 'inline-flex flex-col p-3 select-none',
	header: 'flex items-center justify-between mb-2',
	picker: {
		grid: 'grid grid-cols-3 gap-1 p-2',
		cellCurrent: ['font-semibold', ...nuri.buttonSoft.blue],
	},
	navIcon: 'size-4.5',
	grid: 'grid grid-cols-7',
	weekday: [sumi.textMuted, 'flex items-center justify-center size-9 text-xs font-medium'],
	day: {
		hover: 'hover:bg-zinc-950/5 dark:hover:bg-white/5',
		active: 'ring-2 ring-inset ring-blue-600',
		today: ['font-semibold', ...nuri.buttonSoft.blue],
		disabled: 'opacity-40 cursor-not-allowed',
		outside: 'opacity-0 pointer-events-none',
		inRange: 'bg-zinc-950/5 dark:bg-white/5 rounded-none',
	},
}
