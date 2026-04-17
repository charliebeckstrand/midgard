import { kumi } from '../kumi'
import { nuri } from '../nuri'
import { sumi } from '../sumi'

export const calendar = {
	base: 'inline-flex flex-col w-72 p-4 select-none',
	grid: 'grid grid-cols-7',
	header: 'flex items-center justify-between mb-2',
	footer: ['gap-2 pb-4', kumi.center.block],
	nav: {
		icon: 'size-4.5',
	},
	picker: {
		grid: 'grid grid-cols-3 gap-1 p-2',
		cellCurrent: ['font-semibold', ...nuri.buttonSoft.blue],
	},
	weekday: ['w-full aspect-square', 'text-xs font-medium', kumi.center.block, sumi.textMuted],
	day: {
		base: 'w-full aspect-square p-0 ring-inset',
		active: 'ring-2 ring-inset ring-blue-600',
		activeSelected: 'bg-blue-600',
		rangeLeftEdge: 'rounded-r-none',
		rangeRightEdge: 'rounded-l-none',
	},
}
