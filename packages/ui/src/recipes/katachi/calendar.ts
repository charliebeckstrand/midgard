import { narabi } from '../narabi'
import { nuri } from '../nuri'
import { sumi } from '../sumi'

export const calendar = {
	root: 'inline-flex flex-col min-w-72 p-3 [&:not(:has(+[data-slot=calendar-footer]))]:pb-4 select-none',
	grid: 'grid grid-cols-7',
	header: 'flex items-center justify-between mb-2',
	footer: [narabi.position.center, 'gap-2 px-3 pb-3'],
	nav: {
		icon: 'size-4.5',
	},
	picker: {
		grid: 'grid grid-cols-3 gap-1 p-2',
		cellCurrent: ['font-semibold', ...nuri.buttonSoft.blue],
	},
	weekday: [narabi.position.center, 'size-9 text-xs font-medium', sumi.textMuted],
	day: {
		base: 'size-9 p-0',
		active: 'ring-2 ring-inset ring-blue-600',
		activeSelected: 'bg-blue-500',
		rangeLeftEdge: 'rounded-r-none',
		rangeRightEdge: 'rounded-l-none',
	},
}
